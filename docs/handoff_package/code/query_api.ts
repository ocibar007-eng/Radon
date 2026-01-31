/**
 * Recommendations Query API
 * 
 * Structured query interface for the Radon pipeline.
 * Returns typed data to prevent LLM hallucination.
 * 
 * REGRA-MÃE: "Recomendação só entra se for recuperada + aplicável"
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database path
const DB_PATH = path.resolve(process.cwd(), 'data/recommendations/db/recommendations.db');

// ============================================================================
// TYPE DEFINITIONS (Structured Output)
// ============================================================================

export interface QueryParams {
    finding_type: string;           // ex: "pulmonary_nodule", "hepatic_lesion"
    morphology?: string;            // ex: "solid", "subsolid", "cystic"
    size_mm?: number;               // maior diâmetro em mm
    count?: "single" | "multiple";  // único ou múltiplo
    patient_age?: number;
    risk_category?: "low" | "high" | "unknown";
    context?: "incidental" | "symptomatic" | "oncologic";
    constraints?: string[];         // ex: ["adult", "non-immunosuppressed"]
}

export interface ApplicabilityCriteria {
    age_group: "adult" | "pediatric" | "any";
    immunosuppressed_excluded: boolean;
    oncologic_context_required: boolean;
    minimum_size_mm?: number;
    maximum_size_mm?: number;
    morphology_required?: string[];
}

export interface NumericalRule {
    parameter: string;      // ex: "size", "followup_months"
    operator: string;       // ex: ">", "<", ">=", "range"
    value: number | [number, number];
    unit: string;
}

export interface RecommendationResult {
    guideline_id: string;
    source_id: string;
    finding_type: string;
    applicability: ApplicabilityCriteria;
    inputs_required: string[];
    recommendation_text: string;
    numerical_rules: NumericalRule[];
    citation: string;
    evidence_grade?: string;
    version_date: string;
    confidence: number;
    match_score: number;
}

export interface QueryResponse {
    success: boolean;
    query: QueryParams;
    results: RecommendationResult[];
    warnings: string[];
    missing_inputs: string[];
}

// ============================================================================
// FINDING TYPE MAPPINGS (Taxonomia)
// ============================================================================

const FINDING_TYPE_KEYWORDS: Record<string, string[]> = {
    "pulmonary_nodule": ["nódulo pulmonar", "pulmonary nodule", "lung nodule", "fleischner"],
    "pulmonary_nodule_solid": ["nódulo sólido", "solid nodule"],
    "pulmonary_nodule_subsolid": ["nódulo subsólido", "ground-glass", "subsolid", "vidro fosco"],
    "hepatic_lesion": ["lesão hepática", "hepatic lesion", "liver lesion", "li-rads"],
    "renal_cyst": ["cisto renal", "renal cyst", "bosniak"],
    "prostate_lesion": ["lesão prostática", "prostate lesion", "pi-rads"],
    "adnexal_mass": ["massa anexial", "adnexal mass", "ovarian", "o-rads"],
    "thyroid_nodule": ["nódulo tireoide", "thyroid nodule", "ti-rads"],
    "adrenal_mass": ["massa adrenal", "adrenal mass", "incidentaloma"],
};

// ============================================================================
// QUERY IMPLEMENTATION
// ============================================================================

export function queryRecommendations(params: QueryParams): QueryResponse {
    const db = new Database(DB_PATH, { readonly: true });

    const warnings: string[] = [];
    const missing_inputs: string[] = [];

    // Validate required inputs
    if (!params.finding_type) {
        return {
            success: false,
            query: params,
            results: [],
            warnings: ["finding_type is required"],
            missing_inputs: ["finding_type"]
        };
    }

    // Build search terms from finding_type
    const keywords = FINDING_TYPE_KEYWORDS[params.finding_type] || [params.finding_type];

    // Query recommendations table
    const query = `
    SELECT 
      r.rec_id,
      r.source_id,
      r.rec_type,
      r.achado,
      r.condicao_if,
      r.acao_then,
      r.followup_interval,
      r.verbatim_quote,
      r.snippet_suporte,
      r.confidence,
      d.title,
      d.authors,
      d.journal,
      d.publication_year,
      d.citation_formatted
    FROM recommendations r
    LEFT JOIN documents d ON r.doc_id = d.doc_id
    WHERE (
      ${keywords.map((_, i) => `r.achado LIKE ?`).join(' OR ')}
      OR ${keywords.map((_, i) => `r.condicao_if LIKE ?`).join(' OR ')}
    )
    ORDER BY r.confidence DESC
    LIMIT 10
  `;

    const searchTerms = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);

    let rawResults: any[] = [];
    try {
        rawResults = db.prepare(query).all(...searchTerms);
    } catch (e) {
        console.error("Query error:", e);
    }

    // Also query extracted tables for numerical rules
    const tablesQuery = `
    SELECT table_id, source_id, title, headers, rows
    FROM extracted_tables
    WHERE ${keywords.map(() => `title LIKE ?`).join(' OR ')}
    LIMIT 5
  `;

    let tableResults: any[] = [];
    try {
        tableResults = db.prepare(tablesQuery).all(...keywords.map(k => `%${k}%`));
    } catch (e) {
        // Tables are optional
    }

    // Query numeric cutoffs
    const cutoffsQuery = `
    SELECT parameter, operator, value, unit, context
    FROM numeric_cutoffs
    WHERE ${keywords.map(() => `context LIKE ?`).join(' OR ')}
    LIMIT 10
  `;

    let cutoffResults: any[] = [];
    try {
        cutoffResults = db.prepare(cutoffsQuery).all(...keywords.map(k => `%${k}%`));
    } catch (e) {
        // Cutoffs are optional
    }

    db.close();

    // Transform to structured output
    const results: RecommendationResult[] = rawResults.map((row, idx) => {
        // Extract numerical rules from cutoffs that match this source
        const matchingCutoffs = cutoffResults.filter(c =>
            row.source_id && c.context?.includes(row.source_id)
        );

        const numericalRules: NumericalRule[] = matchingCutoffs.map(c => ({
            parameter: c.parameter,
            operator: c.operator,
            value: c.value,
            unit: c.unit
        }));

        // Infer applicability from context (simplified)
        const applicability: ApplicabilityCriteria = {
            age_group: "adult", // Default, should be extracted from content
            immunosuppressed_excluded: row.condicao_if?.toLowerCase().includes("immunocompetent") ||
                row.snippet_suporte?.toLowerCase().includes("non-immunosuppressed"),
            oncologic_context_required: row.condicao_if?.toLowerCase().includes("oncologic") ||
                row.condicao_if?.toLowerCase().includes("cancer")
        };

        // Build citation
        const citation = row.citation_formatted ||
            `${row.authors || 'Authors'}. ${row.title || 'Title'}. ${row.journal || 'Journal'}. ${row.publication_year || 'Year'}.`;

        return {
            guideline_id: row.source_id?.toUpperCase().replace(/[-_]/g, '_') || `REC_${idx}`,
            source_id: row.source_id || '',
            finding_type: params.finding_type,
            applicability,
            inputs_required: extractInputsRequired(row.condicao_if),
            recommendation_text: row.acao_then || row.verbatim_quote || '',
            numerical_rules: numericalRules,
            citation,
            evidence_grade: undefined, // Would need to extract from content
            version_date: row.publication_year?.toString() || 'Unknown',
            confidence: row.confidence || 0.8,
            match_score: calculateMatchScore(params, row)
        };
    });

    // Check for missing inputs based on results
    if (results.length > 0) {
        const allInputsRequired = new Set(results.flatMap(r => r.inputs_required));

        if (allInputsRequired.has("size_mm") && params.size_mm === undefined) {
            missing_inputs.push("size_mm");
            warnings.push("Tamanho (size_mm) necessário para aplicar recomendação");
        }
        if (allInputsRequired.has("risk_category") && params.risk_category === undefined) {
            missing_inputs.push("risk_category");
            warnings.push("Categoria de risco necessária para selecionar intervalo correto");
        }
    }

    return {
        success: results.length > 0,
        query: params,
        results: results.sort((a, b) => b.match_score - a.match_score),
        warnings,
        missing_inputs
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractInputsRequired(conditionText: string | null): string[] {
    if (!conditionText) return [];

    const inputs: string[] = [];
    const lower = conditionText.toLowerCase();

    if (lower.includes("size") || lower.includes("mm") || lower.includes("cm") || lower.includes("diameter")) {
        inputs.push("size_mm");
    }
    if (lower.includes("risk") || lower.includes("risco") || lower.includes("smoking") || lower.includes("tabagismo")) {
        inputs.push("risk_category");
    }
    if (lower.includes("single") || lower.includes("multiple") || lower.includes("único") || lower.includes("múltiplo")) {
        inputs.push("count");
    }
    if (lower.includes("age") || lower.includes("idade") || lower.includes("adult") || lower.includes("pediatric")) {
        inputs.push("patient_age");
    }
    if (lower.includes("immunosuppressed") || lower.includes("imunossuprimido")) {
        inputs.push("immunosuppression_status");
    }

    return inputs;
}

function calculateMatchScore(params: QueryParams, row: any): number {
    let score = 0.5; // Base score

    // Boost for exact finding type match
    if (row.achado?.toLowerCase().includes(params.finding_type.replace(/_/g, ' '))) {
        score += 0.2;
    }

    // Boost for morphology match
    if (params.morphology && row.condicao_if?.toLowerCase().includes(params.morphology)) {
        score += 0.15;
    }

    // Boost for confidence
    score += (row.confidence || 0.5) * 0.15;

    return Math.min(score, 1.0);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Query specifically for pulmonary nodule recommendations
 */
export function queryPulmonaryNodule(
    size_mm: number,
    morphology: "solid" | "subsolid" | "ground-glass",
    count: "single" | "multiple",
    risk: "low" | "high" | "unknown"
): QueryResponse {
    return queryRecommendations({
        finding_type: morphology === "solid" ? "pulmonary_nodule_solid" : "pulmonary_nodule_subsolid",
        morphology,
        size_mm,
        count,
        risk_category: risk,
        context: "incidental",
        constraints: ["adult", "non-immunosuppressed"]
    });
}

/**
 * Query for hepatic lesion (LI-RADS) recommendations
 */
export function queryHepaticLesion(
    size_mm: number,
    liRadsCategory?: string
): QueryResponse {
    return queryRecommendations({
        finding_type: "hepatic_lesion",
        size_mm,
        context: "incidental"
    });
}

/**
 * Query for renal cyst (Bosniak) recommendations
 */
export function queryRenalCyst(
    bosniakCategory: string
): QueryResponse {
    return queryRecommendations({
        finding_type: "renal_cyst"
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    queryRecommendations,
    queryPulmonaryNodule,
    queryHepaticLesion,
    queryRenalCyst
};

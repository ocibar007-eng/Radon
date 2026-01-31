/**
 * Recommendations Agent
 * 
 * Consulta a biblioteca de recomendações para cada achado relevante.
 * Segue estritamente as regras anti-alucinação.
 * 
 * Posição no Pipeline: Após Compute, antes de Impression
 * 
 * REGRA-MÃE: "Recomendação só entra se for recuperada + aplicável"
 */

import { queryRecommendations, QueryParams, QueryResponse, RecommendationResult } from '../../../../services/recommendations/query_api';
import { recordQuery } from '../recommendations-observability';

// ============================================================================
// TYPES (seguindo spec da IA Gerente)
// ============================================================================

export interface Finding {
    label: string;              // ex: "nódulo pulmonar"
    location?: string;
    size_mm?: number;
    morphology?: string;        // solid/subsolid/cystic
    count?: "single" | "multiple";
    context?: {
        incidental?: boolean;
        oncologic?: boolean;
        symptomatic?: boolean;
    };
    patient?: {
        age?: number;
        risk_category?: "low" | "high" | "unknown";
        immunosuppressed?: boolean;
    };
}

export interface RecommendationEntry {
    finding_type: string;
    text: string;                   // texto EXATO da biblioteca (ou condicional)
    applicability?: string;         // string humana ("Adulto, incidental, ...")
    conditional: boolean;           // true se missing_inputs > 0
    source_id?: string;
    guideline_id?: string;
    reference_key?: string;         // chave para deduplicar referências
}

export interface ReferenceEntry {
    key: string;                    // ex: "FLEISCHNER_2017"
    citation: string;               // cópia exata do campo `citation` da API
}

export interface ReportJSON {
    // Campos existentes do Radon (placeholder - ajustar conforme real)
    findings?: any[];
    findings_by_organ?: Record<string, any>;
    compute_results?: any;

    // Novos campos adicionados por este Agent
    recommendations?: RecommendationEntry[];
    references?: ReferenceEntry[];
}

export interface AgentContext {
    patient_age?: number;
    risk_category?: "low" | "high" | "unknown";
    immunosuppressed?: boolean;
    oncologic_context?: boolean;
}

// ============================================================================
// FINDING TYPE DETECTION
// ============================================================================

const FINDING_PATTERNS: Record<string, RegExp[]> = {
    "pulmonary_nodule": [
        /nódulo\s+pulmonar/i,
        /pulmonary\s+nodule/i,
        /lung\s+nodule/i,
        /nódulo\s+(sólido|subsólido)/i
    ],
    "hepatic_lesion": [
        /lesão\s+hepática/i,
        /hepatic\s+lesion/i,
        /liver\s+lesion/i,
        /li-rads/i,
        /nódulo\s+hepático/i
    ],
    "renal_cyst": [
        /cisto\s+renal/i,
        /renal\s+cyst/i,
        /bosniak/i
    ],
    "prostate_lesion": [
        /lesão\s+prostática/i,
        /prostate\s+lesion/i,
        /pi-rads/i
    ],
    "adnexal_mass": [
        /massa\s+anexial/i,
        /adnexal\s+mass/i,
        /o-rads/i,
        /cisto\s+ovariano/i
    ],
    "thyroid_nodule": [
        /nódulo\s+tireoide/i,
        /thyroid\s+nodule/i,
        /ti-rads/i
    ]
};

function detectFindingType(label: string): string | null {
    const normalized = label.toLowerCase();

    for (const [findingType, patterns] of Object.entries(FINDING_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(normalized)) {
                return findingType;
            }
        }
    }

    return null;
}

function detectMorphology(label: string): string | undefined {
    const lower = label.toLowerCase();
    if (lower.includes("sólido") || lower.includes("solid")) return "solid";
    if (lower.includes("subsólido") || lower.includes("subsolid") || lower.includes("vidro fosco") || lower.includes("ground-glass")) return "subsolid";
    if (lower.includes("cístico") || lower.includes("cystic")) return "cystic";
    return undefined;
}

// ============================================================================
// MAIN AGENT FUNCTION
// ============================================================================

export async function runRecommendationsAgent(
    ctx: AgentContext,
    report: ReportJSON
): Promise<ReportJSON> {

    console.log("🔍 [RecommendationsAgent] Starting...");

    const recommendations: RecommendationEntry[] = [];
    const referencesMap = new Map<string, ReferenceEntry>();
    const libraryPayloadsMap = new Map<string, any>(); // For Guard validation

    // Extract findings from report (adapter para diferentes formatos)
    const findings = extractFindings(report, ctx);

    console.log(`   Found ${findings.length} findings to process`);

    for (const finding of findings) {
        const findingType = detectFindingType(finding.label);

        if (!findingType) {
            console.log(`   ⏭️ Skipping "${finding.label}" - no matching finding type`);
            continue;
        }

        console.log(`   🔎 Processing "${finding.label}" as ${findingType}`);

        // Build query params
        const params: QueryParams = {
            finding_type: findingType,
            morphology: finding.morphology || detectMorphology(finding.label),
            size_mm: finding.size_mm,
            count: finding.count,
            patient_age: finding.patient?.age || ctx.patient_age,
            risk_category: finding.patient?.risk_category || ctx.risk_category || "unknown",
            context: finding.context?.incidental ? "incidental" :
                finding.context?.oncologic ? "oncologic" :
                    finding.context?.symptomatic ? "symptomatic" : "incidental",
            constraints: buildConstraints(finding, ctx)
        };

        // Query library
        const result = queryRecommendations(params);

        // ** PAYLOAD TRACKING FOR GUARD **
        // Store the raw library payload for number verification
        if (result.success && result.results.length > 0) {
            const topResult = result.results[0];
            if (topResult.guideline_id) {
                libraryPayloadsMap.set(topResult.guideline_id, {
                    recommendation_text: topResult.recommendation_text,
                    full_result: topResult,
                    // Include all numeric data from the result
                    extracted_at: new Date().toISOString()
                });
            }
        }

        // Process result following anti-hallucination rules
        const entry = processQueryResult(result, finding, params);

        recordQuery({
            finding_type: params.finding_type,
            success: !!entry && !entry.conditional,
            missing_inputs: result.missing_inputs || [],
            guard_sanitized: false
        });

        if (entry) {
            recommendations.push(entry);

            // Add reference if we have a valid recommendation
            if (entry.reference_key && result.results.length > 0) {
                const topResult = result.results[0];
                if (!referencesMap.has(entry.reference_key)) {
                    referencesMap.set(entry.reference_key, {
                        key: entry.reference_key,
                        citation: topResult.citation
                    });
                }
            }
        }
    }

    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
    console.log(`   📚 References: ${referencesMap.size}`);
    console.log(`   🗂️  Payloads tracked: ${libraryPayloadsMap.size}`);

    // Return enriched report WITH payload map for Guard
    return {
        ...report,
        recommendations,
        references: Array.from(referencesMap.values()),
        // Internal: payload map for Guard validation (not rendered)
        _libraryPayloads: libraryPayloadsMap
    } as ReportJSON & { _libraryPayloads: Map<string, any> };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractFindings(report: ReportJSON, ctx: AgentContext): Finding[] {
    const findings: Finding[] = [];

    // Try different possible structures
    if (Array.isArray(report.findings)) {
        for (const f of report.findings) {
            findings.push(normalizeFinding(f, ctx));
        }
    }

    if (report.findings_by_organ) {
        for (const [organ, organFindings] of Object.entries(report.findings_by_organ)) {
            if (Array.isArray(organFindings)) {
                for (const f of organFindings) {
                    findings.push(normalizeFinding({ ...f, location: organ }, ctx));
                }
            }
        }
    }

    return findings;
}

function normalizeFinding(raw: any, ctx: AgentContext): Finding {
    return {
        label: raw.label || raw.description || raw.text || String(raw),
        location: raw.location || raw.organ,
        size_mm: raw.size_mm || raw.size || extractSizeMm(raw.label || raw.description),
        morphology: raw.morphology || detectMorphology(raw.label || raw.description || ""),
        count: raw.count || (raw.multiple ? "multiple" : "single"),
        context: {
            incidental: raw.incidental ?? true,
            oncologic: raw.oncologic ?? ctx.oncologic_context ?? false,
            symptomatic: raw.symptomatic ?? false
        },
        patient: {
            age: raw.patient_age || ctx.patient_age,
            risk_category: raw.risk_category || ctx.risk_category,
            immunosuppressed: raw.immunosuppressed ?? ctx.immunosuppressed ?? false
        }
    };
}

function extractSizeMm(text: string | undefined): number | undefined {
    if (!text) return undefined;

    // Try to extract size in mm
    const mmMatch = text.match(/(\d+(?:\.\d+)?)\s*mm/i);
    if (mmMatch) return parseFloat(mmMatch[1]);

    // Try cm and convert
    const cmMatch = text.match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (cmMatch) return parseFloat(cmMatch[1]) * 10;

    return undefined;
}

function buildConstraints(finding: Finding, ctx: AgentContext): string[] {
    const constraints: string[] = [];

    // Age constraint
    const age = finding.patient?.age || ctx.patient_age;
    if (age && age >= 18) {
        constraints.push("adult");
    } else if (age && age < 18) {
        constraints.push("pediatric");
    }

    // Immunosuppression
    if (finding.patient?.immunosuppressed === false || ctx.immunosuppressed === false) {
        constraints.push("non-immunosuppressed");
    }

    return constraints;
}

function processQueryResult(
    result: QueryResponse,
    finding: Finding,
    params: QueryParams
): RecommendationEntry | null {

    // REGRA 1: Sem retorno → texto genérico SEM números
    if (!result.success || result.results.length === 0) {
        console.log(`      ⚠️ No recommendation found, using generic text`);
        return {
            finding_type: params.finding_type,
            text: "Considerar correlação clínica e seguimento conforme diretrizes institucionais.",
            conditional: false,
            // Sem reference_key = sem citação
        };
    }

    // ITERATE CANDIDATES TO FIND BEST MATCH
    let bestMatch: RecommendationResult | null = null;
    let fallbackMatch: RecommendationResult | null = null;

    for (const candidate of result.results) {
        // Check strict applicability (including size bracket)
        if (checkApplicability(candidate, finding, params)) {
            bestMatch = candidate;
            break; // Found one that fits!
        }

        // Keep first one as fallback if applicability check wasn't fatal (optional refinement)
        if (!fallbackMatch) fallbackMatch = candidate;
    }

    if (!bestMatch) {
        console.log(`      ⚠️ No applicable candidate found among ${result.results.length} results`);
        // If we have results but none passed applicability (e.g. size mismatch),
        // we return generic text instead of wrong numbers.
        return {
            finding_type: params.finding_type,
            text: "Avaliar clinicamente; diretrizes disponíveis podem não ser aplicáveis a este caso específico.",
            conditional: true
        };
    }

    const top = bestMatch;

    // REGRA 2: Inputs faltantes → condicionar
    // Também considerar risk_category:"unknown" como input faltante para nódulos
    const effectiveMissingInputs = [...result.missing_inputs];

    // Para achados onde risco importa (nódulos), forçar condicional se risco é unknown
    const riskDependentFindings = ['pulmonary_nodule', 'hepatic_lesion', 'thyroid_nodule'];
    if (riskDependentFindings.includes(params.finding_type) &&
        params.risk_category === 'unknown' &&
        !effectiveMissingInputs.includes('risk_category')) {
        effectiveMissingInputs.push('risk_category');
    }

    if (effectiveMissingInputs.length > 0) {
        console.log(`      ⚠️ Missing inputs: ${effectiveMissingInputs.join(', ')}`);

        const missingText = effectiveMissingInputs
            .map(i => {
                if (i === "risk_category") return "perfil de risco (baixo/alto)";
                if (i === "size_mm") return "tamanho";
                if (i === "immunosuppression_status") return "status imunológico";
                return i;
            })
            .join(", ");

        return {
            finding_type: params.finding_type,
            text: `Conforme ${top.guideline_id}, a conduta depende de: ${missingText}. Consultar tabela de seguimento da diretriz.`,
            applicability: formatApplicability(top),
            conditional: true,
            source_id: top.source_id,
            guideline_id: top.guideline_id,
            reference_key: top.guideline_id
        };
    }

    // REGRA 3: Verificar aplicabilidade
    if (!checkApplicability(top, finding, params)) {
        console.log(`      ⚠️ Applicability check failed`);
        return {
            finding_type: params.finding_type,
            text: "Avaliar clinicamente; diretrizes disponíveis podem não ser aplicáveis a este caso específico.",
            conditional: true
        };
    }

    // REGRA 4: Tudo OK → usar recomendação exata
    console.log(`      ✅ Using recommendation from ${top.guideline_id}`);
    return {
        finding_type: params.finding_type,
        text: top.recommendation_text,
        applicability: formatApplicability(top),
        conditional: false,
        source_id: top.source_id,
        guideline_id: top.guideline_id,
        reference_key: top.guideline_id
    };
}

function checkApplicability(
    result: RecommendationResult,
    finding: Finding,
    params: QueryParams
): boolean {

    // Check immunosuppression exclusion
    if (result.applicability.immunosuppressed_excluded &&
        (finding.patient?.immunosuppressed || params.constraints?.includes("immunosuppressed"))) {
        return false;
    }

    // Check oncologic context requirement
    if (result.applicability.oncologic_context_required &&
        !finding.context?.oncologic) {
        return false;
    }

    // Check age group
    const age = finding.patient?.age;
    if (result.applicability.age_group === "adult" && age && age < 18) {
        return false;
    }
    if (result.applicability.age_group === "pediatric" && age && age >= 18) {
        return false;
    }

    // ** NEW: Check size bracket mismatch **
    // Prevent recommendation for <=4mm being applied to 7-8mm nodules (and vice versa)
    const sizeMm = finding.size_mm || params.size_mm;
    if (sizeMm && result.recommendation_text) {
        const recText = result.recommendation_text.toLowerCase();

        // Detect size patterns in recommendation
        const sizeLessEqual = recText.match(/<=?\s*(\d+)\s*mm/);
        const sizeGreater = recText.match(/>=?\s*(\d+)\s*mm/);
        const sizeRange = recText.match(/(\d+)\s*-\s*(\d+)\s*mm/);

        if (sizeLessEqual) {
            const maxSize = parseInt(sizeLessEqual[1], 10);
            if (sizeMm > maxSize) {
                console.log(`      ❌ Size mismatch: finding ${sizeMm}mm > rec max ${maxSize}mm`);
                return false;
            }
        }

        if (sizeGreater) {
            const minSize = parseInt(sizeGreater[1], 10);
            if (sizeMm < minSize) {
                console.log(`      ❌ Size mismatch: finding ${sizeMm}mm < rec min ${minSize}mm`);
                return false;
            }
        }

        if (sizeRange) {
            const minSize = parseInt(sizeRange[1], 10);
            const maxSize = parseInt(sizeRange[2], 10);
            if (sizeMm < minSize || sizeMm > maxSize) {
                console.log(`      ❌ Size mismatch: finding ${sizeMm}mm outside range ${minSize}-${maxSize}mm`);
                return false;
            }
        }
    }

    return true;
}

function formatApplicability(result: RecommendationResult): string {
    const parts: string[] = [];

    if (result.applicability.age_group === "adult") {
        parts.push("Adultos");
    } else if (result.applicability.age_group === "pediatric") {
        parts.push("Pediátrico");
    }

    if (result.applicability.immunosuppressed_excluded) {
        parts.push("não-imunossuprimidos");
    }

    if (result.applicability.oncologic_context_required) {
        parts.push("contexto oncológico");
    }

    return parts.join(", ") || "Geral";
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    id: "recommendations",
    run: runRecommendationsAgent
};

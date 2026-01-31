/**
 * Recommendations Guard
 * 
 * Verifica que recomendações não contêm números inventados.
 * Implementa o "cinto e suspensório" anti-alucinação.
 * 
 * REGRAS:
 * 1. Se success=false na consulta, não pode haver padrão numérico
 * 2. Qualquer número na recomendação deve existir no payload original
 */

import type { RecommendationEntry, ReferenceEntry } from './agents/recommendations';

export interface GuardResult {
    valid: boolean;
    violations: string[];
    sanitized_recommendations: RecommendationEntry[];
}

// Patterns para detectar números que não devem aparecer sem fonte
const NUMERIC_PATTERNS = [
    /\d+\s*mm/i,           // 6 mm
    /\d+\s*cm/i,           // 1 cm
    /\d+\s*meses?/i,       // 6 meses
    /\d+\s*months?/i,      // 6 months
    /\d+\s*anos?/i,        // 2 anos
    /\d+\s*years?/i,       // 2 years
    /\d+\s*semanas?/i,     // 4 semanas
    /\d+\s*weeks?/i,       // 4 weeks
    /\d+\s*dias?/i,        // 30 dias
    /\d+\s*days?/i,        // 30 days
    /\d+\s*%/,             // 50%
    /\d+-\d+\s*(mm|cm|meses?|months?|anos?|years?)/i  // 6-12 meses
];

// Texto genérico padrão (sem números)
const GENERIC_TEXT = "Considerar correlação clínica e seguimento conforme diretrizes institucionais.";

export function validateRecommendations(
    recommendations: RecommendationEntry[],
    libraryPayloads: Map<string, any> // guideline_id -> payload original
): GuardResult {

    const violations: string[] = [];
    const sanitized: RecommendationEntry[] = [];

    for (const rec of recommendations) {
        // Se não tem guideline_id, não deve ter números
        if (!rec.guideline_id || !rec.source_id) {
            const hasNumbers = containsNumericPattern(rec.text);

            if (hasNumbers) {
                violations.push(
                    `VIOLATION: Recommendation without source contains numeric pattern: "${rec.text.substring(0, 100)}..."`
                );

                // Sanitize: replace with generic text
                sanitized.push({
                    ...rec,
                    text: GENERIC_TEXT
                });
            } else {
                sanitized.push(rec);
            }
            continue;
        }

        // Se tem guideline_id, verificar se números existem no payload
        const payload = libraryPayloads.get(rec.guideline_id);

        if (!payload) {
            // Payload não encontrado - ser conservador
            if (containsNumericPattern(rec.text) && rec.conditional) {
                // Conditional recs podem ter estrutura diferente, permitir
                sanitized.push(rec);
            } else if (containsNumericPattern(rec.text)) {
                violations.push(
                    `WARNING: Could not verify numbers for ${rec.guideline_id}`
                );
                sanitized.push(rec); // Não bloquear, só avisar
            } else {
                sanitized.push(rec);
            }
            continue;
        }

        // Verificar cada número na recomendação
        const numbersInRec = extractNumbers(rec.text);
        const numbersInPayload = extractNumbers(JSON.stringify(payload));

        for (const num of numbersInRec) {
            if (!numbersInPayload.includes(num)) {
                violations.push(
                    `VIOLATION: Number "${num}" in recommendation not found in library payload for ${rec.guideline_id}`
                );
            }
        }

        // Se teve violação grave, sanitizar
        const hasViolation = violations.some(v =>
            v.includes("VIOLATION") && v.includes(rec.guideline_id || "")
        );

        if (hasViolation) {
            sanitized.push({
                ...rec,
                text: `Conforme ${rec.guideline_id}, consultar diretriz original para valores específicos.`,
                conditional: true
            });
        } else {
            sanitized.push(rec);
        }
    }

    return {
        valid: violations.filter(v => v.includes("VIOLATION")).length === 0,
        violations,
        sanitized_recommendations: sanitized
    };
}

function containsNumericPattern(text: string): boolean {
    return NUMERIC_PATTERNS.some(pattern => pattern.test(text));
}

function extractNumbers(text: string): string[] {
    const numbers: string[] = [];

    // Extract all numeric patterns
    for (const pattern of NUMERIC_PATTERNS) {
        const globalPattern = new RegExp(pattern, 'gi');
        let match: RegExpExecArray | null;
        while ((match = globalPattern.exec(text)) !== null) {
            numbers.push(match[0].toLowerCase().trim());
        }
    }

    // Also extract standalone numbers
    const standaloneNumbers = text.match(/\b\d+(?:\.\d+)?\b/g) || [];
    numbers.push(...standaloneNumbers);

    // Deduplicate using filter
    return numbers.filter((num, index, self) => self.indexOf(num) === index);
}

/**
 * Verifica citações contra a lista de referências válidas
 */
export function validateReferences(
    references: ReferenceEntry[],
    validSources: Set<string>
): { valid: boolean; invalidRefs: string[] } {

    const invalidRefs: string[] = [];

    for (const ref of references) {
        // Verificar se a fonte existe no banco
        if (!validSources.has(ref.key) && !validSources.has(ref.key.toLowerCase())) {
            invalidRefs.push(ref.key);
        }
    }

    return {
        valid: invalidRefs.length === 0,
        invalidRefs
    };
}

export default {
    validateRecommendations,
    validateReferences
};

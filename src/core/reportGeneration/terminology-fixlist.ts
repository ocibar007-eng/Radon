/**
 * Terminology Fixlist Guard
 *
 * Corrige neologismos, anglicismos e erros ortográficos recorrentes
 * da IA em laudos radiológicos. Usa uma lista de substituição direta
 * (find/replace) carregada de data/terminology-fixlist.json.
 *
 * Posição no pipeline: DEPOIS do Claude/LLM, ANTES do canonicalizer.
 *
 * @example
 * const result = applyTerminologyFixlist("Lesão endometriósica no reto-sigmoide.");
 * // result.text === "Lesão endometriótica no retossigmoide."
 * // result.fixes === [{ wrong: "endometriósica", correct: "endometriótica", ... }, ...]
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export type FixlistEntry = {
    wrong: string;
    correct: string;
    type: string;
    note?: string;
    isRegex?: boolean;
    skip?: boolean;
};

export type FixApplied = {
    wrong: string;
    correct: string;
    type: string;
    position: number;
    field?: string;
};

export type FixlistResult = {
    text: string;
    fixes: FixApplied[];
    totalFixes: number;
};

// ============================================================================
// CACHE (compile once, reuse)
// ============================================================================

type CompiledRule = {
    regex: RegExp;
    correct: string;
    type: string;
    wrong: string;
};

let cachedRules: CompiledRule[] | null = null;
let cachedPath: string | null = null;

function resolveFixlistPath(): string {
    return path.resolve(process.cwd(), 'data', 'terminology-fixlist.json');
}

function loadAndCompileRules(fixlistPath?: string): CompiledRule[] {
    const resolvedPath = fixlistPath || resolveFixlistPath();
    if (cachedRules && cachedPath === resolvedPath) {
        return cachedRules;
    }

    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const entries: FixlistEntry[] = JSON.parse(raw);
    if (!Array.isArray(entries)) {
        throw new Error(`Terminology fixlist malformed: expected array, got ${typeof entries}`);
    }

    const rules: CompiledRule[] = [];
    for (const entry of entries) {
        if (entry.skip) continue;
        if (!entry.wrong || !entry.correct) continue;

        const pattern = entry.isRegex
            ? entry.wrong
            : escapeRegex(entry.wrong);
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');

        rules.push({
            regex,
            correct: entry.correct,
            type: entry.type || 'unknown',
            wrong: entry.wrong,
        });
    }

    cachedRules = rules;
    cachedPath = resolvedPath;
    return rules;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Aplica a fixlist de terminologia ao texto, corrigindo neologismos,
 * anglicismos e erros ortográficos conhecidos.
 *
 * @param text - Texto do laudo (Markdown ou plain text)
 * @param field - Nome do campo (para auditoria, ex: "findings[0].description")
 * @param fixlistPath - Caminho opcional para o JSON da fixlist
 * @returns Texto corrigido + lista de correções aplicadas
 */
export function applyTerminologyFixlist(
    text: string,
    field?: string,
    fixlistPath?: string
): FixlistResult {
    if (!text || text.trim().length === 0) {
        return { text, fixes: [], totalFixes: 0 };
    }

    const rules = loadAndCompileRules(fixlistPath);
    const fixes: FixApplied[] = [];
    let result = text;

    for (const rule of rules) {
        // Reset regex lastIndex for global flag
        rule.regex.lastIndex = 0;

        let match: RegExpExecArray | null;
        // Collect all match positions BEFORE replacing (for audit)
        const positions: number[] = [];
        const testRegex = new RegExp(rule.regex.source, rule.regex.flags);
        while ((match = testRegex.exec(result)) !== null) {
            positions.push(match.index);
        }

        if (positions.length > 0) {
            result = result.replace(rule.regex, rule.correct);
            for (const pos of positions) {
                fixes.push({
                    wrong: rule.wrong,
                    correct: rule.correct,
                    type: rule.type,
                    position: pos,
                    field,
                });
            }
        }
    }

    // Built-in: fix consecutive duplicated words (e.g., "significativas significativas")
    // Common LLM generation artifact — catches any word ≥4 chars repeated
    const dedupRegex = /\b(\w{4,})\s+\1\b/gi;
    let dedupMatch: RegExpExecArray | null;
    const dedupTest = new RegExp(dedupRegex.source, dedupRegex.flags);
    while ((dedupMatch = dedupTest.exec(result)) !== null) {
        fixes.push({
            wrong: dedupMatch[0],
            correct: dedupMatch[1],
            type: 'dedup',
            position: dedupMatch.index,
            field,
        });
    }
    result = result.replace(dedupRegex, '$1');

    return {
        text: result,
        fixes,
        totalFixes: fixes.length,
    };
}

/**
 * Aplica a fixlist a um array de strings (ex: achados, recomendações).
 */
export function applyTerminologyFixlistArray(
    values: string[] | undefined,
    fieldPrefix: string,
    fixlistPath?: string
): { values?: string[]; fixes: FixApplied[]; totalFixes: number } {
    if (!Array.isArray(values)) {
        return { values, fixes: [], totalFixes: 0 };
    }

    const allFixes: FixApplied[] = [];
    const corrected = values.map((value, index) => {
        const result = applyTerminologyFixlist(value, `${fieldPrefix}[${index}]`, fixlistPath);
        allFixes.push(...result.fixes);
        return result.text;
    });

    return {
        values: corrected,
        fixes: allFixes,
        totalFixes: allFixes.length,
    };
}

/**
 * Aplica a fixlist ao laudo completo em Markdown.
 * Use esta função como guard pós-processamento.
 */
export function applyTerminologyFixlistToReport(
    markdown: string,
    fixlistPath?: string
): FixlistResult {
    return applyTerminologyFixlist(markdown, 'report_markdown', fixlistPath);
}

/**
 * Força recarga da fixlist (útil se o JSON foi atualizado em runtime).
 */
export function clearFixlistCache(): void {
    cachedRules = null;
    cachedPath = null;
}

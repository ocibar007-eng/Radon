/**
 * Anthropic Claude API — Prompts
 *
 * Loads the FULL V6 instructions from disk (~27K tokens) to match
 * webchat quality. Falls back to a consolidated version if files
 * are not found.
 *
 * Source files (loaded in order):
 * 1. Gems/INSTRUCOES_PROJETO_LAUDOS_V6_PARA_COLAR_TESTE.md (identity + formatting)
 * 2. Gems/INSTRUCOES_PROJETO_LAUDOS_V6_TESTE.md (detailed rules + calculations)
 * 3. data/recommendations/md_docs/prompts/TC_RM_RUNTIME_TESTE.md (CT/MRI specifics)
 *
 * Prompt caching: cached via Anthropic prompt-caching header, so cost
 * drops ~90% after the first call in a session.
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// SYSTEM PROMPT — Full V6 files (same as webchat)
// ============================================================================

/**
 * Paths to the V6 instruction files, relative to project root.
 * These are the SAME files used in the Claude webchat Gems.
 *
 * For TC/RM, the prompt instructions mandate 5 files:
 * 1. V6_PARA_COLAR (identity + formatting rules)
 * 2. V6 (detailed governance, examples, anti-hallucination)
 * 3. TC_RM_RUNTIME (template + calculation rules)
 * 4. CALCULOS_MEDICOS (formulas — esteatose, volumes, washout, etc.)
 * 5. CATALOGO_MEDIDAS (reference measurements by organ/structure)
 */
const V6_INSTRUCTION_FILES = [
    'Gems/INSTRUCOES_PROJETO_LAUDOS_V6_PARA_COLAR_TESTE.md',
    'Gems/INSTRUCOES_PROJETO_LAUDOS_V6_TESTE.md',
    'data/recommendations/md_docs/prompts/TC_RM_RUNTIME_TESTE.md',
    'data/recommendations/md_docs/prompts/CALCULOS_MEDICOS (2).md',
    'data/recommendations/md_docs/prompts/CATALOGO_MEDIDAS (1).md',
];

/** Cache for loaded prompt (avoid re-reading files on every call) */
let _cachedFullPrompt: string | null = null;

/**
 * Loads the full V6 instruction files from disk and concatenates them.
 * This produces the same ~27K token prompt used in the Claude webchat.
 *
 * Results are cached in memory after first load.
 */
export function buildFullSystemPrompt(projectRoot?: string): string {
    if (_cachedFullPrompt) return _cachedFullPrompt;

    const root = projectRoot || process.cwd();
    const sections: string[] = [];

    for (const relPath of V6_INSTRUCTION_FILES) {
        const absPath = path.resolve(root, relPath);
        try {
            const content = fs.readFileSync(absPath, 'utf-8').trim();
            sections.push(content);
        } catch {
            console.warn(`[prompts] Arquivo não encontrado: ${absPath} — usando fallback`);
        }
    }

    if (sections.length === 0) {
        const fallbackMsg = 'ERRO: Nenhum arquivo de instrução V6 encontrado. Verifique se os arquivos Gems/ e data/recommendations/ existem no projeto.';
        console.error('[prompts] ' + fallbackMsg);
        _cachedFullPrompt = fallbackMsg;
        return _cachedFullPrompt;
    }

    console.log(`[prompts] ✅ System prompt carregado: ${sections.length} arquivos, ~${Math.round(sections.join('').length / 4)} tokens`);
    _cachedFullPrompt = sections.join('\n\n---\n\n');
    return _cachedFullPrompt;
}

/**
 * Resets the cached prompt (useful for testing or when files change).
 */
export function resetPromptCache(): void {
    _cachedFullPrompt = null;
}

/**
 * Exported for backwards compatibility.
 * Loads full V6 files (~27K tokens) — same as webchat.
 */
export const CLAUDE_SYSTEM_PROMPT = buildFullSystemPrompt();

// ============================================================================
// CASE MESSAGE BUILDER
// ============================================================================

export type CaseMessageInput = {
    /** Transcrição/ditado do radiologista */
    transcription: string;
    /** Dados clínicos extraídos (indicação, idade, etc.) */
    clinicalData?: string;
    /** Dados técnicos (equipamento, contraste, etc.) */
    technicalData?: string;
    /** Laudo(s) prévio(s) para comparação */
    priorReports?: string;
    /** Resultados de cálculos pré-computados (Calculator Service) */
    preComputedCalculations?: string;
    /** Referências selecionadas (RAG) */
    selectedReferences?: string;
    /** Modalidade detectada (TC, RM, USG) */
    modality?: 'TC' | 'RM' | 'USG';
    /** Região do exame */
    region?: string;
    /** Nome e OS do paciente */
    patientName?: string;
    patientOS?: string;
};

/**
 * Monta a user message para o Claude com todos os dados do caso.
 */
export function buildCaseMessage(input: CaseMessageInput): string {
    const sections: string[] = [];

    // Header
    if (input.patientName || input.patientOS) {
        sections.push(`## IDENTIFICAÇÃO\nNome: ${input.patientName || '<NÃO INFORMADO>'}\nOS: ${input.patientOS || '<NÃO INFORMADA>'}`);
    }

    // Modality/Region
    if (input.modality || input.region) {
        sections.push(`## MODALIDADE E REGIÃO\nModalidade: ${input.modality || '<DETECTAR>'}\nRegião: ${input.region || '<DETECTAR>'}`);
    }

    // Clinical data
    if (input.clinicalData) {
        sections.push(`## DADOS CLÍNICOS\n${input.clinicalData}`);
    }

    // Technical data
    if (input.technicalData) {
        sections.push(`## DADOS TÉCNICOS\n${input.technicalData}`);
    }

    // Transcription (MAIN SOURCE)
    sections.push(`## DITADO/TRANSCRIÇÃO (FONTE PRIMÁRIA)\n${input.transcription}`);

    // Prior reports
    if (input.priorReports) {
        sections.push(`## EXAMES/LAUDOS PRÉVIOS (para comparação)\n${input.priorReports}`);
    }

    // Pre-computed calculations
    if (input.preComputedCalculations) {
        sections.push(`## CÁLCULOS PRÉ-COMPUTADOS (use estes valores — não recalcule)\n${input.preComputedCalculations}`);
    }

    // Selected references
    if (input.selectedReferences) {
        sections.push(`## REFERÊNCIAS SELECIONADAS\n${input.selectedReferences}`);
    }

    return sections.join('\n\n---\n\n');
}

// ============================================================================
// RAG — Reference Selector
// ============================================================================

/** Keywords → file indices for quick lookup */
const REFERENCE_KEYWORDS: Record<string, number[]> = {
    // Renal
    bosniak: [80],
    'cisto renal': [80, 67, 68, 69, 77],
    renal: [63, 64, 65, 67, 68, 69, 77, 80],
    // Hepatic
    'li-rads': [38, 39, 40, 41, 42, 117],
    lirads: [38, 39, 40, 42, 117],
    hepatocarcinoma: [38, 39, 40, 117],
    chc: [38, 39, 40, 117],
    esteatose: [109, 127, 156],
    nafld: [127, 156],
    // Pulmonary
    fleischner: [107, 108, 118, 119],
    'nódulo pulmonar': [48, 107, 108, 118, 119],
    'lung-rads': [43, 44, 45, 46],
    // Thyroid
    tirads: [],
    'ti-rads': [],
    tireoide: [],
    // Prostate
    'pi-rads': [55, 56, 57, 58, 135],
    pirads: [55, 56, 57, 58, 135],
    próstata: [6, 16, 20, 55, 56, 57, 58, 60, 135],
    // Gynecology
    'o-rads': [50, 51, 52, 53, 129, 130, 141, 142, 149, 157],
    ovariano: [19, 35, 50, 51, 52, 53, 129, 130, 141, 142, 149, 157],
    endometriose: [11, 25, 30, 89],
    // Oncology
    recist: [49, 66, 111, 112, 113, 136, 137, 138, 140],
    irecist: [49, 112, 113],
    tnm: [70, 71, 83, 150, 151, 152, 153, 154, 155],
    // Vascular
    'aneurisma aorta': [105, 146],
    aaa: [105, 146],
    tvp: [72, 84, 115, 116, 128],
    trombose: [72, 84, 115, 116, 128],
    tep: [116],
    // Adrenal
    adrenal: [76],
    // Pancreas
    'cisto pancreático': [121, 147],
    tanaka: [147],
    // Gallbladder
    'pólipo vesícula': [102],
    vesícula: [102],
    // Trauma
    trauma: [33, 34, 74, 75, 87],
    aast: [33, 34, 74, 75, 87],
    // Myeloma
    mieloma: [123, 124, 125, 126, 133],
};

/**
 * Selects relevant reference file indices based on keywords found in the case text.
 * Returns top 3 most relevant file numbers (de-duplicated).
 */
export function selectRelevantReferences(
    caseText: string,
    maxRefs = 3
): number[] {
    const normalized = caseText.toLowerCase();
    const scores = new Map<number, number>();

    for (const [keyword, fileIndices] of Object.entries(REFERENCE_KEYWORDS)) {
        if (normalized.includes(keyword)) {
            for (const idx of fileIndices) {
                scores.set(idx, (scores.get(idx) || 0) + 1);
            }
        }
    }

    // Sort by score descending, take top N
    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxRefs)
        .map(([idx]) => idx);
}

/**
 * Loads reference file contents by index numbers.
 * Reads from the split mega-consultavel directory.
 */
export function loadReferenceFiles(
    indices: number[],
    basePath?: string
): string {
    const base = basePath || path.resolve(
        process.cwd(),
        'exports/mega_consultavel_157md_60k_ai_split'
    );

    const contents: string[] = [];
    for (const idx of indices) {
        const paddedIdx = String(idx).padStart(3, '0');
        // Find the file that starts with this index
        try {
            const files = fs.readdirSync(base);
            const match = files.find((f) => f.startsWith(`${paddedIdx}__`));
            if (match) {
                const content = fs.readFileSync(path.join(base, match), 'utf-8');
                // Truncate very long files to keep context manageable
                const truncated = content.length > 8000
                    ? content.slice(0, 8000) + '\n\n[... referência truncada por limite de contexto ...]'
                    : content;
                contents.push(`### Referência #${idx}: ${match}\n\n${truncated}`);
            }
        } catch {
            // File not found — skip silently
        }
    }

    return contents.join('\n\n---\n\n');
}

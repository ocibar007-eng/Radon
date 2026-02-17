import { CONFIG } from '../core/config.ts';
import {
    generateClaudeResponseStreaming,
    CLAUDE_SYSTEM_PROMPT,
    buildCaseMessage,
    selectRelevantReferences,
    loadReferenceFiles,
    estimateClaudeCostUSD,
} from '../adapters/anthropic/index.ts';
import type {
    AnthropicStopReason,
    AnthropicUsage,
    CaseMessageInput,
} from '../adapters/anthropic/index.ts';
import { applyTerminologyFixlistToReport } from '../core/reportGeneration/terminology-fixlist.ts';
import { canonicalizeMarkdown } from '../core/reportGeneration/canonicalizer.ts';
import { splitReportAndAudit, mergeReportAndAudit } from '../core/reportGeneration/audit-split.ts';

export type StreamReportMode = 'full' | 'correction' | 'audit';
export type CorrectionStrategy = 'light' | 'full';

export type StreamReportRequest = {
    transcription: string;
    clinicalData?: string;
    technicalData?: string;
    priorReports?: string;
    preComputedCalculations?: string;
    modality?: 'TC' | 'RM' | 'USG';
    region?: string;
    patientName?: string;
    patientOS?: string;
    enableThinking?: boolean;
    thinkingBudget?: number;
    corrections?: string;
    mode?: StreamReportMode;
    includeAudit?: boolean;
    correctionStrategy?: CorrectionStrategy;
    forceOpus?: boolean;
    currentReportMarkdown?: string;
};

export type StreamCompletePayload = {
    report: string;
    audit: string;
    thinking: string;
    durationMs: number;
    guards: {
        terminologyFixes: number;
        canonicalizerFixes: number;
    };
    stopReason: AnthropicStopReason;
    truncated: boolean;
    modelUsed: string;
    costEstimateUSD: number;
    mode: StreamReportMode;
    includeAudit: boolean;
    correctionStrategy: CorrectionStrategy;
};

export type StreamCallbacks = {
    onStatus?: (message: string) => void;
    onThinking?: (text: string) => void;
    onText?: (text: string) => void;
    onUsage?: (usage: AnthropicUsage) => void;
};

type StreamRunResult = {
    text: string;
    thinking: string;
    usage: AnthropicUsage;
    stopReason: AnthropicStopReason;
};

function normalizeBody(body: StreamReportRequest): Required<
    Pick<StreamReportRequest, 'mode' | 'includeAudit' | 'correctionStrategy' | 'forceOpus'>
> {
    return {
        mode: body.mode ?? 'full',
        includeAudit: body.includeAudit ?? false,
        correctionStrategy: body.correctionStrategy ?? 'light',
        forceOpus: body.forceOpus ?? false,
    };
}

function mergeUsage(base: AnthropicUsage, next: AnthropicUsage): AnthropicUsage {
    return {
        input_tokens: (base.input_tokens || 0) + (next.input_tokens || 0),
        output_tokens: (base.output_tokens || 0) + (next.output_tokens || 0),
        cache_creation_input_tokens: (base.cache_creation_input_tokens || 0) + (next.cache_creation_input_tokens || 0),
        cache_read_input_tokens: (base.cache_read_input_tokens || 0) + (next.cache_read_input_tokens || 0),
    };
}

function normalizeUsage(usage: Partial<AnthropicUsage> | undefined): AnthropicUsage {
    return {
        input_tokens: Number(usage?.input_tokens ?? 0),
        output_tokens: Number(usage?.output_tokens ?? 0),
        cache_creation_input_tokens: Number(usage?.cache_creation_input_tokens ?? 0),
        cache_read_input_tokens: Number(usage?.cache_read_input_tokens ?? 0),
    };
}

function buildCorrectionLightMessage(
    reportMarkdown: string,
    corrections: string,
    includeAudit: boolean,
): string {
    const auditInstruction = includeAudit
        ? 'Inclua AUDITORIA INTERNA ao final.'
        : 'Nao inclua AUDITORIA INTERNA na resposta.';

    return [
        'Voce recebera um pre-laudo em Markdown e correcoes do radiologista.',
        'Aplique somente as alteracoes estritamente necessarias.',
        'Preserve ao maximo a redacao original e mantenha o formato Markdown.',
        'Retorne o laudo completo ja corrigido.',
        auditInstruction,
        '',
        '## PRE-LAUDO ATUAL',
        reportMarkdown,
        '',
        '## CORRECOES DO RADIOLOGISTA',
        corrections,
    ].join('\n');
}

function buildAuditOnlyMessage(
    reportMarkdown: string,
): string {
    return [
        'Com base no laudo abaixo, gere somente o bloco de auditoria interna.',
        'Retorne APENAS a secao abaixo e nada mais:',
        'AUDITORIA INTERNA (NAO COPIAR PARA O LAUDO)',
        '',
        '## LAUDO',
        reportMarkdown,
    ].join('\n');
}

function buildContinuationMessage(
    partialText: string,
    includeAudit: boolean,
): string {
    const tail = partialText.slice(-12_000);
    return [
        'A resposta anterior foi interrompida por limite de tokens.',
        'Continue EXATAMENTE de onde parou, sem repetir texto.',
        'Retorne somente a continuacao em Markdown.',
        includeAudit
            ? 'Se faltar, finalize o bloco de AUDITORIA INTERNA.'
            : 'Nao inclua AUDITORIA INTERNA na continuacao.',
        '',
        '## TRECHO FINAL JA ENVIADO',
        tail,
    ].join('\n');
}

function resolveModel(
    mode: StreamReportMode,
    correctionStrategy: CorrectionStrategy,
    forceOpus: boolean,
): string {
    if (mode === 'correction' && correctionStrategy === 'light' && !forceOpus) {
        return CONFIG.CLAUDE_CORRECTION_MODEL;
    }
    return CONFIG.CLAUDE_MODEL;
}

function resolveThinkingMode(
    body: StreamReportRequest,
    mode: StreamReportMode,
    correctionStrategy: CorrectionStrategy,
    forceOpus: boolean,
): 'off' | 'adaptive' | 'manual' {
    if (mode === 'audit') return 'off';
    if (mode === 'correction' && correctionStrategy === 'light' && !forceOpus) return 'off';
    if (body.enableThinking === false) return 'off';
    if (typeof body.thinkingBudget === 'number' && body.thinkingBudget > 0) return 'manual';
    return 'adaptive';
}

async function runSingleStreamingPass(
    model: string,
    userMessage: string,
    thinkingMode: 'off' | 'adaptive' | 'manual',
    thinkingBudget: number | undefined,
    callbacks: StreamCallbacks,
): Promise<StreamRunResult> {
    let text = '';
    let thinking = '';
    let usage: AnthropicUsage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
    };
    let stopReason: AnthropicStopReason = null;

    for await (const chunk of generateClaudeResponseStreaming({
        systemPrompt: CLAUDE_SYSTEM_PROMPT,
        userMessage,
        model,
        maxTokens: CONFIG.CLAUDE_MAX_TOKENS,
        enableCaching: true,
        thinkingMode,
        thinkingBudget,
    })) {
        if (chunk.type === 'thinking_delta') {
            thinking += chunk.text;
            callbacks.onThinking?.(chunk.text);
        } else if (chunk.type === 'text_delta') {
            text += chunk.text;
            callbacks.onText?.(chunk.text);
        } else if (chunk.type === 'usage') {
            usage = normalizeUsage(chunk.usage);
            callbacks.onUsage?.(usage);
        } else if (chunk.type === 'stop') {
            stopReason = chunk.stopReason;
        } else if (chunk.type === 'error') {
            throw new Error(chunk.error);
        }
    }

    return { text, thinking, usage, stopReason };
}

function buildCaseInput(body: StreamReportRequest, selectedReferences?: string): CaseMessageInput {
    return {
        transcription: body.transcription,
        clinicalData: body.clinicalData,
        technicalData: body.technicalData,
        priorReports: body.priorReports,
        preComputedCalculations: body.preComputedCalculations,
        modality: body.modality,
        region: body.region,
        patientName: body.patientName,
        patientOS: body.patientOS,
        selectedReferences,
    };
}

function buildUserMessage(
    body: StreamReportRequest,
    mode: StreamReportMode,
    includeAudit: boolean,
    correctionStrategy: CorrectionStrategy,
    caseInput: CaseMessageInput,
): string {
    const baseCaseMessage = buildCaseMessage(caseInput);
    const hasCorrections = Boolean(body.corrections?.trim());

    if (mode === 'audit') {
        if (!body.currentReportMarkdown?.trim()) {
            throw new Error('mode=audit requer currentReportMarkdown.');
        }
        return buildAuditOnlyMessage(body.currentReportMarkdown.trim());
    }

    if (mode === 'correction') {
        if (!hasCorrections) {
            throw new Error('mode=correction requer campo corrections.');
        }

        if (correctionStrategy === 'light') {
            if (!body.currentReportMarkdown?.trim()) {
                throw new Error('correctionStrategy=light requer currentReportMarkdown.');
            }
            return buildCorrectionLightMessage(
                body.currentReportMarkdown.trim(),
                body.corrections!.trim(),
                includeAudit,
            );
        }

        return [
            baseCaseMessage,
            '',
            '---',
            '## CORRECOES DO RADIOLOGISTA',
            body.corrections!.trim(),
            '',
            includeAudit
                ? 'Refaca o laudo integrando as correcoes e inclua AUDITORIA INTERNA.'
                : 'Refaca o laudo integrando as correcoes e NAO inclua AUDITORIA INTERNA.',
        ].join('\n');
    }

    // mode === 'full'
    if (!includeAudit) {
        return `${baseCaseMessage}\n\n---\nNao inclua AUDITORIA INTERNA na resposta.`;
    }
    return baseCaseMessage;
}

export async function generateDraftReportStream(
    body: StreamReportRequest,
    callbacks: StreamCallbacks = {},
): Promise<StreamCompletePayload> {
    const startTime = Date.now();

    const { mode, includeAudit, correctionStrategy, forceOpus } = normalizeBody(body);
    const model = resolveModel(mode, correctionStrategy, forceOpus);
    const thinkingMode = resolveThinkingMode(body, mode, correctionStrategy, forceOpus);
    const thinkingBudget = body.thinkingBudget;

    const caseText = [body.transcription, body.clinicalData, body.priorReports]
        .filter(Boolean)
        .join(' ');
    const refIndices = selectRelevantReferences(caseText);
    const selectedReferences = refIndices.length > 0
        ? loadReferenceFiles(refIndices)
        : undefined;

    const caseInput = buildCaseInput(body, selectedReferences);
    const userMessage = buildUserMessage(body, mode, includeAudit, correctionStrategy, caseInput);

    callbacks.onStatus?.('Gerando laudo...');

    const firstPass = await runSingleStreamingPass(
        model,
        userMessage,
        thinkingMode,
        thinkingBudget,
        callbacks,
    );

    let combinedText = firstPass.text;
    let combinedThinking = firstPass.thinking;
    let combinedUsage = firstPass.usage;
    let stopReason = firstPass.stopReason;

    if (stopReason === 'max_tokens' && mode !== 'audit') {
        callbacks.onStatus?.('Limite de tokens atingido, continuando automaticamente...');
        const continuationMessage = buildContinuationMessage(combinedText, includeAudit);
        const secondPass = await runSingleStreamingPass(
            model,
            continuationMessage,
            'off',
            undefined,
            callbacks,
        );
        combinedText += secondPass.text;
        combinedThinking += secondPass.thinking;
        combinedUsage = mergeUsage(combinedUsage, secondPass.usage);
        stopReason = secondPass.stopReason;
    }

    let report = '';
    let audit = '';
    let terminologyFixes = 0;
    let canonicalizerFixes = 0;

    if (mode === 'audit') {
        const canon = canonicalizeMarkdown(combinedText);
        const split = splitReportAndAudit(canon.text);
        canonicalizerFixes = canon.corrections.length;
        audit = split.audit || split.report || canon.text.trim();
        report = '';
    } else {
        const fixlistResult = applyTerminologyFixlistToReport(combinedText);
        terminologyFixes = fixlistResult.totalFixes;
        const canonResult = canonicalizeMarkdown(fixlistResult.text);
        canonicalizerFixes = canonResult.corrections.length;

        const split = splitReportAndAudit(canonResult.text);
        audit = split.audit;
        report = includeAudit ? mergeReportAndAudit(split.report, split.audit) : split.report;
    }

    const durationMs = Date.now() - startTime;
    const costEstimateUSD = estimateClaudeCostUSD(combinedUsage, model);

    return {
        report,
        audit,
        thinking: combinedThinking,
        durationMs,
        guards: {
            terminologyFixes,
            canonicalizerFixes,
        },
        stopReason,
        truncated: stopReason === 'max_tokens',
        modelUsed: model,
        costEstimateUSD,
        mode,
        includeAudit,
        correctionStrategy,
    };
}


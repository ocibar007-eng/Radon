import { CONFIG } from '../core/config.ts';
import {
  CLAUDE_SYSTEM_PROMPT,
  buildCaseMessage,
  selectRelevantReferences,
  loadReferenceFiles,
} from '../adapters/anthropic/index.ts';
import {
  streamOpenAIChatCompletion,
  type OpenAIReasoningEffort,
  type OpenAIUsage,
} from '../adapters/openai/client.ts';
import { estimateOpenAICostUSD } from '../adapters/openai/cost-estimator.ts';
import { applyTerminologyFixlistToReport } from '../core/reportGeneration/terminology-fixlist.ts';
import { canonicalizeMarkdown } from '../core/reportGeneration/canonicalizer.ts';
import { splitReportAndAudit, mergeReportAndAudit } from '../core/reportGeneration/audit-split.ts';
import { appendOpenAIDraftUsageLog } from './openai-draft-usage-log.ts';
import type { CaseMessageInput } from '../adapters/anthropic/index.ts';

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
  reasoningEffort?: OpenAIReasoningEffort;
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
  stopReason: string | null;
  truncated: boolean;
  modelUsed: string;
  reasoningEffortUsed: OpenAIReasoningEffort | null;
  costEstimateUSD: number;
  mode: StreamReportMode;
  includeAudit: boolean;
  correctionStrategy: CorrectionStrategy;
};

export type StreamCallbacks = {
  onStatus?: (message: string) => void;
  onThinking?: (text: string) => void;
  onText?: (text: string) => void;
  onUsage?: (usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    reasoning_tokens?: number;
  }) => void;
};

type StreamRunResult = {
  text: string;
  thinking: string;
  usage: OpenAIUsage;
  stopReason: string | null;
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

function mergeUsage(base: OpenAIUsage, next: OpenAIUsage): OpenAIUsage {
  return {
    input_tokens: (base.input_tokens || 0) + (next.input_tokens || 0),
    output_tokens: (base.output_tokens || 0) + (next.output_tokens || 0),
    reasoning_tokens: (base.reasoning_tokens || 0) + (next.reasoning_tokens || 0),
  };
}

function buildCorrectionLightMessage(
  reportMarkdown: string,
  corrections: string,
  includeAudit: boolean,
  formattingGuardrails: string,
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
    '',
    formattingGuardrails,
  ].join('\n');
}

function buildAuditOnlyMessage(reportMarkdown: string): string {
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

function buildFormattingGuardrails(): string {
  return [
    '## REGRAS ADICIONAIS DE FORMATACAO (OBRIGATORIAS)',
    '- Nunca usar dois separadores horizontais consecutivos (nao repetir "---" em sequencia).',
    '- Em INDICACAO CLINICA, a primeira frase deve iniciar com letra maiuscula.',
    '- Em DIAGNOSTICOS DIFERENCIAIS, cada hipotese deve ficar em linha propria.',
    '- A linha da hipotese nao pode conter "A favor" nem "Contra/menos favoravel".',
    '- "A favor" e "Contra/menos favoravel" devem ficar em sublinhas separadas, com marcador "▪".',
    '- Em "Achados incidentais relevantes" e "Eventos adversos", o subtitulo deve ficar sozinho na linha, com itens abaixo.',
    '- A secao "NOTA SOBRE DESCRITORES DE PROBABILIDADE" deve ser completa, com todos os descritores e explicacao breve de cada um.',
    '- A secao "NOTA DE PROCEDIMENTO" deve ser detalhada (nao concisa), incluindo limitacoes tecnicas e necessidade de correlacao clinico-laboratorial.',
  ].join('\n');
}

function resolveModel(
  mode: StreamReportMode,
  correctionStrategy: CorrectionStrategy,
  forceOpus: boolean,
): string {
  if (mode === 'correction' && correctionStrategy === 'light' && !forceOpus) {
    return CONFIG.OPENAI_DRAFT_CORRECTION_MODEL;
  }
  return CONFIG.OPENAI_DRAFT_MODEL;
}

function resolveReasoningEffort(
  body: StreamReportRequest,
  mode: StreamReportMode,
  correctionStrategy: CorrectionStrategy,
  forceOpus: boolean,
): OpenAIReasoningEffort | undefined {
  if (mode === 'audit') return undefined;
  if (mode === 'correction' && correctionStrategy === 'light' && !forceOpus) return undefined;
  if (body.enableThinking === false) return undefined;

  if (
    body.reasoningEffort === 'low'
    || body.reasoningEffort === 'medium'
    || body.reasoningEffort === 'high'
    || body.reasoningEffort === 'xhigh'
  ) {
    return body.reasoningEffort;
  }

  if (typeof body.thinkingBudget === 'number' && body.thinkingBudget > 0) {
    if (body.thinkingBudget >= 8192) return 'xhigh';
    if (body.thinkingBudget >= 4096) return 'high';
    if (body.thinkingBudget >= 1024) return 'medium';
    return 'low';
  }

  return CONFIG.OPENAI_DRAFT_REASONING_EFFORT;
}

async function runSinglePass(
  model: string,
  userMessage: string,
  reasoningEffort: OpenAIReasoningEffort | undefined,
  callbacks: StreamCallbacks,
): Promise<StreamRunResult> {
  let sawTextDelta = false;
  let sawThinkingDelta = false;
  let sawUsage = false;

  const response = await streamOpenAIChatCompletion({
    model,
    systemPrompt: CLAUDE_SYSTEM_PROMPT,
    userMessage,
    reasoningEffort,
    maxCompletionTokens: CONFIG.OPENAI_DRAFT_MAX_TOKENS,
    timeoutMs: 300_000,
    onTextDelta: (delta) => {
      sawTextDelta = true;
      callbacks.onText?.(delta);
    },
    onReasoningDelta: (delta) => {
      sawThinkingDelta = true;
      callbacks.onThinking?.(delta);
    },
    onUsage: (usage) => {
      sawUsage = true;
      callbacks.onUsage?.({
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        reasoning_tokens: usage.reasoning_tokens || 0,
      });
    },
  });

  if (!sawThinkingDelta && response.reasoning) {
    callbacks.onThinking?.(response.reasoning);
  }

  if (!sawTextDelta && response.text) {
    callbacks.onText?.(response.text);
  }
  if (!sawUsage) {
    callbacks.onUsage?.({
      input_tokens: response.usage.input_tokens || 0,
      output_tokens: response.usage.output_tokens || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      reasoning_tokens: response.usage.reasoning_tokens || 0,
    });
  }

  return {
    text: response.text,
    thinking: response.reasoning || '',
    usage: response.usage,
    stopReason: response.finish_reason,
  };
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
  const formattingGuardrails = buildFormattingGuardrails();

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
        formattingGuardrails,
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
      '',
      formattingGuardrails,
    ].join('\n');
  }

  if (!includeAudit) {
    return `${baseCaseMessage}\n\n---\nNao inclua AUDITORIA INTERNA na resposta.\n\n${formattingGuardrails}`;
  }
  return `${baseCaseMessage}\n\n---\n${formattingGuardrails}`;
}

function isTruncatedStopReason(stopReason: string | null): boolean {
  const normalized = String(stopReason || '').toLowerCase();
  return normalized === 'length' || normalized === 'max_tokens';
}

function compactTextLength(value: string): number {
  return value.replace(/\s+/g, ' ').trim().length;
}

function looksReasoningStarved(
  text: string,
  usage: OpenAIUsage,
  maxCompletionTokens: number,
): boolean {
  const textLen = compactTextLength(text);
  const outputTokens = Number(usage.output_tokens || 0);
  const reasoningTokens = Number(usage.reasoning_tokens || 0);

  const almostAllOutputIsReasoning = outputTokens > 0 && reasoningTokens / outputTokens >= 0.85;
  const nearCapWithTinyAnswer = outputTokens >= Math.max(256, maxCompletionTokens - 64) && textLen < 500;
  const verifyOnlyPattern = /<VERIFICAR>/i.test(text) && textLen < 120;

  return textLen < 280 && (
    almostAllOutputIsReasoning
    || nearCapWithTinyAnswer
    || verifyOnlyPattern
  );
}

export async function generateDraftReportGptStream(
  body: StreamReportRequest,
  callbacks: StreamCallbacks = {},
): Promise<StreamCompletePayload> {
  const startTime = Date.now();

  const { mode, includeAudit, correctionStrategy, forceOpus } = normalizeBody(body);
  const model = resolveModel(mode, correctionStrategy, forceOpus);
  const reasoningEffort = resolveReasoningEffort(body, mode, correctionStrategy, forceOpus);

  const caseText = [body.transcription, body.clinicalData, body.priorReports]
    .filter(Boolean)
    .join(' ');
  const refIndices = selectRelevantReferences(caseText);
  const selectedReferences = refIndices.length > 0
    ? loadReferenceFiles(refIndices)
    : undefined;

  const caseInput = buildCaseInput(body, selectedReferences);
  const userMessage = buildUserMessage(body, mode, includeAudit, correctionStrategy, caseInput);

  callbacks.onStatus?.('Gerando laudo (GPT)...');

  const firstPass = await runSinglePass(
    model,
    userMessage,
    reasoningEffort,
    callbacks,
  );

  let combinedText = firstPass.text;
  let combinedThinking = firstPass.thinking;
  let combinedUsage = firstPass.usage;
  let stopReason = firstPass.stopReason;

  if (
    mode !== 'audit'
    && reasoningEffort
    && looksReasoningStarved(firstPass.text, firstPass.usage, CONFIG.OPENAI_DRAFT_MAX_TOKENS)
  ) {
    callbacks.onStatus?.('Resposta curta no modo de raciocinio alto; regenerando texto final automaticamente...');
    const retryPass = await runSinglePass(
      model,
      userMessage,
      undefined,
      callbacks,
    );
    combinedText = retryPass.text;
    combinedThinking += retryPass.thinking;
    combinedUsage = mergeUsage(combinedUsage, retryPass.usage);
    stopReason = retryPass.stopReason;
  }

  if (isTruncatedStopReason(stopReason) && mode !== 'audit') {
    callbacks.onStatus?.('Limite de tokens atingido, continuando automaticamente...');
    const continuationMessage = buildContinuationMessage(combinedText, includeAudit);
    const secondPass = await runSinglePass(
      model,
      continuationMessage,
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

    // Safety net: avoid returning an unexpectedly tiny report when model emitted much more text.
    const rawSplit = splitReportAndAudit(combinedText);
    const rawReport = includeAudit
      ? mergeReportAndAudit(rawSplit.report, rawSplit.audit)
      : rawSplit.report;
    const finalLen = compactTextLength(report);
    const rawLen = compactTextLength(rawReport);
    if (rawLen >= 400 && (finalLen === 0 || finalLen < rawLen * 0.35)) {
      callbacks.onStatus?.('Aplicando fallback de seguranca para preservar o laudo gerado.');
      const fallbackSource = rawReport.trim() || combinedText.trim();
      const fallbackFix = applyTerminologyFixlistToReport(fallbackSource);
      const fallbackCanon = canonicalizeMarkdown(fallbackFix.text);
      const fallbackSplit = splitReportAndAudit(fallbackCanon.text);

      terminologyFixes += fallbackFix.totalFixes;
      canonicalizerFixes += fallbackCanon.corrections.length;
      report = includeAudit
        ? mergeReportAndAudit(fallbackSplit.report, fallbackSplit.audit)
        : fallbackSplit.report;

      if (!report.trim()) {
        report = fallbackSource;
      }
      if (!audit && (fallbackSplit.audit || rawSplit.audit)) {
        audit = (fallbackSplit.audit || rawSplit.audit || '').trim();
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const costEstimateUSD = estimateOpenAICostUSD(combinedUsage, model);
  const reasoningEffortUsed = reasoningEffort ?? null;

  appendOpenAIDraftUsageLog({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    mode,
    model,
    reasoningEffort: reasoningEffortUsed,
    inputTokens: Number(combinedUsage.input_tokens || 0),
    outputTokens: Number(combinedUsage.output_tokens || 0),
    reasoningTokens: Number(combinedUsage.reasoning_tokens || 0),
    durationMs,
    costEstimateUSD,
    stopReason,
    truncated: isTruncatedStopReason(stopReason),
    includeAudit,
    correctionStrategy,
  }).catch((error) => {
    console.warn('[gpt-draft-stream] failed to append usage log:', error);
  });

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
    truncated: isTruncatedStopReason(stopReason),
    modelUsed: model,
    reasoningEffortUsed,
    costEstimateUSD,
    mode,
    includeAudit,
    correctionStrategy,
  };
}

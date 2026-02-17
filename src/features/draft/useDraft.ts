/**
 * useDraft — Hook de orquestração da aba Pré-Laudo IA.
 * Gerencia geração via streaming, correções leves, auditoria sob demanda e custo.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    calculateReportCost,
    accumulateDailyStats,
    type CostBreakdown,
    type TokenUsage,
    type DailyStats,
} from './domain/cost-tracker';
import { buildStyledReportHtmlForExport, markdownToCleanHTML, markdownToClipboardText } from './domain/format-report';
import {
    getDailyStats,
    saveDailyStats,
    getWeeklyTotal,
    getMonthlyTotal,
    getAdminCostSnapshot,
    saveAdminCostSnapshot,
    getDraftRunHistory,
    saveDraftRunSnapshot,
    type DraftRunSnapshot,
} from './domain/draft-storage';
import { splitReportAndAudit } from '../../core/reportGeneration/audit-split';

// ============================================================================
// TYPES
// ============================================================================

type StreamMode = 'full' | 'correction' | 'audit';
type CorrectionStrategy = 'light' | 'full';
export type DraftReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export type DraftStatus = 'idle' | 'generating' | 'done' | 'correcting' | 'regenerating';

export interface StreamEventEntry {
    atSeconds: number;
    type: 'status' | 'usage' | 'complete' | 'error';
    detail: string;
}

export interface DraftState {
    status: DraftStatus;
    reportMarkdown: string;
    reportHTML: string;
    auditText: string;
    thinkingText: string;
    enableThinking: boolean;
    elapsedSeconds: number;
    tokens: TokenUsage;
    cost: CostBreakdown;
    modelUsed: string;
    dailyStats: DailyStats;
    weeklyTotalUSD: number;
    monthlyTotalUSD: number;
    officialMonthlyUSD: number | null;
    corrections: string;
    error: string | null;
    auditLoading: boolean;
    truncated: boolean;
    stopReason: string | null;
    reasoningEffort: DraftReasoningEffort;
    runHistory: DraftRunSnapshot[];
    totalGenerationSeconds: number;
    streamText: string;
    streamStatus: string;
    streamEvents: StreamEventEntry[];
}

export interface DraftActions {
    generate: () => void;
    abort: () => void;
    toggleThinking: () => void;
    setReasoningEffort: (effort: DraftReasoningEffort) => void;
    setCorrections: (text: string) => void;
    regenerateWithCorrections: () => void;
    regenerateFullWithCorrections: () => void;
    loadAudit: () => void;
    copyFormatted: () => Promise<void>;
    downloadPDF: () => Promise<void>;
    downloadMarkdown: () => void;
    reset: () => void;
}

interface CaseData {
    transcription: string;
    clinicalData?: string;
    technicalData?: string;
    priorReports?: string;
    preComputedCalculations?: string;
    modality?: 'TC' | 'RM' | 'USG';
    region?: string;
    patientName?: string;
    patientOS?: string;
}

const REASONING_EFFORTS: DraftReasoningEffort[] = ['low', 'medium', 'high', 'xhigh'];

function normalizeReasoningEffort(value: string | undefined): DraftReasoningEffort {
    const normalized = (value || '').toLowerCase();
    if (REASONING_EFFORTS.includes(normalized as DraftReasoningEffort)) {
        return normalized as DraftReasoningEffort;
    }
    return 'high';
}

function effortToThinkingBudget(effort: DraftReasoningEffort): number {
    switch (effort) {
        case 'xhigh':
            return 8192;
        case 'high':
            return 4096;
        case 'medium':
            return 2048;
        case 'low':
        default:
            return 512;
    }
}

type StreamGenerateOptions = {
    mode: StreamMode;
    corrections?: string;
    correctionStrategy?: CorrectionStrategy;
    includeAudit?: boolean;
    forceOpus?: boolean;
    currentReportMarkdown?: string;
};

const EMPTY_TOKENS: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
const DRAFT_ENGINE = ((import.meta as any)?.env?.VITE_DRAFT_ENGINE || 'gpt')
    .toString()
    .toLowerCase() === 'claude'
    ? 'claude'
    : 'gpt';
const DEFAULT_REASONING_EFFORT = normalizeReasoningEffort(
    ((import.meta as any)?.env?.VITE_DRAFT_REASONING_EFFORT || 'high').toString(),
);
const DRAFT_API_PATH = DRAFT_ENGINE === 'claude'
    ? '/api/generate-report-claude-stream'
    : '/api/generate-report-gpt-stream';
const DEFAULT_MODEL = DRAFT_ENGINE === 'claude'
    ? 'claude-opus-4-6'
    : 'gpt-5.2-2025-12-11';

function normalizeDraftError(message: string): string {
    const normalized = message.trim();
    if (!normalized) return 'Erro desconhecido na geração do pré-laudo.';

    if (normalized === 'Failed to fetch' || normalized.toLowerCase().includes('networkerror')) {
        return `Falha de conexão com a API (${DRAFT_API_PATH}). Verifique se o servidor está rodando em localhost:3000 (sugestão: "npm run dev:full").`;
    }

    if (normalized === 'HTTP 404' || normalized.includes('HTTP 404')) {
        return `Endpoint ${DRAFT_API_PATH} não encontrado. Rode o app com "npm run dev:full" para habilitar rotas /api localmente.`;
    }

    return normalized;
}

function drainSSEBuffer(
    rawBuffer: string,
    onEvent: (eventType: string, payload: Record<string, unknown>) => void,
): string {
    let buffer = rawBuffer;

    while (true) {
        const boundary = buffer.indexOf('\n\n');
        if (boundary === -1) break;

        const eventBlock = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (!eventBlock) continue;

        let eventType = '';
        const dataLines: string[] = [];

        for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trimStart());
            }
        }

        if (!eventType || dataLines.length === 0) continue;

        try {
            const payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
            onEvent(eventType, payload);
        } catch {
            // Ignore malformed chunks
        }
    }

    return buffer;
}

function usageToTokens(data: Record<string, unknown>): TokenUsage {
    return {
        input: Number(data.input_tokens ?? 0),
        output: Number(data.output_tokens ?? 0),
        cacheRead: Number(data.cache_read_input_tokens ?? 0),
        cacheWrite: Number(data.cache_creation_input_tokens ?? 0),
        reasoning: Number(data.reasoning_tokens ?? 0),
    };
}

export function useDraft(caseData: CaseData | null): [DraftState, DraftActions] {
    const [status, setStatus] = useState<DraftStatus>('idle');
    const [reportMarkdown, setReportMarkdown] = useState('');
    const [auditText, setAuditText] = useState('');
    const [thinkingText, setThinkingText] = useState('');
    const [enableThinking, setEnableThinking] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [tokens, setTokens] = useState<TokenUsage>(EMPTY_TOKENS);
    const [modelUsed, setModelUsed] = useState(DEFAULT_MODEL);
    const [reasoningEffort, setReasoningEffortState] = useState<DraftReasoningEffort>(DEFAULT_REASONING_EFFORT);
    const [corrections, setCorrectionsState] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [auditLoading, setAuditLoading] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const [stopReason, setStopReason] = useState<string | null>(null);
    const [runHistory, setRunHistory] = useState<DraftRunSnapshot[]>(() => getDraftRunHistory());
    const [totalGenerationSeconds, setTotalGenerationSeconds] = useState(0);
    const [streamText, setStreamText] = useState('');
    const [streamStatus, setStreamStatus] = useState('');
    const [streamEvents, setStreamEvents] = useState<StreamEventEntry[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats>(getDailyStats);
    const [weeklyTotalUSD, setWeeklyTotalUSD] = useState<number>(getWeeklyTotal);
    const [monthlyTotalUSD, setMonthlyTotalUSD] = useState<number>(getMonthlyTotal);
    const [officialMonthlyUSD, setOfficialMonthlyUSD] = useState<number | null>(() => {
        const snapshot = getAdminCostSnapshot(24 * 60 * 60 * 1000);
        return snapshot ? snapshot.totalCostUSD : null;
    });

    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestTokensRef = useRef<TokenUsage>(EMPTY_TOKENS);
    const dailyStatsRef = useRef<DailyStats>(dailyStats);
    const correctionsRef = useRef<string>('');
    const reportBufferRef = useRef<string>('');
    const auditBufferRef = useRef<string>('');
    const streamTextRef = useRef<string>('');
    const streamStartedAtMsRef = useRef<number>(0);
    const modelUsedRef = useRef<string>(DEFAULT_MODEL);
    const runIdRef = useRef(0);
    const abortIntentRunIdRef = useRef<number | null>(null);
    const auditInFlightRef = useRef(false);

    useEffect(() => {
        dailyStatsRef.current = dailyStats;
    }, [dailyStats]);

    useEffect(() => {
        correctionsRef.current = corrections;
    }, [corrections]);

    useEffect(() => {
        modelUsedRef.current = modelUsed;
    }, [modelUsed]);

    const refreshTotals = useCallback(() => {
        setWeeklyTotalUSD(getWeeklyTotal());
        setMonthlyTotalUSD(getMonthlyTotal());
    }, []);

    const refreshOfficialUsage = useCallback(async () => {
        if (DRAFT_ENGINE !== 'claude') {
            setOfficialMonthlyUSD(null);
            return;
        }

        const cached = getAdminCostSnapshot();
        if (cached) {
            setOfficialMonthlyUSD(cached.totalCostUSD);
            return;
        }

        try {
            const response = await fetch('/api/admin/anthropic-usage');
            if (!response.ok) return;
            const payload = await response.json();
            const totalCostUSD = Number(payload?.totals?.costUSD);
            if (!Number.isFinite(totalCostUSD)) return;

            const totalInputTokens = Number(payload?.totals?.usage?.input_tokens ?? 0);
            const totalOutputTokens = Number(payload?.totals?.usage?.output_tokens ?? 0);
            const from = String(payload?.from ?? '');
            const to = String(payload?.to ?? '');

            saveAdminCostSnapshot({
                fetchedAt: Date.now(),
                from,
                to,
                totalCostUSD,
                totalInputTokens,
                totalOutputTokens,
            });
            setOfficialMonthlyUSD(totalCostUSD);
        } catch {
            // Optional telemetry endpoint; ignore transient failures.
        }
    }, []);

    useEffect(() => {
        refreshOfficialUsage();
    }, [refreshOfficialUsage]);

    const startTimer = useCallback(() => {
        setElapsedSeconds(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopTimer();
            abortRef.current?.abort();
        };
    }, [stopTimer]);

    const applyUsage = useCallback((data: Record<string, unknown>) => {
        const nextTokens = usageToTokens(data);
        latestTokensRef.current = nextTokens;
        setTokens(nextTokens);
    }, []);

    const pushStreamEvent = useCallback((type: StreamEventEntry['type'], detail: string) => {
        const elapsed = streamStartedAtMsRef.current > 0
            ? (Date.now() - streamStartedAtMsRef.current) / 1000
            : 0;
        const entry: StreamEventEntry = {
            atSeconds: Number(elapsed.toFixed(1)),
            type,
            detail: detail.trim() || '-',
        };

        setStreamEvents((prev) => {
            const next = [...prev, entry];
            return next.length > 160 ? next.slice(next.length - 160) : next;
        });
    }, []);

    const streamGenerate = useCallback(async (options: StreamGenerateOptions) => {
        if (!caseData?.transcription?.trim()) {
            setError('Não há transcrição/dados suficientes para gerar o pré-laudo.');
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const runId = runIdRef.current + 1;
        runIdRef.current = runId;
        abortIntentRunIdRef.current = null;

        const mode = options.mode;
        const correctionStrategy = options.correctionStrategy ?? 'light';
        const includeAudit = options.includeAudit ?? (mode === 'audit');
        const currentReportMarkdown = options.currentReportMarkdown ?? reportMarkdown;

        streamStartedAtMsRef.current = Date.now();
        streamTextRef.current = '';
        setStreamText('');
        setStreamEvents([]);
        setStreamStatus(mode === 'audit' ? 'Gerando auditoria (stream)...' : 'Conectando stream...');
        if (mode !== 'audit') {
            setTotalGenerationSeconds(0);
        }

        if (mode === 'audit') {
            if (auditInFlightRef.current) return;
            auditInFlightRef.current = true;
            setAuditLoading(true);
            setError(null);
            auditBufferRef.current = '';
            setAuditText('');
        } else {
            auditInFlightRef.current = false;
            setAuditLoading(false);
            setStatus(mode === 'correction' ? 'regenerating' : 'generating');
            setReportMarkdown('');
            setAuditText('');
            setThinkingText('');
            setTokens(EMPTY_TOKENS);
            latestTokensRef.current = EMPTY_TOKENS;
            reportBufferRef.current = '';
            auditBufferRef.current = '';
            setError(null);
            setTruncated(false);
            setStopReason(null);
        }

        const refreshedDaily = getDailyStats();
        if (refreshedDaily.date !== dailyStatsRef.current.date) {
            dailyStatsRef.current = refreshedDaily;
            setDailyStats(refreshedDaily);
        }

        startTimer();

        try {
            const response = await fetch(DRAFT_API_PATH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...caseData,
                    mode,
                    includeAudit,
                    correctionStrategy,
                    forceOpus: options.forceOpus ?? false,
                    enableThinking,
                    thinkingBudget: effortToThinkingBudget(reasoningEffort),
                    reasoningEffort,
                    corrections: options.corrections,
                    currentReportMarkdown: currentReportMarkdown || undefined,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const handleSSEEvent = (type: string, data: Record<string, unknown>) => {
                if (runId !== runIdRef.current) return;

                switch (type) {
                    case 'status': {
                        const message = String(data.message ?? '').trim();
                        const nextStatus = message || (mode === 'audit'
                            ? 'Gerando auditoria (stream)...'
                            : 'Gerando laudo (stream)...');
                        setStreamStatus(nextStatus);
                        pushStreamEvent('status', nextStatus);
                        break;
                    }

                    case 'thinking':
                        setThinkingText((prev) => prev + String(data.text ?? ''));
                        break;

                    case 'text': {
                        const chunkText = String(data.text ?? '');
                        if (!chunkText) break;

                        streamTextRef.current += chunkText;
                        setStreamText(streamTextRef.current);

                        if (mode === 'audit') {
                            auditBufferRef.current += chunkText;
                            setAuditText(auditBufferRef.current);
                            break;
                        }

                        reportBufferRef.current += chunkText;
                        const split = splitReportAndAudit(reportBufferRef.current);
                        setReportMarkdown(split.report);
                        if (includeAudit) {
                            setAuditText(split.audit);
                        }
                        break;
                    }

                    case 'usage':
                        applyUsage(data);
                        pushStreamEvent(
                            'usage',
                            `in=${Number(data.input_tokens ?? 0)} out=${Number(data.output_tokens ?? 0)} reasoning=${Number(data.reasoning_tokens ?? 0)}`
                        );
                        break;

                    case 'complete': {
                        const finalReport = String(data.report ?? '');
                        const finalAudit = String(data.audit ?? '');
                        const finalThinking = data.thinking ? String(data.thinking) : '';
                        const durationSeconds = Math.max(0, Number(data.durationMs ?? 0) / 1000);
                        const model = data.modelUsed ? String(data.modelUsed) : modelUsedRef.current;
                        const reasoningEffortUsed = typeof data.reasoningEffortUsed === 'string'
                            ? normalizeReasoningEffort(String(data.reasoningEffortUsed))
                            : (enableThinking ? reasoningEffort : null);
                        const estimatedCostUSD = Number(data.costEstimateUSD ?? 0);

                        setModelUsed(model);
                        setTruncated(Boolean(data.truncated));
                        setStopReason(data.stopReason ? String(data.stopReason) : null);
                        setStreamStatus('Stream concluido.');
                        pushStreamEvent(
                            'complete',
                            `total=${durationSeconds.toFixed(1)}s stop=${data.stopReason ? String(data.stopReason) : 'unknown'}`
                        );

                        if (mode === 'audit') {
                            const audit = finalAudit || finalReport || auditBufferRef.current;
                            setAuditText(audit.trim());
                            if (!streamTextRef.current.trim() && audit.trim()) {
                                streamTextRef.current = audit.trim();
                                setStreamText(streamTextRef.current);
                            }
                        } else {
                            setTotalGenerationSeconds(durationSeconds);
                            if (finalReport) {
                                const streamedReport = reportBufferRef.current || '';
                                const streamedLen = streamedReport.trim().length;
                                const finalLen = finalReport.trim().length;
                                const keepStreamed = streamedLen > 0
                                    && finalLen > 0
                                    && finalLen < streamedLen * 0.35;
                                const chosenReport = keepStreamed ? streamedReport : finalReport;

                                reportBufferRef.current = chosenReport;
                                setReportMarkdown(chosenReport);
                                if (!streamTextRef.current.trim()) {
                                    streamTextRef.current = chosenReport;
                                    setStreamText(streamTextRef.current);
                                }
                            }
                            setAuditText(includeAudit ? finalAudit : '');
                            if (finalThinking) setThinkingText(finalThinking);
                        }

                        const currentTokens = latestTokensRef.current;
                        const reportCost = calculateReportCost(currentTokens, model);
                        const effectiveCostUSD = Number.isFinite(estimatedCostUSD) && estimatedCostUSD > 0
                            ? estimatedCostUSD
                            : reportCost.totalUSD;
                        const todayStats = getDailyStats();
                        const baseStats = todayStats.date === dailyStatsRef.current.date
                            ? dailyStatsRef.current
                            : todayStats;
                        const updatedStats = accumulateDailyStats(
                            baseStats,
                            effectiveCostUSD,
                            currentTokens.input,
                            currentTokens.output,
                            durationSeconds,
                        );

                        saveDailyStats(updatedStats);
                        setDailyStats(updatedStats);
                        dailyStatsRef.current = updatedStats;
                        refreshTotals();
                        refreshOfficialUsage();

                        if (mode !== 'audit') {
                            saveDraftRunSnapshot({
                                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                                createdAt: Date.now(),
                                mode,
                                modelUsed: model,
                                reasoningEffort: reasoningEffortUsed,
                                tokensInput: currentTokens.input,
                                tokensOutput: currentTokens.output,
                                tokensReasoning: Number(currentTokens.reasoning || 0),
                                durationSeconds,
                                costUSD: effectiveCostUSD,
                                truncated: Boolean(data.truncated),
                                stopReason: data.stopReason ? String(data.stopReason) : null,
                                reportChars: (finalReport || reportBufferRef.current || '').length,
                                auditChars: (finalAudit || auditBufferRef.current || '').length,
                            });
                            setRunHistory(getDraftRunHistory());
                        }

                        if (mode === 'full') {
                            setStatus('done');
                        } else if (mode === 'correction') {
                            setStatus('correcting');
                        }
                        break;
                    }

                    case 'error':
                        setError(String(data.message ?? 'Erro no streaming da IA'));
                        setStatus('idle');
                        break;

                    default:
                        break;
                }
            };

            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
                buffer = drainSSEBuffer(buffer, handleSSEEvent);
            }

            buffer += decoder.decode().replace(/\r\n/g, '\n');
            if (buffer.trim()) {
                drainSSEBuffer(`${buffer}\n\n`, handleSSEEvent);
            }
        } catch (err: unknown) {
            if (runId !== runIdRef.current) return;
            if ((err as Error).name === 'AbortError') return;
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            const normalizedError = normalizeDraftError(message);
            setError(normalizedError);
            setStreamStatus('Erro no stream.');
            pushStreamEvent('error', normalizedError);
            if (mode !== 'audit') {
                setStatus('idle');
            }
        } finally {
            if (runId !== runIdRef.current) return;

            const wasAborted = controller.signal.aborted;
            if (mode === 'audit') {
                setAuditLoading(false);
                auditInFlightRef.current = false;
            }
            stopTimer();

            if (wasAborted) {
                const userAborted = abortIntentRunIdRef.current === runId;
                setError(userAborted ? 'Geração cancelada.' : null);
                setStopReason('aborted');
                setStreamStatus(userAborted ? 'Stream cancelado pelo usuario.' : 'Stream interrompido.');
                pushStreamEvent('status', userAborted ? 'cancelado' : 'interrompido');
                if (mode === 'audit') {
                    setAuditText('');
                } else {
                    const hasPartialReport = reportBufferRef.current.trim().length > 0;
                    if (mode === 'correction') {
                        setStatus(hasPartialReport ? 'correcting' : 'idle');
                    } else {
                        setStatus(hasPartialReport ? 'done' : 'idle');
                    }
                }
            }

            if (abortRef.current === controller) {
                abortRef.current = null;
            }
            if (abortIntentRunIdRef.current === runId) {
                abortIntentRunIdRef.current = null;
            }
        }
    }, [applyUsage, caseData, enableThinking, reasoningEffort, pushStreamEvent, refreshOfficialUsage, refreshTotals, reportMarkdown, startTimer, stopTimer]);

    const generate = useCallback(() => {
        streamGenerate({
            mode: 'full',
            includeAudit: false,
            correctionStrategy: 'full',
        });
    }, [streamGenerate]);

    const abort = useCallback(() => {
        const controller = abortRef.current;
        if (!controller || controller.signal.aborted) return;
        abortIntentRunIdRef.current = runIdRef.current;
        controller.abort();
    }, []);

    const toggleThinking = useCallback(() => {
        setEnableThinking((prev) => !prev);
    }, []);

    const setReasoningEffort = useCallback((effort: DraftReasoningEffort) => {
        setReasoningEffortState(normalizeReasoningEffort(effort));
    }, []);

    const setCorrections = useCallback((text: string) => {
        setCorrectionsState(text);
        correctionsRef.current = text;

        setStatus((current) => {
            if (current === 'generating' || current === 'regenerating') return current;
            if (!reportMarkdown.trim()) return 'idle';
            return text.trim() ? 'correcting' : 'done';
        });
    }, [reportMarkdown]);

    const regenerateWithCorrections = useCallback(() => {
        const trimmed = corrections.trim();
        if (!trimmed || !reportMarkdown.trim()) return;
        streamGenerate({
            mode: 'correction',
            corrections: trimmed,
            correctionStrategy: 'light',
            includeAudit: false,
            forceOpus: false,
            currentReportMarkdown: reportMarkdown,
        });
    }, [corrections, reportMarkdown, streamGenerate]);

    const regenerateFullWithCorrections = useCallback(() => {
        const trimmed = corrections.trim();
        if (!trimmed || !reportMarkdown.trim()) return;
        streamGenerate({
            mode: 'correction',
            corrections: trimmed,
            correctionStrategy: 'full',
            includeAudit: false,
            forceOpus: true,
            currentReportMarkdown: reportMarkdown,
        });
    }, [corrections, reportMarkdown, streamGenerate]);

    const loadAudit = useCallback(() => {
        if (auditInFlightRef.current) return;
        if (!reportMarkdown.trim() || auditLoading) return;
        if (auditText.trim()) return;
        streamGenerate({
            mode: 'audit',
            includeAudit: true,
            correctionStrategy: 'full',
            currentReportMarkdown: reportMarkdown,
        });
    }, [auditLoading, auditText, reportMarkdown, streamGenerate]);

    const copyFormatted = useCallback(async () => {
        const html = buildStyledReportHtmlForExport(reportMarkdown, {
            bodyFontPt: 10,
            titleFontPt: 12,
            notesFontPt: 8,
            lineHeight: 1.5,
            centerExamTitle: true,
            justify: true,
            fontFamily: 'Arial, Helvetica, sans-serif',
            removeAnnexReadHeader: true,
        });
        const text = markdownToClipboardText(reportMarkdown, {
            removeAnnexReadHeader: true,
        });

        try {
            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                const item = new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                });
                await navigator.clipboard.write([item]);
                return;
            }

            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }, [reportMarkdown]);

    const downloadPDF = useCallback(async () => {
        const html = buildStyledReportHtmlForExport(reportMarkdown, {
            bodyFontPt: 10,
            titleFontPt: 12,
            notesFontPt: 8,
            lineHeight: 1.5,
            centerExamTitle: true,
            justify: true,
            fontFamily: 'Arial, Helvetica, sans-serif',
        });
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Pré-Laudo</title>
            <style>
                body { max-width: 21cm; margin: 2cm auto; color: #111111; font-family: Arial, Helvetica, sans-serif; }
                table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
                th, td { border: 1px solid #d0d0d0; padding: 4pt 6pt; vertical-align: top; }
                hr { border: 0; border-top: 1px solid #ccc; margin: 10pt 0; }
            </style></head><body>${html}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    }, [reportMarkdown]);

    const downloadMarkdown = useCallback(() => {
        const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pre-laudo-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [reportMarkdown]);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        stopTimer();
        setStatus('idle');
        setReportMarkdown('');
        setAuditText('');
        setThinkingText('');
        setTokens(EMPTY_TOKENS);
        latestTokensRef.current = EMPTY_TOKENS;
        reportBufferRef.current = '';
        auditBufferRef.current = '';
        setCorrectionsState('');
        correctionsRef.current = '';
        setError(null);
        setElapsedSeconds(0);
        setTotalGenerationSeconds(0);
        setAuditLoading(false);
        auditInFlightRef.current = false;
        setTruncated(false);
        setStopReason(null);
        setModelUsed(DEFAULT_MODEL);
        setStreamText('');
        streamTextRef.current = '';
        setStreamStatus('');
        setStreamEvents([]);
        streamStartedAtMsRef.current = 0;
    }, [stopTimer]);

    const cost = calculateReportCost(tokens, modelUsed);
    const reportHTML = markdownToCleanHTML(reportMarkdown);

    const state: DraftState = {
        status,
        reportMarkdown,
        reportHTML,
        auditText,
        thinkingText,
        enableThinking,
        reasoningEffort,
        elapsedSeconds,
        tokens,
        cost,
        modelUsed,
        dailyStats,
        weeklyTotalUSD,
        monthlyTotalUSD,
        officialMonthlyUSD,
        corrections,
        error,
        auditLoading,
        truncated,
        stopReason,
        runHistory,
        totalGenerationSeconds,
        streamText,
        streamStatus,
        streamEvents,
    };

    const actions: DraftActions = {
        generate,
        abort,
        toggleThinking,
        setReasoningEffort,
        setCorrections,
        regenerateWithCorrections,
        regenerateFullWithCorrections,
        loadAudit,
        copyFormatted,
        downloadPDF,
        downloadMarkdown,
        reset,
    };

    return [state, actions];
}

/**
 * DraftMetaBar - Barra de metricas e acoes de exportacao.
 * Exibe custo/tokens/tempo do laudo atual e comparacao entre execucoes.
 */

import React from 'react';
import { Copy, Download, FileText, Clock, Zap, DollarSign, TrendingUp } from 'lucide-react';
import {
    formatCostUSD,
    formatCostBRL,
    formatTokenCount,
    USD_TO_BRL,
    MONTHLY_BUDGET_BRL,
    projectMonthlyBurnBRL,
    type CostBreakdown,
    type DailyStats,
} from '../domain/cost-tracker';
import type { DraftRunSnapshot } from '../domain/draft-storage';
import type { DraftReasoningEffort } from '../useDraft';

interface Props {
    cost: CostBreakdown;
    tokens: { input: number; output: number; cacheRead: number; cacheWrite: number; reasoning?: number };
    elapsedSeconds: number;
    dailyStats: DailyStats;
    weeklyTotalUSD: number;
    monthlyTotalUSD: number;
    officialMonthlyUSD: number | null;
    modelUsed: string;
    reasoningEffort: DraftReasoningEffort;
    runHistory: DraftRunSnapshot[];
    hasReport: boolean;
    onCopyFormatted: () => Promise<void>;
    onDownloadPDF: () => Promise<void>;
    onDownloadMarkdown: () => void;
}

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s}s`;
}

function formatSignedCurrency(value: number): string {
    const abs = Math.abs(value);
    return `${value >= 0 ? '+' : '-'}${formatCostUSD(abs)}`;
}

function formatSignedTokens(value: number): string {
    const abs = Math.abs(value);
    return `${value >= 0 ? '+' : '-'}${formatTokenCount(abs)}`;
}

export const DraftMetaBar: React.FC<Props> = ({
    cost,
    tokens,
    elapsedSeconds,
    dailyStats,
    weeklyTotalUSD,
    monthlyTotalUSD,
    officialMonthlyUSD,
    modelUsed,
    reasoningEffort,
    runHistory,
    hasReport,
    onCopyFormatted,
    onDownloadPDF,
    onDownloadMarkdown,
}) => {
    const hasTokens = tokens.input > 0 || tokens.output > 0;
    const monthToDateUSD = officialMonthlyUSD ?? monthlyTotalUSD;
    const burnProjection = projectMonthlyBurnBRL(monthToDateUSD);
    const burnPct = burnProjection.pctBudget * 100;
    const burnClass = burnProjection.pctBudget >= 0.95
        ? 'draft-meta-budget--danger'
        : burnProjection.pctBudget >= 0.8
            ? 'draft-meta-budget--warn'
            : burnProjection.pctBudget >= 0.6
                ? 'draft-meta-budget--watch'
                : 'draft-meta-budget--ok';
    const modelLabel = modelUsed.includes('claude-')
        ? modelUsed.replace('claude-', '')
        : modelUsed;
    const latestRun = runHistory[0];
    const previousRun = runHistory[1];
    const hasComparison = Boolean(latestRun && previousRun);
    const deltaCostUSD = hasComparison ? latestRun!.costUSD - previousRun!.costUSD : 0;
    const deltaTokensOut = hasComparison ? latestRun!.tokensOutput - previousRun!.tokensOutput : 0;
    const deltaReasoning = hasComparison ? latestRun!.tokensReasoning - previousRun!.tokensReasoning : 0;
    const deltaDuration = hasComparison ? latestRun!.durationSeconds - previousRun!.durationSeconds : 0;

    return (
        <div className="draft-meta-bar">
            <div className="draft-meta-metrics">
                {hasTokens && (
                    <>
                        <span className="draft-meta-chip" title="Custo deste laudo">
                            <DollarSign size={12} />
                            {formatCostUSD(cost.totalUSD)} ({formatCostBRL(cost.totalBRL)})
                        </span>
                        <span className="draft-meta-divider">·</span>
                        <span className="draft-meta-chip" title="Tokens de entrada">
                            <Zap size={12} />
                            {formatTokenCount(tokens.input)} in
                        </span>
                        <span className="draft-meta-divider">·</span>
                        <span className="draft-meta-chip" title="Tokens de saida">
                            {formatTokenCount(tokens.output)} out
                        </span>
                        {(tokens.reasoning || 0) > 0 && (
                            <>
                                <span className="draft-meta-divider">·</span>
                                <span className="draft-meta-chip" title="Tokens de raciocinio">
                                    {formatTokenCount(Number(tokens.reasoning || 0))} reasoning
                                </span>
                            </>
                        )}
                        {tokens.cacheRead > 0 && (
                            <>
                                <span className="draft-meta-divider">·</span>
                                <span className="draft-meta-chip draft-meta-chip--cache" title="Cache hit">
                                    cache: {formatTokenCount(tokens.cacheRead)}
                                </span>
                            </>
                        )}
                        <span className="draft-meta-divider">·</span>
                        <span className="draft-meta-chip" title="Tempo de geracao">
                            <Clock size={12} />
                            {formatTime(elapsedSeconds)}
                        </span>
                        <span className="draft-meta-divider">·</span>
                        <span className="draft-meta-chip" title="Esforco de raciocinio selecionado">
                            effort: {reasoningEffort}
                        </span>
                        <span className="draft-meta-divider">·</span>
                        <span className="draft-meta-chip" title="Modelo usado nesta geracao">
                            model: {modelLabel}
                        </span>
                    </>
                )}
            </div>

            {hasComparison && (
                <div className="draft-meta-compare">
                    <span>
                        Comparacao (atual vs anterior): custo {formatSignedCurrency(deltaCostUSD)} · out {formatSignedTokens(deltaTokensOut)} · reasoning {formatSignedTokens(deltaReasoning)} · tempo {deltaDuration >= 0 ? '+' : '-'}{formatTime(Math.abs(Math.round(deltaDuration)))}
                    </span>
                    <span className="draft-meta-compare-models">
                        {latestRun!.reasoningEffort || 'none'} vs {previousRun!.reasoningEffort || 'none'}
                    </span>
                </div>
            )}

            {dailyStats.totalReports > 0 && (
                <div className="draft-meta-daily">
                    <TrendingUp size={12} />
                    <span>
                        Hoje: {formatCostBRL(dailyStats.totalCostUSD * USD_TO_BRL)} · 7d: {formatCostBRL(weeklyTotalUSD * USD_TO_BRL)} · 30d local: {formatCostBRL(monthlyTotalUSD * USD_TO_BRL)} ({dailyStats.totalReports} {dailyStats.totalReports === 1 ? 'laudo' : 'laudos'})
                    </span>
                </div>
            )}

            <div className={`draft-meta-budget ${burnClass}`}>
                <span>
                    Projecao mes: {formatCostBRL(burnProjection.projectedBRL)} ({burnPct.toFixed(0)}% de {formatCostBRL(MONTHLY_BUDGET_BRL)})
                </span>
                {officialMonthlyUSD !== null && (
                    <span className="draft-meta-budget-source">
                        fonte: Admin API
                    </span>
                )}
            </div>

            {hasReport && (
                <div className="draft-meta-actions">
                    <button
                        type="button"
                        className="draft-btn draft-btn--action"
                        onClick={onCopyFormatted}
                        title="Copiar texto formatado do laudo"
                    >
                        <Copy size={14} />
                        <span>Copiar Laudo</span>
                    </button>
                    <button
                        type="button"
                        className="draft-btn draft-btn--action"
                        onClick={onDownloadPDF}
                        title="Abrir para impressao / salvar como PDF"
                    >
                        <Download size={14} />
                        <span>PDF</span>
                    </button>
                    <button
                        type="button"
                        className="draft-btn draft-btn--action"
                        onClick={onDownloadMarkdown}
                        title="Baixar markdown"
                    >
                        <FileText size={14} />
                        <span>MD</span>
                    </button>
                </div>
            )}
        </div>
    );
};

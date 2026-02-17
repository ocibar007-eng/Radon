/**
 * Cost Tracker — Lógica pura de cálculo de custo Claude API.
 * Sem dependências React. Preços Opus 4.6 (Fev/2026).
 */

export interface CostBreakdown {
    inputCost: number;
    outputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
    totalUSD: number;
    totalBRL: number;
}

export interface TokenUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning?: number;
}

export interface DailyStats {
    date: string;
    totalReports: number;
    totalCostUSD: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalTimeSeconds: number;
}

/** Câmbio fixo USD→BRL (configurável) */
export const USD_TO_BRL = 5.80;
export const MONTHLY_BUDGET_BRL = 1000;

type PricingByModel = {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
};

const MODEL_PRICING: Record<'opus' | 'sonnet' | 'haiku' | 'gpt', PricingByModel> = {
    opus: { input: 5.0, output: 25.0, cacheRead: 0.5, cacheWrite: 10.0 },
    sonnet: { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 6.0 },
    haiku: { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 2.0 },
    gpt: {
        input: Number(process.env.OPENAI_DRAFT_INPUT_USD_PER_M || '0'),
        output: Number(process.env.OPENAI_DRAFT_OUTPUT_USD_PER_M || '0'),
        cacheRead: 0,
        cacheWrite: 0,
    },
} as const;

export function getModelFamily(modelName: string): 'opus' | 'sonnet' | 'haiku' | 'gpt' {
    const normalized = modelName.toLowerCase();
    if (normalized.startsWith('gpt-')) return 'gpt';
    if (normalized.includes('haiku')) return 'haiku';
    if (normalized.includes('sonnet')) return 'sonnet';
    return 'opus';
}

export function calculateReportCost(
    tokens: TokenUsage,
    modelName = 'claude-opus-4-6',
): CostBreakdown {
    const family = getModelFamily(modelName);
    const pricing = MODEL_PRICING[family];
    const inputCost = (tokens.input / 1_000_000) * pricing.input;
    const outputCost = (tokens.output / 1_000_000) * pricing.output;
    const cacheReadCost = (tokens.cacheRead / 1_000_000) * pricing.cacheRead;
    const cacheWriteCost = (tokens.cacheWrite / 1_000_000) * pricing.cacheWrite;
    const totalUSD = inputCost + outputCost + cacheReadCost + cacheWriteCost;

    return {
        inputCost,
        outputCost,
        cacheReadCost,
        cacheWriteCost,
        totalUSD,
        totalBRL: totalUSD * USD_TO_BRL,
    };
}

export function formatCostUSD(value: number): string {
    return `$${value.toFixed(4)}`;
}

export function formatCostBRL(value: number): string {
    return `R$${value.toFixed(2)}`;
}

export function formatTokenCount(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
}

export function accumulateDailyStats(
    current: DailyStats,
    reportCost: number,
    tokensIn: number,
    tokensOut: number,
    timeSeconds: number,
): DailyStats {
    return {
        ...current,
        totalReports: current.totalReports + 1,
        totalCostUSD: current.totalCostUSD + reportCost,
        totalTokensIn: current.totalTokensIn + tokensIn,
        totalTokensOut: current.totalTokensOut + tokensOut,
        totalTimeSeconds: current.totalTimeSeconds + timeSeconds,
    };
}

export function createEmptyDailyStats(date: string): DailyStats {
    return {
        date,
        totalReports: 0,
        totalCostUSD: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalTimeSeconds: 0,
    };
}

export function projectMonthlyBurnBRL(
    monthToDateUSD: number,
    referenceDate = new Date(),
    budgetBRL = MONTHLY_BUDGET_BRL,
): { projectedBRL: number; pctBudget: number } {
    const dayOfMonth = Math.max(1, referenceDate.getDate());
    const daysInMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0,
    ).getDate();

    const projectedUSD = (monthToDateUSD / dayOfMonth) * daysInMonth;
    const projectedBRL = projectedUSD * USD_TO_BRL;
    const pctBudget = budgetBRL > 0 ? projectedBRL / budgetBRL : 0;

    return { projectedBRL, pctBudget };
}

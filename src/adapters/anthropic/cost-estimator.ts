import type { AnthropicUsage } from './types.ts';

type PricingTable = {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
};

const PRICING_BY_FAMILY_1H_CACHE: Record<'opus' | 'sonnet' | 'haiku', PricingTable> = {
    opus: {
        input: 5.0,
        output: 25.0,
        cacheRead: 0.5,
        cacheWrite: 10.0,
    },
    sonnet: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 6.0,
    },
    haiku: {
        input: 1.0,
        output: 5.0,
        cacheRead: 0.1,
        cacheWrite: 2.0,
    },
};

export function getModelFamily(modelName: string): 'opus' | 'sonnet' | 'haiku' {
    const normalized = modelName.toLowerCase();
    if (normalized.includes('haiku')) return 'haiku';
    if (normalized.includes('sonnet')) return 'sonnet';
    return 'opus';
}

export function estimateClaudeCostUSD(
    usage: AnthropicUsage,
    modelName: string,
): number {
    const family = getModelFamily(modelName);
    const pricing = PRICING_BY_FAMILY_1H_CACHE[family];

    const inputCost = (Number(usage.input_tokens || 0) / 1_000_000) * pricing.input;
    const outputCost = (Number(usage.output_tokens || 0) / 1_000_000) * pricing.output;
    const cacheReadCost = (Number(usage.cache_read_input_tokens || 0) / 1_000_000) * pricing.cacheRead;
    const cacheWriteCost = (Number(usage.cache_creation_input_tokens || 0) / 1_000_000) * pricing.cacheWrite;

    return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}


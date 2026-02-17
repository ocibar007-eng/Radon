import type { AnthropicUsage } from './types.ts';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export type UsageCostQuery = {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
    workspaceId?: string;
};

export type DailyUsageCost = {
    date: string;
    costUSD: number;
    usage: AnthropicUsage;
};

export type UsageCostSnapshot = {
    source: 'anthropic-admin-api';
    from: string;
    to: string;
    fetchedAt: string;
    totals: {
        costUSD: number;
        usage: AnthropicUsage;
    };
    daily: DailyUsageCost[];
    raw: {
        costReport?: unknown;
        usageReport?: unknown;
    };
};

function getAdminApiKey(): string {
    const key = process.env.ANTHROPIC_ADMIN_API_KEY;
    if (!key) {
        throw new Error('ANTHROPIC_ADMIN_API_KEY não configurada.');
    }
    return key;
}

export function isAnthropicAdminAvailable(): boolean {
    try {
        getAdminApiKey();
        return true;
    } catch {
        return false;
    }
}

function toIsoStart(date: string): string {
    return `${date}T00:00:00Z`;
}

function toIsoEnd(date: string): string {
    return `${date}T23:59:59Z`;
}

function extractDate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    if (value.length >= 10) return value.slice(0, 10);
    return null;
}

function parseUsdFromResult(result: any): number {
    if (typeof result?.cost_usd === 'number') return result.cost_usd;
    if (typeof result?.cost_usd === 'string') {
        const parsed = Number(result.cost_usd);
        if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof result?.amount?.value === 'number') return result.amount.value;
    if (typeof result?.amount?.value === 'string') {
        const parsed = Number(result.amount.value);
        if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof result?.amount === 'number') return result.amount;
    if (typeof result?.amount === 'string') {
        const parsed = Number(result.amount);
        if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof result?.usd === 'number') return result.usd;
    if (typeof result?.usd === 'string') {
        const parsed = Number(result.usd);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function parseUsageFromResult(result: any): AnthropicUsage {
    const cacheCreationFromNested = Number(result?.cache_creation?.ephemeral_1h_input_tokens ?? 0)
        + Number(result?.cache_creation?.ephemeral_5m_input_tokens ?? 0);

    return {
        input_tokens: Number(
            result?.input_tokens
            ?? result?.uncached_input_tokens
            ?? result?.usage_input_tokens_no_cache
            ?? 0
        ),
        output_tokens: Number(result?.output_tokens ?? result?.usage_output_tokens ?? 0),
        cache_creation_input_tokens: Number(
            result?.cache_creation_input_tokens
            ?? result?.usage_input_tokens_cache_write_1h
            ?? result?.usage_input_tokens_cache_write_5m
            ?? cacheCreationFromNested
        ),
        cache_read_input_tokens: Number(
            result?.cache_read_input_tokens
            ?? result?.usage_input_tokens_cache_read
            ?? 0
        ),
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

async function fetchAdminJson(
    path: string,
    query: URLSearchParams,
): Promise<unknown> {
    const apiKey = getAdminApiKey();

    const res = await fetch(`${ANTHROPIC_BASE_URL}${path}?${query.toString()}`, {
        method: 'GET',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Anthropic Admin API ${res.status} em ${path}: ${body}`);
    }

    return res.json() as Promise<unknown>;
}

function mergePaginatedPayload(base: any, next: any): any {
    const baseData = Array.isArray(base?.data) ? base.data : [];
    const nextData = Array.isArray(next?.data) ? next.data : [];
    return {
        ...base,
        ...next,
        data: [...baseData, ...nextData],
    };
}

async function fetchAllPages(
    path: string,
    baseQuery: URLSearchParams,
): Promise<unknown> {
    let page: string | null = null;
    let merged: any = null;

    for (let i = 0; i < 100; i += 1) {
        const params = new URLSearchParams(baseQuery);
        if (page) {
            params.set('page', page);
        }

        const payload = await fetchAdminJson(path, params) as any;
        merged = merged ? mergePaginatedPayload(merged, payload) : payload;

        if (!payload?.has_more || !payload?.next_page) break;
        page = String(payload.next_page);
    }

    return merged || { data: [], has_more: false, next_page: null };
}

async function fetchFirstAvailable(
    paths: string[],
    query: URLSearchParams,
): Promise<{ path: string; data: unknown }> {
    let lastError: Error | null = null;
    for (const path of paths) {
        try {
            const data = await fetchAllPages(path, query);
            return { path, data };
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }
    throw lastError || new Error('Falha ao consultar Anthropic Admin API.');
}

function aggregateCost(raw: any): Map<string, number> {
    const byDate = new Map<string, number>();
    const buckets = Array.isArray(raw?.data) ? raw.data : [];
    for (const bucket of buckets) {
        const date = extractDate(bucket?.starting_at)
            || extractDate(bucket?.usage_date_utc)
            || extractDate(bucket?.date)
            || extractDate(bucket?.interval_start)
            || null;
        if (!date) continue;

        let total = 0;
        if (Array.isArray(bucket?.results)) {
            for (const result of bucket.results) {
                total += parseUsdFromResult(result);
            }
        } else {
            total += parseUsdFromResult(bucket);
        }

        byDate.set(date, (byDate.get(date) || 0) + total);
    }
    return byDate;
}

function aggregateUsage(raw: any): Map<string, AnthropicUsage> {
    const byDate = new Map<string, AnthropicUsage>();
    const buckets = Array.isArray(raw?.data) ? raw.data : [];
    for (const bucket of buckets) {
        const date = extractDate(bucket?.starting_at)
            || extractDate(bucket?.usage_date_utc)
            || extractDate(bucket?.date)
            || extractDate(bucket?.interval_start)
            || null;
        if (!date) continue;

        const current = byDate.get(date) || {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
        };

        if (Array.isArray(bucket?.results)) {
            for (const result of bucket.results) {
                const parsed = parseUsageFromResult(result);
                byDate.set(date, mergeUsage(byDate.get(date) || current, parsed));
            }
        } else {
            byDate.set(date, mergeUsage(current, parseUsageFromResult(bucket)));
        }
    }
    return byDate;
}

export async function fetchAnthropicUsageCostSnapshot(
    query: UsageCostQuery,
): Promise<UsageCostSnapshot> {
    const params = new URLSearchParams({
        starting_at: toIsoStart(query.from),
        ending_at: toIsoEnd(query.to),
        bucket_width: '1d',
    });
    if (query.workspaceId) {
        params.set('workspace_id', query.workspaceId);
    }

    const costReportResult = await fetchFirstAvailable(
        ['/organizations/cost_report', '/organizations/cost_report/messages'],
        params,
    );

    let usageReportData: unknown | undefined;
    try {
        const usageResult = await fetchFirstAvailable(
            ['/organizations/usage_report/messages'],
            params,
        );
        usageReportData = usageResult.data;
    } catch {
        usageReportData = undefined;
    }

    const costByDate = aggregateCost(costReportResult.data as any);
    const usageByDate = usageReportData ? aggregateUsage(usageReportData as any) : new Map<string, AnthropicUsage>();

    const allDates = new Set<string>([
        ...costByDate.keys(),
        ...usageByDate.keys(),
    ]);

    const daily = [...allDates].sort().map((date) => ({
        date,
        costUSD: Number((costByDate.get(date) || 0).toFixed(6)),
        usage: usageByDate.get(date) || {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
        },
    }));

    const totals = daily.reduce(
        (acc, day) => {
            acc.costUSD += day.costUSD;
            acc.usage = mergeUsage(acc.usage, day.usage);
            return acc;
        },
        {
            costUSD: 0,
            usage: {
                input_tokens: 0,
                output_tokens: 0,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 0,
            } as AnthropicUsage,
        },
    );

    return {
        source: 'anthropic-admin-api',
        from: query.from,
        to: query.to,
        fetchedAt: new Date().toISOString(),
        totals: {
            costUSD: Number(totals.costUSD.toFixed(6)),
            usage: totals.usage,
        },
        daily,
        raw: {
            costReport: costReportResult.data,
            usageReport: usageReportData,
        },
    };
}

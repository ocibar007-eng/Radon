import { NextRequest, NextResponse } from 'next/server';
import {
    fetchAnthropicUsageCostSnapshot,
    isAnthropicAdminAvailable,
} from '@/adapters/anthropic/admin-cost';

type CacheEntry = {
    expiresAt: number;
    payload: Record<string, unknown>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    return { from, to };
}

function buildKey(from: string, to: string, workspaceId?: string): string {
    return `${from}_${to}_${workspaceId || 'default'}`;
}

export async function GET(request: NextRequest) {
    if (!isAnthropicAdminAvailable()) {
        return NextResponse.json(
            { error: 'ANTHROPIC_ADMIN_API_KEY not configured.' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const monthRange = getMonthRange();
    const from = searchParams.get('from') || monthRange.from;
    const to = searchParams.get('to') || monthRange.to;
    const workspaceId = searchParams.get('workspaceId') || undefined;

    const cacheKey = buildKey(from, to, workspaceId);
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({
            ...cached.payload,
            cache: { hit: true, ttlMs: CACHE_TTL_MS },
        });
    }

    try {
        const snapshot = await fetchAnthropicUsageCostSnapshot({ from, to, workspaceId }) as unknown as Record<string, unknown>;
        cache.set(cacheKey, {
            payload: snapshot,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return NextResponse.json({
            ...snapshot,
            cache: { hit: false, ttlMs: CACHE_TTL_MS },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: message },
            { status: 502 },
        );
    }
}

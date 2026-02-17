import {
  fetchAnthropicUsageCostSnapshot,
  isAnthropicAdminAvailable,
} from '../../src/adapters/anthropic/admin-cost.ts';

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

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!isAnthropicAdminAvailable()) {
    res.status(503).json({ error: 'ANTHROPIC_ADMIN_API_KEY not configured.' });
    return;
  }

  const monthRange = getMonthRange();
  const from = typeof req.query?.from === 'string' ? req.query.from : monthRange.from;
  const to = typeof req.query?.to === 'string' ? req.query.to : monthRange.to;
  const workspaceId = typeof req.query?.workspaceId === 'string' ? req.query.workspaceId : undefined;

  const key = buildKey(from, to, workspaceId);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200).json({
      ...cached.payload,
      cache: { hit: true, ttlMs: CACHE_TTL_MS },
    });
    return;
  }

  try {
    const snapshot = await fetchAnthropicUsageCostSnapshot({ from, to, workspaceId }) as unknown as Record<string, unknown>;
    cache.set(key, {
      payload: snapshot,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    res.status(200).json({
      ...snapshot,
      cache: { hit: false, ttlMs: CACHE_TTL_MS },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(502).json({ error: message });
  }
}

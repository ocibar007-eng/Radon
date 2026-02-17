import { getOpenAIDraftUsageComparison } from '../../src/server/openai-draft-usage-log.ts';

function toInteger(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const limit = Math.max(2, Math.min(200, toInteger(req.query?.limit, 20)));
    const payload = await getOpenAIDraftUsageComparison(limit);
    res.status(200).json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface OpenAIDraftUsageLogEntry {
  id: string;
  createdAt: string;
  mode: 'full' | 'correction' | 'audit';
  model: string;
  reasoningEffort: 'low' | 'medium' | 'high' | 'xhigh' | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  durationMs: number;
  costEstimateUSD: number;
  stopReason: string | null;
  truncated: boolean;
  includeAudit: boolean;
  correctionStrategy: 'light' | 'full';
}

export interface OpenAIDraftUsageComparison {
  current: OpenAIDraftUsageLogEntry;
  previous: OpenAIDraftUsageLogEntry;
  delta: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    durationMs: number;
    costEstimateUSD: number;
  };
}

function getUsageLogPath(): string {
  const configured = process.env.OPENAI_DRAFT_USAGE_LOG_PATH;
  if (configured && configured.trim()) {
    return path.resolve(configured.trim());
  }
  // Default outside project root to avoid triggering Vite live-reload on each log append.
  return path.resolve(os.tmpdir(), 'radon-lite', 'openai-draft-usage.jsonl');
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidEntry(value: any): value is OpenAIDraftUsageLogEntry {
  return Boolean(value)
    && typeof value.id === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.model === 'string';
}

export async function appendOpenAIDraftUsageLog(entry: OpenAIDraftUsageLogEntry): Promise<void> {
  const targetPath = getUsageLogPath();
  const dir = path.dirname(targetPath);
  const line = `${JSON.stringify(entry)}\n`;
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(targetPath, line, 'utf8');
}

export async function readOpenAIDraftUsageLogs(limit = 50): Promise<OpenAIDraftUsageLogEntry[]> {
  const targetPath = getUsageLogPath();
  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((item): item is OpenAIDraftUsageLogEntry => isValidEntry(item))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return entries.slice(0, Math.max(1, limit));
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function getOpenAIDraftUsageComparison(limit = 20): Promise<{
  entries: OpenAIDraftUsageLogEntry[];
  comparison: OpenAIDraftUsageComparison | null;
}> {
  const entries = await readOpenAIDraftUsageLogs(limit);
  if (entries.length < 2) {
    return { entries, comparison: null };
  }

  const current = entries[0];
  const previous = entries[1];
  return {
    entries,
    comparison: {
      current,
      previous,
      delta: {
        inputTokens: toNumber(current.inputTokens) - toNumber(previous.inputTokens),
        outputTokens: toNumber(current.outputTokens) - toNumber(previous.outputTokens),
        reasoningTokens: toNumber(current.reasoningTokens) - toNumber(previous.reasoningTokens),
        durationMs: toNumber(current.durationMs) - toNumber(previous.durationMs),
        costEstimateUSD: toNumber(current.costEstimateUSD) - toNumber(previous.costEstimateUSD),
      },
    },
  };
}

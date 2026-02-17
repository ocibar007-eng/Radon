/**
 * Draft Storage — Persistência local de estatísticas de custo.
 * Usa localStorage para acumular custos por dia/semana/mês.
 */

import { createEmptyDailyStats, type DailyStats } from './cost-tracker';

const STORAGE_KEY_PREFIX = 'radon_draft_stats_';
const ADMIN_SNAPSHOT_KEY = 'radon_anthropic_admin_snapshot';
const DRAFT_RUN_HISTORY_KEY = 'radon_openai_draft_run_history';
const DRAFT_RUN_HISTORY_MAX = 120;

function todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getDailyStats(date?: string): DailyStats {
    if (!hasLocalStorage()) {
        return createEmptyDailyStats(date ?? todayKey());
    }

    const key = `${STORAGE_KEY_PREFIX}${date ?? todayKey()}`;
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as DailyStats;
    } catch {
        // corrupted data, return empty
    }
    return createEmptyDailyStats(date ?? todayKey());
}

export function saveDailyStats(stats: DailyStats): void {
    if (!hasLocalStorage()) return;

    const key = `${STORAGE_KEY_PREFIX}${stats.date}`;
    try {
        localStorage.setItem(key, JSON.stringify(stats));
    } catch {
        // storage full, silently fail
    }
}

export function getWeeklyTotal(): number {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        total += getDailyStats(dateStr).totalCostUSD;
    }
    return total;
}

export function getMonthlyTotal(): number {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        total += getDailyStats(dateStr).totalCostUSD;
    }
    return total;
}

export interface AdminCostSnapshot {
    fetchedAt: number;
    from: string;
    to: string;
    totalCostUSD: number;
    totalInputTokens: number;
    totalOutputTokens: number;
}

export interface DraftRunSnapshot {
    id: string;
    createdAt: number;
    mode: 'full' | 'correction' | 'audit';
    modelUsed: string;
    reasoningEffort: 'low' | 'medium' | 'high' | 'xhigh' | null;
    tokensInput: number;
    tokensOutput: number;
    tokensReasoning: number;
    durationSeconds: number;
    costUSD: number;
    truncated: boolean;
    stopReason: string | null;
    reportChars: number;
    auditChars: number;
}

export function getAdminCostSnapshot(maxAgeMs = 5 * 60 * 1000): AdminCostSnapshot | null {
    if (!hasLocalStorage()) return null;
    try {
        const raw = localStorage.getItem(ADMIN_SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AdminCostSnapshot;
        if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
        if (Date.now() - parsed.fetchedAt > maxAgeMs) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveAdminCostSnapshot(snapshot: AdminCostSnapshot): void {
    if (!hasLocalStorage()) return;
    try {
        localStorage.setItem(ADMIN_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
        // ignore storage errors
    }
}

function parseRunHistory(raw: string | null): DraftRunSnapshot[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => item && typeof item.id === 'string');
    } catch {
        return [];
    }
}

export function getDraftRunHistory(limit = 25): DraftRunSnapshot[] {
    if (!hasLocalStorage()) return [];
    const history = parseRunHistory(localStorage.getItem(DRAFT_RUN_HISTORY_KEY));
    return history
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, Math.max(1, limit));
}

export function saveDraftRunSnapshot(snapshot: DraftRunSnapshot): void {
    if (!hasLocalStorage()) return;
    try {
        const history = parseRunHistory(localStorage.getItem(DRAFT_RUN_HISTORY_KEY));
        const next = [snapshot, ...history]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, DRAFT_RUN_HISTORY_MAX);
        localStorage.setItem(DRAFT_RUN_HISTORY_KEY, JSON.stringify(next));
    } catch {
        // ignore storage errors
    }
}

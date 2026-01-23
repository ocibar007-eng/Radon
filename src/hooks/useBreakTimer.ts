import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNow } from './useNow';

const STORAGE_KEY = 'radon.breakTimerEndAt';
const DURATION_KEY = 'radon.breakTimerDurationMs';
const DEFAULT_BREAK_MS = 90 * 60 * 1000;
const SNOOZE_MS = 10 * 60 * 1000;

const readStoredEndAt = () => {
  if (typeof window === 'undefined') return Date.now() + DEFAULT_BREAK_MS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return Date.now() + DEFAULT_BREAK_MS;
};

const readStoredDuration = () => {
  if (typeof window === 'undefined') return DEFAULT_BREAK_MS;
  const raw = window.localStorage.getItem(DURATION_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_BREAK_MS;
};

export function useBreakTimer() {
  const now = useNow(1000);
  const [endAt, setEndAt] = useState(readStoredEndAt);
  const [durationMs, setDurationMs] = useState(readStoredDuration);
  const [promptForEndAt, setPromptForEndAt] = useState<number | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(endAt));
  }, [endAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DURATION_KEY, String(durationMs));
  }, [durationMs]);

  useEffect(() => {
    if (now >= endAt && promptForEndAt !== endAt) {
      setPromptForEndAt(endAt);
      setIsPromptOpen(true);
    }
  }, [now, endAt, promptForEndAt]);

  const setNextEndAt = useCallback((durationMs: number) => {
    const nextEndAt = Date.now() + durationMs;
    setEndAt(nextEndAt);
    setPromptForEndAt(null);
    setIsPromptOpen(false);
  }, []);

  const snooze = useCallback(() => {
    setNextEndAt(SNOOZE_MS);
  }, [setNextEndAt]);

  const continueCycle = useCallback(() => {
    setNextEndAt(durationMs);
  }, [setNextEndAt, durationMs]);

  const setDuration = useCallback((nextDurationMs: number) => {
    setDurationMs(nextDurationMs);
    setNextEndAt(nextDurationMs);
  }, [setNextEndAt]);

  const remainingMs = useMemo(() => Math.max(0, endAt - now), [endAt, now]);

  return {
    remainingMs,
    endAt,
    durationMs,
    isPromptOpen,
    snooze,
    continueCycle,
    setDuration
  };
}

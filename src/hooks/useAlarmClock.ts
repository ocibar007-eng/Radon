import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNow } from './useNow';
import { playAlarmSound, warmUpAudio } from '../utils/sounds';

const STORAGE_KEY = 'radon.alarmAt';
const SNOOZE_MS = 10 * 60 * 1000;

const readStoredAlarmAt = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (parsed < Date.now() - 1000) return null;
  return parsed;
};

export function useAlarmClock() {
  const now = useNow(1000);
  const [alarmAt, setAlarmAt] = useState<number | null>(readStoredAlarmAt);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const lastTriggeredRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (alarmAt) {
      window.localStorage.setItem(STORAGE_KEY, String(alarmAt));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [alarmAt]);

  useEffect(() => {
    if (!alarmAt) {
      setIsPromptOpen(false);
      lastTriggeredRef.current = null;
      return;
    }

    if (now >= alarmAt && lastTriggeredRef.current !== alarmAt) {
      lastTriggeredRef.current = alarmAt;
      setIsPromptOpen(true);
      playAlarmSound();
    }
  }, [now, alarmAt]);

  const setAlarmIn = useCallback((durationMs: number) => {
    const nextAt = Date.now() + durationMs;
    setAlarmAt(nextAt);
    lastTriggeredRef.current = null;
    setIsPromptOpen(false);
    warmUpAudio();
  }, []);

  const setAlarmAtTime = useCallback((nextAt: number) => {
    setAlarmAt(nextAt);
    lastTriggeredRef.current = null;
    setIsPromptOpen(false);
    warmUpAudio();
  }, []);

  const clearAlarm = useCallback(() => {
    setAlarmAt(null);
    lastTriggeredRef.current = null;
    setIsPromptOpen(false);
  }, []);

  const snooze = useCallback(() => {
    setAlarmIn(SNOOZE_MS);
  }, [setAlarmIn]);

  const remainingMs = useMemo(() => {
    if (!alarmAt) return null;
    return Math.max(0, alarmAt - now);
  }, [alarmAt, now]);

  const alarmLabel = useMemo(() => {
    if (!alarmAt) return null;
    return new Date(alarmAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [alarmAt]);

  return {
    alarmAt,
    alarmLabel,
    remainingMs,
    isPromptOpen,
    setAlarmIn,
    setAlarmAtTime,
    clearAlarm,
    snooze
  };
}

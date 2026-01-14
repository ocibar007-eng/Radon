import { useState, useEffect, useCallback } from 'react';
import { BatchSession, BatchFile, SortMethod } from '../types';
import { sortFiles, enumerateFiles } from '../core/sorting';

const STORAGE_KEYS = {
  SESSIONS: 'ocr-batch-sessions',
  ACTIVE_SESSION: 'ocr-batch-active-session'
};

interface UseSessionManagerReturn {
  sessions: BatchSession[];
  activeSessionId: string;
  activeSession: BatchSession | undefined;
  files: BatchFile[];
  isProcessing: boolean;
  createSession: (name?: string, initialFiles?: BatchFile[]) => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  switchSession: (id: string) => void;
  updateSessionFiles: (sessionId: string, files: BatchFile[]) => void;
  updateFiles: (updater: (files: BatchFile[]) => BatchFile[]) => void;
  setSessions: (value: BatchSession[] | ((prev: BatchSession[]) => BatchSession[])) => void;
  setActiveSessionId: (value: string | ((prev: string) => string)) => void;
}

export const useSessionManager = (): UseSessionManagerReturn => {
  // --- STATE: SESSIONS (with LocalStorage persistence) ---
  const [sessions, setSessions] = useState<BatchSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore sessions but clear files (File objects can't be serialized)
        return parsed.map((s: any) => ({
          ...s,
          files: [],
          status: 'idle',
          progress: { current: 0, total: 0 }
        }));
      }
    } catch (e) {
      console.warn('Failed to restore sessions from localStorage', e);
    }
    return [{
      id: 'default',
      name: 'Lote Principal',
      createdAt: Date.now(),
      files: [],
      progress: { current: 0, total: 0 },
      status: 'idle'
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return saved || 'default';
  });

  // Safe Active Session Resolution
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const files = activeSession?.files || [];
  const isProcessing = activeSession?.status === 'processing';

  // Sync activeSessionId if invalid
  useEffect(() => {
    if (sessions.length > 0 && !sessions.find(s => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Persist sessions to LocalStorage (only metadata, not files)
  useEffect(() => {
    const toSave = sessions.map(s => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt
    }));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(toSave));
  }, [sessions]);

  // Persist active session ID
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, activeSessionId);
  }, [activeSessionId]);

  // --- SESSION CRUD OPERATIONS ---

  const createSession = useCallback((name?: string, initialFiles: BatchFile[] = []): string => {
    const newId = crypto.randomUUID();
    const newSession: BatchSession = {
      id: newId,
      name: name || `Lote ${sessions.length + 1}`,
      createdAt: Date.now(),
      files: initialFiles,
      progress: { current: 0, total: initialFiles.length },
      status: 'idle'
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
    return newId;
  }, [sessions.length]);

  const deleteSession = useCallback((id: string) => {
    setSessions(currentSessions => {
      const updated = currentSessions.filter(s => s.id !== id);

      // If no sessions left, create a default one
      if (updated.length === 0) {
        const defaultSession: BatchSession = {
          id: crypto.randomUUID(),
          name: 'Lote Principal',
          createdAt: Date.now(),
          files: [],
          progress: { current: 0, total: 0 },
          status: 'idle'
        };
        return [defaultSession];
      }

      return updated;
    });
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const updateSessionFiles = useCallback((sessionId: string, files: BatchFile[]) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, files } : s
    ));
  }, []);

  const updateFiles = useCallback((updater: (files: BatchFile[]) => BatchFile[]) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId ? { ...s, files: updater(s.files) } : s
    ));
  }, [activeSessionId]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    files,
    isProcessing,
    createSession,
    deleteSession,
    renameSession,
    switchSession,
    updateSessionFiles,
    updateFiles,
    setSessions,
    setActiveSessionId
  };
};

import { useState, useEffect, useCallback } from 'react';
import { BatchSession, BatchFile, ProcessStatus } from '@/types';

const STORAGE_KEYS = {
    SESSIONS: 'ocr-batch-sessions',
    ACTIVE_SESSION: 'ocr-batch-active-session'
};

const createDefaultSession = (): BatchSession => ({
    id: 'default',
    name: 'Lote Principal',
    createdAt: Date.now(),
    files: [],
    progress: { current: 0, total: 0 },
    status: 'idle'
});

export interface UseSessionsReturn {
    sessions: BatchSession[];
    activeSessionId: string;
    activeSession: BatchSession;
    files: BatchFile[];
    isProcessing: boolean;

    // Session actions
    setActiveSessionId: (id: string) => void;
    createSession: (name: string, files?: BatchFile[]) => string;
    deleteSession: (id: string) => void;
    renameSession: (id: string, newName: string) => void;

    // File actions
    addFiles: (sessionId: string, files: BatchFile[]) => void;
    removeFile: (sessionId: string, fileId: string) => void;
    updateFile: (sessionId: string, fileId: string, updates: Partial<BatchFile>) => void;
    updateFiles: (sessionId: string, updater: (files: BatchFile[]) => BatchFile[]) => void;
    clearFiles: (sessionId: string) => void;

    // Processing
    setSessionStatus: (sessionId: string, status: BatchSession['status']) => void;
    setSessionProgress: (sessionId: string, current: number, total: number) => void;
}

export const useSessions = (): UseSessionsReturn => {
    // Initialize sessions from localStorage
    const [sessions, setSessions] = useState<BatchSession[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map((s: any) => ({
                    ...s,
                    files: [],
                    status: 'idle',
                    progress: { current: 0, total: 0 }
                }));
            }
        } catch (e) { }
        return [createDefaultSession()];
    });

    // Initialize active session
    const [activeSessionId, setActiveSessionId] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        return saved || 'default';
    });

    // Derived state
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const files = activeSession?.files || [];
    const isProcessing = activeSession?.status === 'processing';

    // Sync activeSessionId if invalid
    useEffect(() => {
        if (sessions.length > 0 && !sessions.find(s => s.id === activeSessionId)) {
            setActiveSessionId(sessions[0].id);
        }
    }, [sessions, activeSessionId]);

    // Persist sessions metadata to localStorage (without files)
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

    // Session actions
    const createSession = useCallback((name: string, files: BatchFile[] = []): string => {
        const id = `session-${Date.now()}`;
        setSessions(prev => [...prev, {
            id,
            name,
            createdAt: Date.now(),
            files,
            progress: { current: 0, total: files.length },
            status: 'idle'
        }]);
        setActiveSessionId(id);
        return id;
    }, []);

    const deleteSession = useCallback((id: string) => {
        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);
            return filtered.length > 0 ? filtered : [createDefaultSession()];
        });
    }, []);

    const renameSession = useCallback((id: string, newName: string) => {
        setSessions(prev => prev.map(s =>
            s.id === id ? { ...s, name: newName } : s
        ));
    }, []);

    // File actions
    const addFiles = useCallback((sessionId: string, newFiles: BatchFile[]) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const updatedFiles = [...s.files, ...newFiles];
            return {
                ...s,
                files: updatedFiles,
                progress: { ...s.progress, total: updatedFiles.length }
            };
        }));
    }, []);

    const removeFile = useCallback((sessionId: string, fileId: string) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, files: s.files.filter(f => f.id !== fileId) };
        }));
    }, []);

    const updateFile = useCallback((sessionId: string, fileId: string, updates: Partial<BatchFile>) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                files: s.files.map(f => f.id === fileId ? { ...f, ...updates } : f)
            };
        }));
    }, []);

    const updateFiles = useCallback((sessionId: string, updater: (files: BatchFile[]) => BatchFile[]) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, files: updater(s.files) };
        }));
    }, []);

    const clearFiles = useCallback((sessionId: string) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, files: [], progress: { current: 0, total: 0 } };
        }));
    }, []);

    // Processing
    const setSessionStatus = useCallback((sessionId: string, status: BatchSession['status']) => {
        setSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, status } : s
        ));
    }, []);

    const setSessionProgress = useCallback((sessionId: string, current: number, total: number) => {
        setSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, progress: { current, total } } : s
        ));
    }, []);

    return {
        sessions,
        activeSessionId,
        activeSession,
        files,
        isProcessing,
        setActiveSessionId,
        createSession,
        deleteSession,
        renameSession,
        addFiles,
        removeFile,
        updateFile,
        updateFiles,
        clearFiles,
        setSessionStatus,
        setSessionProgress
    };
};

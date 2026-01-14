import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '@/hooks/useSessionManager';

// Mock LocalStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSessionManager hook', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should initialize with a default session', () => {
        const { result } = renderHook(() => useSessionManager());

        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].name).toBe('Lote Principal');
        expect(result.current.activeSessionId).toBe(result.current.sessions[0].id);
    });

    it('should create a new session', () => {
        const { result } = renderHook(() => useSessionManager());

        act(() => {
            const newId = result.current.createSession('Lote 2');
            expect(newId).toBeDefined();
        });

        expect(result.current.sessions).toHaveLength(2);
        expect(result.current.sessions[1].name).toBe('Lote 2');
        expect(result.current.activeSessionId).toBe(result.current.sessions[1].id);
    });

    it('should delete a session and fallback to default if empty', () => {
        const { result } = renderHook(() => useSessionManager());
        const firstSessionId = result.current.activeSessionId;

        act(() => {
            result.current.deleteSession(firstSessionId);
        });

        // Should have created a new default one
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].id).not.toBe(firstSessionId);
    });

    it('should rename a session', () => {
        const { result } = renderHook(() => useSessionManager());
        const id = result.current.activeSessionId;

        act(() => {
            result.current.renameSession(id, 'Novo Nome');
        });

        expect(result.current.activeSession?.name).toBe('Novo Nome');
    });

    it('should persist sessions to localStorage (metadata only)', () => {
        const { result } = renderHook(() => useSessionManager());
        const id = result.current.activeSessionId;

        act(() => {
            result.current.renameSession(id, 'Persistido');
        });

        const saved = JSON.parse(localStorage.getItem('ocr-batch-sessions')!);
        expect(saved[0].name).toBe('Persistido');
    });
});

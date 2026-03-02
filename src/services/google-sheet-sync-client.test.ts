import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mirrorFinalizeToGoogleSheet } from './google-sheet-sync-client';

describe('google-sheet-sync-client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    (globalThis as any).fetch = originalFetch;
  });

  it('retorna ok quando a API responde sucesso', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    (globalThis as any).fetch = fetchMock;

    const result = await mirrorFinalizeToGoogleSheet('p1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('faz retry curto em erro 5xx e recupera', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => JSON.stringify({ error: 'bad gateway' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      });
    (globalThis as any).fetch = fetchMock;

    const promise = mirrorFinalizeToGoogleSheet('p2');
    await vi.advanceTimersByTimeAsync(650);
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('não faz retry em erro funcional 422', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ error: 'not linked' }),
    });
    (globalThis as any).fetch = fetchMock;

    const result = await mirrorFinalizeToGoogleSheet('p3');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
    expect(result.error).toBe('not linked');
  });
});

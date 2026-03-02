export type MirrorFinalizeResult = {
  ok: boolean;
  status: number;
  error?: string;
  details?: any;
};

const API_URL = '/api/worklist/google-sheet/finalize';

async function attemptMirror(patientId: string): Promise<MirrorFinalizeResult> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId }),
    });

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.error || `HTTP ${response.status}`,
        details: payload,
      };
    }

    return {
      ok: Boolean(payload?.ok),
      status: response.status,
      error: payload?.ok ? undefined : (payload?.error || 'Mirror finalize failed'),
      details: payload,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      error: error?.message || String(error),
    };
  }
}

export async function mirrorFinalizeToGoogleSheet(patientId: string): Promise<MirrorFinalizeResult> {
  const first = await attemptMirror(patientId);
  if (first.ok) return first;

  // Retry curto para falhas transitórias de rede/API.
  const shouldRetry = first.status === 0 || (first.status >= 500 && first.status < 600);
  if (!shouldRetry) return first;

  await new Promise((resolve) => setTimeout(resolve, 600));
  return attemptMirror(patientId);
}

import {
  getPatientDocById,
  isFirebaseServerConfigured,
  markFinalizeMirrored,
  normalizeExternalKey,
} from './_firebase.js';

type JsonBody = Record<string, any>;

function parseBody(req: any): JsonBody | null {
  if (req.body && typeof req.body === 'object') return req.body as JsonBody;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as JsonBody;
    } catch {
      return null;
    }
  }
  return null;
}

async function callSheetMirror(externalKey: string, patientId: string) {
  const mirrorUrl = String(process.env.RADON_SHEET_MIRROR_URL || '').trim();
  const mirrorToken = String(process.env.RADON_SHEET_MIRROR_TOKEN || '').trim();

  if (!mirrorUrl) {
    return {
      ok: false,
      status: 503,
      error: 'RADON_SHEET_MIRROR_URL is not configured on server.',
    };
  }

  try {
    const response = await fetch(mirrorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mirror_finalize',
        token: mirrorToken,
        externalKey,
        patientId,
        finalizedAt: new Date().toISOString(),
      }),
    });

    const rawText = await response.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Mirror endpoint HTTP ${response.status}`,
        details: rawText.slice(0, 1000),
      };
    }

    if (!parsed?.ok) {
      return {
        ok: false,
        status: 409,
        error: parsed?.error || 'Mirror endpoint returned not-ok payload.',
        details: parsed,
      };
    }

    return {
      ok: true,
      status: 200,
      data: parsed,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 502,
      error: error?.message || String(error),
    };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!isFirebaseServerConfigured()) {
    res.status(503).json({ error: 'Firebase config missing on server (FIREBASE_*).' });
    return;
  }

  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const patientId = String(body.patientId || '').trim();
  if (!patientId) {
    res.status(400).json({ error: 'patientId is required' });
    return;
  }

  const patient = await getPatientDocById(patientId);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  const integrationSource = String(patient.integrationSource || '').trim();
  if (!integrationSource.startsWith('google_sheet_v3')) {
    res.status(422).json({ error: 'Patient is not linked to Google Sheet integration' });
    return;
  }

  const externalKey = normalizeExternalKey(String(patient.integrationExternalKey || '').trim());
  if (!externalKey) {
    res.status(422).json({ error: 'Patient missing integrationExternalKey' });
    return;
  }

  const mirror = await callSheetMirror(externalKey, patientId);
  if (!mirror.ok) {
    res.status(mirror.status).json({ ok: false, error: mirror.error, details: mirror.details || null });
    return;
  }

  await markFinalizeMirrored(patientId);

  res.status(200).json({
    ok: true,
    patientId,
    externalKey,
    mirror: mirror.data,
  });
}

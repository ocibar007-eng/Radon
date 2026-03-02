import {
  archiveGoogleSheetPatientByExternalKey,
  GoogleSheetSyncRecord,
  isFirebaseServerConfigured,
  normalizeExternalKey,
  parseBool,
  reconcileGoogleSheetSnapshot,
  upsertGoogleSheetPatient,
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

function requireSyncToken(req: any, res: any): boolean {
  const required = process.env.RADON_SYNC_TOKEN;
  if (!required) return true;

  const provided = String(req.headers?.['x-radon-sync-token'] || '').trim();
  if (!provided || provided !== required) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function validateRecord(raw: any): GoogleSheetSyncRecord {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Record must be an object');
  }

  const externalKey = normalizeExternalKey(raw.externalKey || raw.key || '');
  if (!externalKey) {
    throw new Error('Record missing valid externalKey');
  }

  return {
    externalKey,
    os: String(raw.os || '').trim(),
    patientName: String(raw.patientName || raw.paciente || '').trim(),
    examType: String(raw.examType || raw.procedimento || '').trim(),
    examDate: String(raw.examDate || raw.dataExame || '').trim(),
    doctor: String(raw.doctor || raw.medico || '').trim(),
    worklistStatus: String(raw.worklistStatus || raw.status || '').trim(),
    priority: String(raw.priority || raw.prioridade || '').trim(),
    sheetRow: Number(raw.sheetRow || 0) || undefined,
    eligible: parseBool(raw.eligible),
    reason: String(raw.reason || '').trim(),
  };
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!requireSyncToken(req, res)) return;

  if (!isFirebaseServerConfigured()) {
    res.status(503).json({ error: 'Firebase config missing on server (FIREBASE_*).' });
    return;
  }

  const body = parseBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const source = String(body.source || 'google_sheet_v3').trim() || 'google_sheet_v3';
  const reason = String(body.reason || 'sheet_webhook').trim() || 'sheet_webhook';
  const rawSnapshotKeys = Array.isArray(body.presentExternalKeys) ? body.presentExternalKeys : null;
  const rawRecords = Array.isArray(body.records) ? body.records : null;

  if (rawSnapshotKeys) {
    const normalizedKeys: string[] = [];
    for (const raw of rawSnapshotKeys) {
      const key = normalizeExternalKey(String(raw || ''));
      if (key) normalizedKeys.push(key);
    }

    const reconcile = await reconcileGoogleSheetSnapshot(normalizedKeys, reason || 'sheet_snapshot_reconcile');
    const statusCode = reconcile.errors.length ? 207 : 200;
    res.status(statusCode).json({
      ok: reconcile.errors.length === 0,
      summary: {
        source,
        reason,
        presentKeys: new Set(normalizedKeys).size,
        ...reconcile,
      },
    });
    return;
  }

  if (!rawRecords || rawRecords.length === 0) {
    res.status(400).json({ error: 'records[] is required (or presentExternalKeys[])' });
    return;
  }

  const records: GoogleSheetSyncRecord[] = [];
  try {
    for (const raw of rawRecords) {
      records.push(validateRecord(raw));
    }
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid record payload', details: error?.message || String(error) });
    return;
  }

  const summary = {
    source,
    reason,
    received: records.length,
    processed: 0,
    upserts: 0,
    inserts: 0,
    updates: 0,
    reactivations: 0,
    archives: 0,
    alreadyArchived: 0,
    skipped: 0,
    notFoundToArchive: 0,
    errors: [] as string[],
  };

  for (const record of records) {
    try {
      if (record.eligible) {
        const result = await upsertGoogleSheetPatient(record, source, reason);
        summary.processed += 1;
        summary.upserts += 1;
        if (result.action === 'inserted') summary.inserts += 1;
        if (result.action === 'updated') summary.updates += 1;
        if (result.action === 'reactivated') summary.reactivations += 1;
      } else {
        const result = await archiveGoogleSheetPatientByExternalKey(record.externalKey, reason);
        summary.processed += 1;
        if (result.action === 'archived') summary.archives += 1;
        else if (result.action === 'already_archived') summary.alreadyArchived += 1;
        else if (result.action === 'not_found') summary.notFoundToArchive += 1;
        else summary.skipped += 1;
      }
    } catch (error: any) {
      summary.errors.push(`${record.externalKey}: ${error?.message || String(error)}`);
    }
  }

  const statusCode = summary.errors.length ? 207 : 200;
  res.status(statusCode).json({ ok: summary.errors.length === 0, summary });
}

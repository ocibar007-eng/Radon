import crypto from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore/lite';

export type GoogleSheetSyncRecord = {
  externalKey: string;
  os?: string;
  patientName?: string;
  examType?: string;
  examDate?: string;
  doctor?: string;
  worklistStatus?: string;
  priority?: string;
  sheetRow?: number;
  eligible: boolean;
  reason?: string;
};

const COLLECTION = 'patients';

const stripUndefined = (input: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out;
};

const normalizePart = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const normalizeExternalKey = (raw: string): string => {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (!value.includes('::')) {
    return normalizePart(value);
  }

  const [osRaw, ...procParts] = value.split('::');
  const os = normalizePart(osRaw || '');
  const proc = normalizePart(procParts.join('::') || '');
  if (!os || !proc) return '';
  return `${os}::${proc}`;
};

export const parseBool = (value: unknown): boolean => {
  if (value === true || value === false) return value;
  const s = String(value ?? '').trim().toUpperCase();
  return s === '1' || s === 'TRUE' || s === 'VERDADEIRO' || s === 'SIM' || s === 'YES';
};

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseServerConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
};

const getDb = () => {
  if (!isFirebaseServerConfigured()) {
    throw new Error('Firebase server config missing (FIREBASE_* env vars).');
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
};

export const deriveGoogleSheetPatientId = (externalKey: string): string => {
  const normalized = normalizeExternalKey(externalKey);
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 24);
  return `gs_${hash}`;
};

export type PatientDoc = Record<string, any> | null;

export const getPatientDocById = async (patientId: string): Promise<PatientDoc> => {
  const db = getDb();
  const ref = doc(db, COLLECTION, patientId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Record<string, any>;
};

export const upsertGoogleSheetPatient = async (
  record: GoogleSheetSyncRecord,
  source: string,
  reason: string
): Promise<{ patientId: string; action: 'inserted' | 'updated' | 'reactivated' }> => {
  const db = getDb();
  const externalKey = normalizeExternalKey(record.externalKey);
  if (!externalKey) {
    throw new Error('Invalid externalKey');
  }

  const patientId = deriveGoogleSheetPatientId(externalKey);
  const ref = doc(db, COLLECTION, patientId);
  const existingSnap = await getDoc(ref);
  const existing = existingSnap.exists() ? (existingSnap.data() as Record<string, any>) : null;
  const now = Date.now();

  const wasArchived = Boolean(existing?.deletedAt);
  const action: 'inserted' | 'updated' | 'reactivated' = !existing
    ? 'inserted'
    : wasArchived
      ? 'reactivated'
      : 'updated';

  const status = (() => {
    if (!existing) return 'waiting';
    const curr = String(existing.status || '').trim();
    if (!curr || curr === 'done') return 'waiting';
    return curr;
  })();

  await setDoc(
    ref,
    stripUndefined({
      id: patientId,
      name: String(record.patientName || existing?.name || 'Sem Nome').trim() || 'Sem Nome',
      os: String(record.os || existing?.os || '').trim(),
      examType: String(record.examType || existing?.examType || 'Não especificado').trim() || 'Não especificado',
      examDate: String(record.examDate || existing?.examDate || '').trim() || undefined,
      status,
      createdAt: Number(existing?.createdAt || now),
      updatedAt: now,
      deletedAt: null,
      docsCount: Number(existing?.docsCount || 0),
      audioCount: Number(existing?.audioCount || 0),
      hasClinicalSummary: Boolean(existing?.hasClinicalSummary || false),
      hasAttachments: Boolean(existing?.hasAttachments || false),
      finalized: Boolean(existing?.finalized || false),
      integrationSource: 'google_sheet_v3',
      integrationExternalKey: externalKey,
      integrationSheetRow: Number(record.sheetRow || existing?.integrationSheetRow || 0) || undefined,
      integrationLastSyncAt: now,
      integrationLastReason: reason,
      integrationLastDoctor: String(record.doctor || '').trim(),
      integrationLastStatus: String(record.worklistStatus || '').trim(),
      integrationLastPriority: String(record.priority || '').trim(),
      integrationOrigin: source,
    }),
    { merge: true }
  );

  return { patientId, action };
};

export const archiveGoogleSheetPatientByExternalKey = async (
  externalKeyRaw: string,
  reason: string
): Promise<{ patientId: string; action: 'archived' | 'already_archived' | 'ignored_not_integrated' | 'not_found' }> => {
  const db = getDb();
  const externalKey = normalizeExternalKey(externalKeyRaw);
  if (!externalKey) {
    throw new Error('Invalid externalKey');
  }

  const patientId = deriveGoogleSheetPatientId(externalKey);
  const ref = doc(db, COLLECTION, patientId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { patientId, action: 'not_found' };
  }

  const current = snap.data() as Record<string, any>;
  const source = String(current.integrationSource || '').trim();
  if (!source.startsWith('google_sheet_v3')) {
    return { patientId, action: 'ignored_not_integrated' };
  }

  if (current.deletedAt) {
    await updateDoc(ref, {
      integrationLastSyncAt: Date.now(),
      integrationLastReason: reason,
    });
    return { patientId, action: 'already_archived' };
  }

  await updateDoc(ref, {
    deletedAt: Date.now(),
    status: 'done',
    updatedAt: Date.now(),
    integrationLastSyncAt: Date.now(),
    integrationLastReason: reason,
  });
  return { patientId, action: 'archived' };
};

export const markFinalizeMirrored = async (patientId: string): Promise<void> => {
  const db = getDb();
  const ref = doc(db, COLLECTION, patientId);
  await updateDoc(ref, {
    integrationFinalizeMirroredAt: Date.now(),
    integrationLastSyncAt: Date.now(),
    updatedAt: Date.now(),
  });
};

export const reconcileGoogleSheetSnapshot = async (
  presentExternalKeysRaw: string[],
  reason: string
): Promise<{
  checked: number;
  present: number;
  missing: number;
  archived: number;
  alreadyArchived: number;
  missingIntegrationKey: number;
  errors: string[];
}> => {
  const db = getDb();
  const presentSet = new Set<string>();
  for (const raw of presentExternalKeysRaw || []) {
    const key = normalizeExternalKey(String(raw || ''));
    if (key) presentSet.add(key);
  }

  const q = query(collection(db, COLLECTION), where('integrationSource', '==', 'google_sheet_v3'));
  const snap = await getDocs(q);

  const summary = {
    checked: 0,
    present: 0,
    missing: 0,
    archived: 0,
    alreadyArchived: 0,
    missingIntegrationKey: 0,
    errors: [] as string[],
  };

  for (const item of snap.docs) {
    summary.checked += 1;
    const current = item.data() as Record<string, any>;
    const externalKey = normalizeExternalKey(String(current.integrationExternalKey || ''));

    if (!externalKey) {
      summary.missingIntegrationKey += 1;
      continue;
    }

    if (presentSet.has(externalKey)) {
      summary.present += 1;
      continue;
    }

    summary.missing += 1;
    if (current.deletedAt) {
      summary.alreadyArchived += 1;
      continue;
    }

    try {
      const now = Date.now();
      await updateDoc(item.ref, {
        deletedAt: now,
        status: 'done',
        updatedAt: now,
        integrationLastSyncAt: now,
        integrationLastReason: reason || 'snapshot_reconcile',
      });
      summary.archived += 1;
    } catch (error: any) {
      summary.errors.push(`${item.id}: ${error?.message || String(error)}`);
    }
  }

  return summary;
};

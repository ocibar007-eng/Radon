import { AppSession } from '../types';

function sanitizeUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:')) return '';
  return url;
}

export function buildSessionSnapshot(session: AppSession): Partial<AppSession> {
  return {
    patientId: session.patientId,
    patient: session.patient,
    clinicalMarkdown: session.clinicalMarkdown,
    clinicalSummaryData: session.clinicalSummaryData,
    checklistMarkdown: session.checklistMarkdown,
    checklistData: session.checklistData,
    checklistQuery: session.checklistQuery,
    headerImage: session.headerImage
      ? { ...session.headerImage, file: undefined, previewUrl: sanitizeUrl(session.headerImage.previewUrl) }
      : null,
    docs: session.docs.map(d => ({
      ...d,
      file: undefined,
      previewUrl: sanitizeUrl(d.previewUrl)
    })),
    audioJobs: session.audioJobs.map(j => ({ ...j, blob: undefined }))
  };
}

/**
 * Snapshot COMPLETO para IndexedDB (mantém Blobs/Files).
 * Essencial para "Resumir Sessão Anterior" após um crash.
 */
export function buildPersistentSnapshot(session: AppSession): AppSession {
  return {
    ...session
    // Dexie suporta Blobs/Files nativamente no IndexedDB.
  };
}

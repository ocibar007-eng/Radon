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

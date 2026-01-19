import { useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { StorageService } from '../services/storage-service';
import { PatientService } from '../services/patient-service';
import { buildSessionSnapshot } from '../utils/session-persistence';
import * as PipelineActions from '../core/pipeline-actions';
import { AppSession, AudioJob } from '../types';

type Options = {
  activePatientId?: string | null;
  allowActivePatient?: boolean;
  intervalMs?: number;
};

const DEFAULT_INTERVAL_MS = 5000;

function updateAudioJob(session: AppSession, jobId: string, updates: Partial<AudioJob>): AppSession {
  return {
    ...session,
    audioJobs: session.audioJobs.map(job =>
      job.id === jobId ? { ...job, ...updates } : job
    )
  };
}

async function resolveAudioBlob(job: AudioJob): Promise<Blob | null> {
  if (job.blob) return job.blob;
  if (!job.storageUrl) return null;

  const response = await fetch(job.storageUrl);
  if (!response.ok) return null;
  return response.blob();
}

async function persistSession(sessionId: string, session: AppSession) {
  try {
    await StorageService.saveSession(sessionId, session);

    if (session.patientId && session.patientId === sessionId) {
      const snapshot = buildSessionSnapshot(session);
      await PatientService.saveWorkspaceState(sessionId, snapshot);
    }
  } catch (error) {
    console.warn('[BackgroundAudio] Persist failed', error);
  }
}

export function useBackgroundAudioTranscription({
  activePatientId = null,
  allowActivePatient = false,
  intervalMs = DEFAULT_INTERVAL_MS
}: Options = {}) {
  const { session, dispatch } = useSession();
  const activePatientRef = useRef<string | null>(activePatientId);
  const allowActiveRef = useRef(allowActivePatient);
  const sessionRef = useRef(session);
  const runningRef = useRef(false);
  const jobLocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activePatientRef.current = activePatientId ?? null;
  }, [activePatientId]);

  useEffect(() => {
    allowActiveRef.current = allowActivePatient;
  }, [allowActivePatient]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const processNextJob = async () => {
      const sessions = await StorageService.listSessions();
      const activeId = activePatientRef.current;
      const allowActive = allowActiveRef.current;

      for (const stored of sessions) {
        const { id, updatedAt: _updatedAt, ...sessionData } = stored;
        const normalizedSession = sessionData.patientId || id === 'local-draft'
          ? sessionData
          : { ...sessionData, patientId: id };

        const pendingJob = normalizedSession.audioJobs.find(
          job => job.status === 'processing' && !jobLocksRef.current.has(job.id)
        );

        if (!pendingJob) continue;

        const isActiveSession = !!activeId && id === activeId;
        if (isActiveSession && !allowActive && pendingJob.blob) {
          continue;
        }

        jobLocksRef.current.add(pendingJob.id);

        try {
          const blob = await resolveAudioBlob(pendingJob);
          if (!blob) {
            const updates = { status: 'error', transcriptRaw: 'Audio indisponivel.' };
            const updatedSession = updateAudioJob(normalizedSession, pendingJob.id, updates);
            await persistSession(id, updatedSession);
            if (!cancelled && sessionRef.current.patientId === id) {
              dispatch({ type: 'UPDATE_AUDIO_JOB', payload: { id: pendingJob.id, updates } });
            }
            return;
          }

          const result = await PipelineActions.processAudio(blob);
          const updates = {
            status: 'done' as const,
            transcriptRaw: result.transcriptRaw,
            transcriptRows: result.transcriptRows,
            blob: pendingJob.blob ?? blob
          };
          const updatedSession = updateAudioJob(normalizedSession, pendingJob.id, updates);
          await persistSession(id, updatedSession);

          if (!cancelled && sessionRef.current.patientId === id) {
            dispatch({ type: 'UPDATE_AUDIO_JOB', payload: { id: pendingJob.id, updates } });
          }
          return;
        } catch (error) {
          const updates = { status: 'error', transcriptRaw: 'Erro na transcricao.' };
          const updatedSession = updateAudioJob(normalizedSession, pendingJob.id, updates);
          await persistSession(id, updatedSession);
          if (!cancelled && sessionRef.current.patientId === id) {
            dispatch({ type: 'UPDATE_AUDIO_JOB', payload: { id: pendingJob.id, updates } });
          }
          return;
        } finally {
          jobLocksRef.current.delete(pendingJob.id);
        }
      }
    };

    const tick = async () => {
      if (cancelled || runningRef.current) return;
      runningRef.current = true;
      try {
        await processNextJob();
      } finally {
        runningRef.current = false;
      }
    };

    tick();
    const interval = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dispatch, intervalMs]);
}

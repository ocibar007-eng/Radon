import { useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { PatientService } from '../services/patient-service';
import { StorageService } from '../services/storage-service';
import { buildSessionSnapshot, buildPersistentSnapshot } from '../utils/session-persistence';

export const STORAGE_KEY = 'assistente_laudos_session_v1';

export function usePersistence(patientId?: string, isHydrating: boolean = false) {
  const { session } = useSession();
  const lastSavedJson = useRef<string>('');

  useEffect(() => {
    if (isHydrating) return;

    const timeout = setTimeout(async () => {
      try {
        const snapshotCloud = buildSessionSnapshot(session);
        const snapshotFull = buildPersistentSnapshot(session);
        const jsonString = JSON.stringify(snapshotCloud);

        if (jsonString === lastSavedJson.current) return;

        // 1. Persistência de Emergência (IndexedDB) - SEMPRE SALVA LOCALMENTE COM BINARIOS
        const localId = patientId || 'local-draft';
        await StorageService.saveSession(localId, snapshotFull);

        // 2. Persistência em Nuvem (Firestore) - SE TIVER PACIENTE
        if (patientId && session.patientId === patientId) {
          console.log(`[AutoSave] Salvando rascunho na nuvem...`);
          await PatientService.saveWorkspaceState(patientId, snapshotCloud);
        }

        lastSavedJson.current = jsonString;
      } catch (e) {
        console.warn('Erro no AutoSave:', e);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [session, patientId, isHydrating]);
}

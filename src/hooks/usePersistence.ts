
import { useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { AppSession } from '../types';
import { PatientService } from '../services/patient-service';
import { buildSessionSnapshot } from '../utils/session-persistence';

export const STORAGE_KEY = 'assistente_laudos_session_v1';

/**
 * Hook responsável por salvar automaticamente o estado da sessão.
 * Se patientId for fornecido, salva no Firestore (nuvem).
 * Se não, salva no localStorage (rascunho local).
 */
export function usePersistence(patientId?: string, isHydrating: boolean = false) {
  const { session } = useSession();
  const lastSavedJson = useRef<string>('');

  // 1. Auto-Save (Debounced)
  useEffect(() => {
    // Se estivermos carregando dados (hidratação), NÃO salvamos nada para não sobrescrever
    // o estado limpo ou o estado vindo do banco.
    if (isHydrating) return;
    if (patientId) {
      if (!session.patientId) return;
      if (session.patientId !== patientId) return;
    }

    const timeout = setTimeout(async () => {
      try {
        // Sanitização: Remove objetos File e Blobs que não podem ser serializados
        // URLs 'blob:...' também não servem para persistência longa, mas
        // se o upload (Fase 3.1) funcionou, as URLs já devem ser links do Storage (https://...)
        const sessionToSave = buildSessionSnapshot(session);

        const jsonString = JSON.stringify(sessionToSave);

        // Evita escritas desnecessárias se nada mudou
        if (jsonString === lastSavedJson.current) return;

        if (patientId) {
          // MODO NUVEM: Salva no documento do paciente
          console.log(`[AutoSave] Salvando estado para paciente ${patientId}...`);
          await PatientService.saveWorkspaceState(patientId, sessionToSave);
          lastSavedJson.current = jsonString;
        } else {
          // MODO LOCAL (Fallback/Sem Paciente): Salva no localStorage
          localStorage.setItem(STORAGE_KEY, jsonString);
          lastSavedJson.current = jsonString;
        }

      } catch (e) {
        console.warn('Erro no AutoSave:', e);
      }
    }, 2000); // Debounce de 2s para evitar spam no Firestore

    return () => clearTimeout(timeout);
  }, [session, patientId]);
}

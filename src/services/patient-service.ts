
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, orderBy, limit, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../core/firebase';
import { Patient, PatientStatus } from '../types/patient';
import { AppSession } from '../types';

const COLLECTION = 'patients';

// Fallback em memória para demonstração/offline
let memoryStore: Patient[] = [];
// Store separada para o estado do workspace em memória
let memoryWorkspaceStore: Record<string, any> = {};

// Helper para notificar listeners de memória (simulação de realtime offline)
const memoryListeners: Set<(patients: Patient[]) => void> = new Set();
function notifyMemoryListeners() {
  const activePatients = memoryStore.filter(p => !p.deletedAt).sort((a, b) => b.createdAt - a.createdAt);
  memoryListeners.forEach(cb => cb(activePatients));
}

// Helper para limpar campos undefined (que o Firestore rejeita)
const cleanPayload = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) return data.map(cleanPayload);
  if (typeof data === 'object') {
    const out: any = {};
    Object.keys(data).forEach(key => {
      const val = data[key];
      out[key] = cleanPayload(val);
    });
    return out;
  }
  return data;
};

export const PatientService = {

  /**
   * Cria um novo paciente.
   * Usa setDoc com merge para garantir idempotência baseada no ID gerado.
   */
  async createPatient(patient: Patient): Promise<void> {
    // 1. Caminho Firebase
    if (isFirebaseEnabled() && db) {
      console.log('[PatientService] Saving to FIREBASE:', patient.id);
      const docRef = doc(db, COLLECTION, patient.id);
      const payload = {
        ...patient,
        createdAt: patient.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // OPTIMIZATION: Fire-and-forget (Optimistic UI)
      // Não damos await no setDoc para não travar a UI caso a rede esteja lenta.
      // Com persistência offline, isso é seguro.
      setDoc(docRef, cleanPayload(payload), { merge: true }).catch(err => console.error("Erro background save:", err));
      return Promise.resolve();
    }

    // 2. Caminho Offline (Memória)
    console.warn('Firebase offline. Salvando paciente em memória temporária.');
    const existingIndex = memoryStore.findIndex(p => p.id === patient.id);
    if (existingIndex >= 0) {
      memoryStore[existingIndex] = { ...memoryStore[existingIndex], ...patient };
    } else {
      memoryStore.push(patient);
    }
    notifyMemoryListeners();
  },

  /**
   * Inscreve-se para atualizações em tempo real da lista de pacientes.
   * Retorna uma função de unsubscribe.
   */
  subscribeToPatients(callback: (patients: Patient[]) => void, statusFilter?: PatientStatus): () => void {
    // 1. Caminho Firebase (Realtime)
    if (isFirebaseEnabled() && db) {
      const constraints = [
        where('deletedAt', '==', null),
        orderBy('createdAt', 'desc'),
        limit(50)
      ];

      if (statusFilter) {
        constraints.unshift(where('status', '==', statusFilter));
      }

      const q = query(collection(db, COLLECTION), ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const patients = snapshot.docs.map(d => d.data() as Patient);
        callback(patients);
      }, (error) => {
        console.error("Erro no listener de pacientes:", error);

        // PATCH #5: Fallback para query sem index composto
        if (error.message && error.message.includes('index')) {
          console.warn('⚠️ Index composto ausente. Usando fallback simples...');
          console.warn('Crie o index no Console Firebase: patients(deletedAt ASC, createdAt DESC)');

          // Fallback: busca simples sem ordenação complexa
          const fallbackQ = query(collection(db, COLLECTION), limit(50));
          onSnapshot(fallbackQ, (snap) => {
            const all = snap.docs.map(d => d.data() as Patient);
            // Filtra e ordena no cliente
            const filtered = all
              .filter(p => !p.deletedAt)
              .sort((a, b) => b.createdAt - a.createdAt);
            callback(filtered);
          });
        }
      });

      return unsubscribe;
    }

    // 2. Caminho Offline (Memória - Simulação)
    // Envia o estado atual imediatamente
    const filterAndSend = (allPatients: Patient[]) => {
      let filtered = allPatients;
      if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
      callback(filtered);
    };

    // Registra listener
    const listener = (all: Patient[]) => filterAndSend(all);
    memoryListeners.add(listener);

    // Trigger inicial
    filterAndSend(memoryStore.filter(p => !p.deletedAt).sort((a, b) => b.createdAt - a.createdAt));

    return () => {
      memoryListeners.delete(listener);
    };
  },

  /**
   * Lista pacientes (Método One-shot mantido para compatibilidade ou uso server-side)
   */
  async listPatients(statusFilter?: PatientStatus): Promise<Patient[]> {
    if (isFirebaseEnabled() && db) {
      try {
        const constraints = [
          where('deletedAt', '==', null),
          orderBy('createdAt', 'desc'),
          limit(50)
        ];
        if (statusFilter) constraints.unshift(where('status', '==', statusFilter));

        const q = query(collection(db, COLLECTION), ...constraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => d.data() as Patient);
      } catch (error) {
        console.error("Erro ao listar pacientes:", error);
        throw error;
      }
    }
    let list = memoryStore.filter(p => !p.deletedAt);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Atualiza status ou dados parciais.
   */
  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    // 1. Caminho Firebase
    if (isFirebaseEnabled() && db) {
      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, cleanPayload({
        ...updates,
        updatedAt: Date.now()
      }));
      return;
    }

    // 2. Caminho Offline (Memória)
    const index = memoryStore.findIndex(p => p.id === id);
    if (index >= 0) {
      memoryStore[index] = {
        ...memoryStore[index],
        ...updates,
        updatedAt: Date.now()
      };
      notifyMemoryListeners();
    }
  },

  /**
   * Salva o estado completo do Workspace.
   */
  async saveWorkspaceState(patientId: string, sessionState: Partial<AppSession>): Promise<void> {
    const docsCount = sessionState.docs?.length || 0;
    const audioCount = sessionState.audioJobs?.length || 0;
    const hasSummary = !!sessionState.clinicalMarkdown && sessionState.clinicalMarkdown.length > 20;

    const payload = {
      workspace: sessionState,
      docsCount,
      audioCount,
      hasClinicalSummary: hasSummary,
      updatedAt: Date.now()
    };

    if (isFirebaseEnabled() && db) {
      const docRef = doc(db, COLLECTION, patientId);
      await setDoc(docRef, cleanPayload(payload), { merge: true });
      return;
    }

    // Offline
    memoryWorkspaceStore[patientId] = sessionState;
    const idx = memoryStore.findIndex(p => p.id === patientId);
    if (idx >= 0) {
      memoryStore[idx] = {
        ...memoryStore[idx],
        docsCount,
        audioCount,
        hasClinicalSummary: hasSummary,
        updatedAt: Date.now()
      };
      notifyMemoryListeners();
    }
  },

  /**
   * Implementa Soft Delete.
   */
  async softDeletePatient(id: string): Promise<void> {
    // 1. Caminho Firebase
    if (isFirebaseEnabled() && db) {
      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, {
        deletedAt: Date.now(),
        status: 'done'
      });
      return;
    }

    // 2. Caminho Offline (Memória)
    const index = memoryStore.findIndex(p => p.id === id);
    if (index >= 0) {
      memoryStore[index].deletedAt = Date.now();
      memoryStore[index].status = 'done';
      notifyMemoryListeners();
    }
  },

  /**
   * Recupera um paciente específico completo.
   */
  async getPatient(id: string): Promise<Patient | null> {
    // 1. Caminho Firebase
    if (isFirebaseEnabled() && db) {
      const docRef = doc(db, COLLECTION, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as Patient;
      return null;
    }
    // 2. Caminho Offline (Memória)
    return memoryStore.find(p => p.id === id) || null;
  },

  /**
   * Cria múltiplos pacientes em lote
   * Retorna array de IDs criados
   */
  async createBatchPatients(items: Array<{
    os: string;
    paciente: string;
    tipo_exame: string;
    data_exame: string;
    data_entrega?: string;
  }>): Promise<string[]> {
    const createdIds: string[] = [];
    const now = Date.now();

    for (const item of items) {
      const patient: Patient = {
        id: crypto.randomUUID(),
        name: item.paciente || 'Sem Nome',
        os: item.os || `AUTO-${Date.now()}`,
        examType: item.tipo_exame || 'Não especificado',
        examDate: item.data_exame,
        status: 'waiting',
        createdAt: now,
        updatedAt: now,
        docsCount: 0,
        audioCount: 0,
        hasClinicalSummary: false,
        hasAttachments: false,
        finalized: false,
      };

      await this.createPatient(patient);
      createdIds.push(patient.id);
    }

    return createdIds;
  }
};

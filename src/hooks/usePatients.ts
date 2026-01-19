
import { useState, useEffect } from 'react';
import { PatientService } from '../services/patient-service';
import { Patient, PatientStatus } from '../types/patient';
import { PatientBatchItem } from '../utils/batch-parsers';

type PatientListFilter = PatientStatus | 'all' | 'archived';

export function usePatients(initialFilter: PatientStatus | undefined = undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PatientListFilter>(initialFilter || 'all');

  // Efeito de Subscrição (Real-time)
  useEffect(() => {
    setLoading(true);

    const isArchivedView = filter === 'archived';
    const statusToSend = filter === 'all' || isArchivedView ? undefined : filter;

    // Inscreve no Firestore (ou memória) e recebe atualizações automaticamente
    const unsubscribe = PatientService.subscribeToPatients((data) => {
      setPatients(data);
      setLoading(false);
      setError(null);
    }, { status: statusToSend, archivedOnly: isArchivedView });

    // Cleanup ao desmontar ou mudar filtro
    return () => unsubscribe();
  }, [filter]);

  const createPatient = async (name: string, os: string, examType: string) => {
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name,
      os,
      examType,
      status: 'waiting',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null, // 🔥 FIX: Necessário para a query `where('deletedAt', '==', null)` funcionar!
      docsCount: 0,
      audioCount: 0,
      hasClinicalSummary: false
    };

    // OPTIMISTIC UI com DEDUPLICAÇÃO: Evita duplicatas quando o listener sincroniza
    setPatients(prev => {
      const exists = prev.some(p => p.id === newPatient.id);
      return exists ? prev : [newPatient, ...prev];
    });

    // Fire-and-forget para o Firebase (já implementado no service)
    PatientService.createPatient(newPatient).catch(err => {
      console.error("Erro ao persistir paciente:", err);
      // Em caso de erro, poderia reverter a UI aqui (rollback)
    });

    return newPatient;
  };

  const createPatientsBatch = async (items: PatientBatchItem[]) => {
    const now = Date.now();
    const patientsToCreate: Patient[] = items.map((item, index) => ({
      id: crypto.randomUUID(),
      name: item.paciente || 'Sem Nome',
      os: item.os || `AUTO-${now}-${index + 1}`,
      examType: item.tipo_exame || 'Não especificado',
      examDate: item.data_exame || '',
      status: 'waiting',
      createdAt: now + index,
      updatedAt: now + index,
      deletedAt: null,
      docsCount: 0,
      audioCount: 0,
      hasClinicalSummary: false,
      hasAttachments: false,
      finalized: false
    }));

    // OPTIMISTIC UI com DEDUPLICAÇÃO
    setPatients(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const unique = patientsToCreate.filter(p => !existingIds.has(p.id));
      return [...unique, ...prev];
    });

    // Persistência em background (Firebase ou memória)
    await Promise.all(
      patientsToCreate.map(p =>
        PatientService.createPatient(p).catch(err => {
          console.error("Erro ao persistir paciente (batch):", err);
        })
      )
    );

    return patientsToCreate.map(p => p.id);
  };

  // Função de arquivamento - o componente que chama deve exibir seu próprio modal de confirmação
  const archivePatient = async (id: string) => {
    try {
      await PatientService.archivePatient(id);
      // Listener atualiza UI automaticamente
    } catch (err) {
      console.error("Erro ao arquivar paciente:", err);
      throw err;
    }
  };

  // Exclusão definitiva (irreversível)
  const purgePatient = async (id: string) => {
    try {
      await PatientService.purgePatient(id);
    } catch (err) {
      console.error("Erro ao excluir paciente definitivamente:", err);
      throw err;
    }
  };

  // refresh manual é mantido caso haja erro de conexão, mas raramente necessário
  const refresh = () => setFilter(prev => prev);

  return {
    patients,
    loading,
    error,
    filter,
    setFilter,
    refresh,
    createPatient,
    createPatientsBatch,
    archivePatient,
    purgePatient
  };
}


import { useState, useEffect } from 'react';
import { PatientService } from '../services/patient-service';
import { Patient, PatientStatus } from '../types/patient';

export function usePatients(initialFilter: PatientStatus | undefined = undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PatientStatus | 'all'>(initialFilter || 'all');

  // Efeito de Subscrição (Real-time)
  useEffect(() => {
    setLoading(true);

    const statusToSend = filter === 'all' ? undefined : filter;

    // Inscreve no Firestore (ou memória) e recebe atualizações automaticamente
    const unsubscribe = PatientService.subscribeToPatients((data) => {
      setPatients(data);
      setLoading(false);
      setError(null);
    }, statusToSend);

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

  const deletePatient = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover este paciente da lista?")) return;
    try {
      await PatientService.softDeletePatient(id);
      // Listener atualiza UI
    } catch (err) {
      alert("Erro ao excluir paciente");
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
    deletePatient
  };
}


import { PatientRegistrationDetails, ClinicalSummary, AttachmentDoc, AudioJob, AppSession } from './index';

export type PatientStatus = 'waiting' | 'processing' | 'ready' | 'done';

export interface Patient {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null; // Soft delete support (null = ativo, number = timestamp)

  // Dados de Identificação (Desnormalizados para listagem rápida)
  name: string;
  os: string;
  examType: string;
  examDate?: string;

  // Status do Fluxo
  status: PatientStatus;

  // Metadados de Processamento
  docsCount: number;
  audioCount: number;
  hasClinicalSummary: boolean;

  // Dados Completos (podem ser carregados sob demanda em otimizações futuras)
  details?: PatientRegistrationDetails | null;
  clinicalSummary?: ClinicalSummary;

  // Estado completo da sessão para hidratação (Fase 3.3)
  workspace?: Partial<AppSession>;
}

// Interface para upload de arquivos associados ao paciente
export interface StorageUploadResult {
  docId: string;
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
}

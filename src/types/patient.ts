
import { PatientRegistrationDetails, ClinicalSummary, AttachmentDoc, AudioJob, AppSession } from './index';

export type PatientStatus = 'waiting' | 'processing' | 'in_progress' | 'ready' | 'done';

export interface Patient {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null; // Arquivado (soft delete): null = ativo, number = timestamp

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

  // Novos campos para rastreamento de anexos e finalização
  hasAttachments?: boolean;      // true se tem docs ou audio
  finalized?: boolean;           // true se botão finalizar clicado
  finalizedAt?: number;          // timestamp da finalização
  finalizedBy?: string;          // user que finalizou (futuro)

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

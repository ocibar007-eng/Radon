
import { z } from 'zod';
import {
  OCRFieldSchema,
  DateCandidateSchema,
  DateOCRFieldSchema,
  PatientRegistrationSchema,
  StructuredFindingSchema,
  StructuredReportBodySchema,
  ReportMetadataSchema,
  ReportPreviewSchema,
  ReportAnalysisSchema,
  ClinicalSummarySchema,
  AudioTranscriptRowSchema,
  FindingSeveritySchema,
  LaudadorSchema,
  ServicoOrigemSchema,
  PdfGlobalGroupingSchema,
  ImagesGlobalGroupingSchema,
  PdfGroupSchema,
  ImageGroupSchema
} from '../adapters/schemas';

// --- TIPOS INFERIDOS DO ZOD (CORE DATA) ---

export type OCRField = z.infer<typeof OCRFieldSchema>;
export type DateCandidate = z.infer<typeof DateCandidateSchema>;
export type DateOCRField = z.infer<typeof DateOCRFieldSchema>;

export type PatientRegistrationDetails = z.infer<typeof PatientRegistrationSchema>;

// Tipos de Inteligência Clínica
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;
export type StructuredFinding = z.infer<typeof StructuredFindingSchema>;
export type StructuredReportBody = z.infer<typeof StructuredReportBodySchema>;

export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;
export type ReportPreview = z.infer<typeof ReportPreviewSchema>;
export type ReportAnalysis = z.infer<typeof ReportAnalysisSchema>;

export type ClinicalSummary = z.infer<typeof ClinicalSummarySchema>;
// Alias para compatibilidade
export type ClinicalDocSummary = ClinicalSummary;

export type AudioTranscriptRow = z.infer<typeof AudioTranscriptRowSchema>;

// Tipos para Análise Global de Agrupamento
export type Laudador = z.infer<typeof LaudadorSchema>;
export type ServicoOrigem = z.infer<typeof ServicoOrigemSchema>;
export type PdfGlobalGroupingResult = z.infer<typeof PdfGlobalGroupingSchema>;
export type ImagesGlobalGroupingResult = z.infer<typeof ImagesGlobalGroupingSchema>;
export type PdfGroup = z.infer<typeof PdfGroupSchema>;
export type ImageGroup = z.infer<typeof ImageGroupSchema>;

// --- TIPOS DE APLICAÇÃO / UI (MANUAIS) ---
// Estes tipos não vêm diretamente da IA, mas controlam o estado da interface

export type DocClassification = 'assistencial' | 'laudo_previo' | 'indeterminado';

export interface AttachmentDoc {
    id: string;
    file?: File;
    source: string;
    previewUrl: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    errorMessage?: string;

    classification: DocClassification;
    classificationSource?: 'auto' | 'manual'; // Rastreia se foi IA ou Usuário

    isRecoveredBySystem?: boolean; // Indica heurística de fallback

    verbatimText?: string;

    reportGroupHint?: string;
    reportGroupHintSource?: 'auto' | 'manual'; // Rastreia divisão manual

    // Campos para Análise Global de Agrupamento (NOVO)
    globalGroupId?: number; // ID do grupo definido pela análise global
    globalGroupType?: string; // Tipo de exame detectado pela análise global
    globalGroupSource?: string; // Nome do arquivo PDF de origem para agrupamento
    isProvisorio?: boolean; // Laudo provisório (sem valor legal)
    isAdendo?: boolean; // É errata/adendo de outro laudo
    tipoPagina?: 'laudo_previo' | 'pedido_medico' | 'assistencial' | 'administrativo' | 'pagina_vazia' | 'outro';

    summary?: string;
    detailedAnalysis?: ReportAnalysis; // Usa o tipo inferido aqui
    isUnified?: boolean;
    metadata?: {
        reportType?: string;
        reportDate?: string;
        displayDate?: string;
    };
}

export interface AudioJob {
    id: string;
    blob?: Blob;
    status: 'processing' | 'done' | 'error';
    createdAt: number;
    storageUrl?: string;
    transcriptRaw?: string;
    transcriptRows?: AudioTranscriptRow[]; // Usa o tipo inferido aqui
}

export interface AppSession {
    patientId?: string;
    headerImage: AttachmentDoc | null;
    patient: PatientRegistrationDetails | null; // Usa o tipo inferido aqui
    docs: AttachmentDoc[];
    audioJobs: AudioJob[];
    clinicalMarkdown: string;
    clinicalSummaryData?: ClinicalSummary; // Usa o tipo inferido aqui
}

export type ProcessingQueueItem = 
  | { type: 'header'; docId: string; jobId?: string }
  | { type: 'doc'; docId: string; jobId?: string }
  | { type: 'audio'; docId?: string; jobId: string }
  | { type: 'group_analysis'; docIds: string[]; fullText: string };

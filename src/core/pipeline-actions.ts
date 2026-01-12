
import * as GeminiAdapter from '../adapters/gemini-prompts';
import { AttachmentDoc, PatientRegistrationDetails, AudioTranscriptRow, ReportAnalysis, ClinicalSummary } from '../types';

/**
 * Processa o Header (Intake)
 */
export async function processHeader(file: File): Promise<PatientRegistrationDetails> {
  return await GeminiAdapter.extractHeaderInfo(file);
}

/**
 * Processa um Documento Individual (OCR + Classificação)
 * Encapsula a lógica de decisão entre "Classificação Manual vs Automática".
 */
export async function processDocument(file: File, currentDoc: AttachmentDoc): Promise<Partial<AttachmentDoc>> {
  // Passamos a classificação existente (se houver) para o adapter
  // Se o usuário forçou 'laudo_previo', o adapter não vai tentar adivinhar, só extrair texto.
  const analysis = await GeminiAdapter.analyzeDocument(file, currentDoc.classification);
  
  const isManualClassification = currentDoc.classificationSource === 'manual';
  const isManualHint = currentDoc.reportGroupHintSource === 'manual';
  
  const finalClassification = isManualClassification && currentDoc.classification
    ? currentDoc.classification
    : analysis.classification;

  const finalReportGroupHint = isManualHint
    ? (currentDoc.reportGroupHint || '')
    : analysis.reportGroupHint;
  
  return {
    status: 'done',
    classification: finalClassification,
    classificationSource: isManualClassification ? 'manual' : 'auto',
    isRecoveredBySystem: isManualClassification ? false : analysis.isRecoveredBySystem,
    verbatimText: analysis.verbatimText,
    reportGroupHint: finalReportGroupHint,
    reportGroupHintSource: isManualHint ? 'manual' : 'auto',
    summary: analysis.summary
  };
}

/**
 * Processa a Análise Unificada de Grupo (Fase 3)
 */
export async function processGroupAnalysis(fullText: string): Promise<{
    detailedAnalysis: ReportAnalysis,
    metadata: { reportType: string, reportDate: string },
    summary: string
}> {
  const details = await GeminiAdapter.extractReportDetailedMetadata(fullText);
  
  return {
    detailedAnalysis: details,
    metadata: {
      reportType: details.report_metadata.tipo_exame,
      reportDate: details.report_metadata.data_realizacao
    },
    summary: details.preview.descricao
  };
}

/**
 * Processa Transcrição de Áudio
 */
export async function processAudio(blob: Blob): Promise<{ transcriptRaw: string, transcriptRows: AudioTranscriptRow[] }> {
  const result = await GeminiAdapter.transcribeAudio(blob);
  return {
    transcriptRaw: result.text,
    transcriptRows: result.rows
  };
}

/**
 * Gera Resumo Clínico
 */
export async function processClinicalSummary(docs: AttachmentDoc[]): Promise<ClinicalSummary | null> {
  return await GeminiAdapter.generateClinicalSummary(docs);
}

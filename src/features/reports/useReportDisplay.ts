
import { useMemo } from 'react';
import { ReportGroup } from '../../utils/grouping';
import { AttachmentDoc, StructuredReportBody } from '../../types';

export interface ReportDisplayMeta {
  date: string;
  origin: string;
  originLabel: string;
  isSabin: boolean;
  type: string;
  summary?: string;
  isUnifiedSuccess: boolean;
  laudador?: {
    nome: string;
    crm: string | null;
    identificado_em: string;
  };
  servicoOrigem?: {
    nome: string;
    identificado_em: string;
  };
}

export function useReportDisplay(group: ReportGroup) {

  // 1. Concatenação de Texto Verbatim (Plain Text)
  const fullReportText = useMemo(() => {
    return group.docs
      .map((doc, idx) => {
        const header = group.docs.length > 1 ? `--- PÁGINA ${idx + 1} ---\n` : '';
        return `${header}${doc.verbatimText || '(Texto não extraído)'}`;
      })
      .join('\n\n');
  }, [group.docs]);

  // 2. Identificação do Documento Representativo (Unified/Main Doc)
  const unifiedDoc = useMemo(() =>
    group.docs.find(d => d.isUnified) ||
    group.docs.find(d => d.detailedAnalysis) ||
    group.docs[0],
    [group.docs]);

  // 3. Extração e Normalização de Metadados
  const analysis = unifiedDoc.detailedAnalysis;
  const structuredData = analysis?.structured;

  // Lógica de Display do Tipo de Exame
  const rawType = analysis?.report_metadata.tipo_exame;
  const displayType = (rawType && rawType !== 'Não identificado' && rawType !== 'Tipo de Exame')
    ? rawType
    : (group.title || group.type || 'Documento Médico');

  // Lógica de Origem
  const origin = analysis?.report_metadata.origem || 'Origem não detectada';
  const serviceOrigin = analysis?.report_metadata.servico_origem?.nome || '';
  const originLower = `${origin} ${serviceOrigin}`.toLowerCase();
  const isSabin = originLower.includes('sabin') ||
    originLower.includes('interno') ||
    originLower.includes('uba - cru') ||
    originLower.includes('uba-cru') ||
    originLower.includes('uba cru');

  const meta: ReportDisplayMeta = {
    date: analysis?.report_metadata.data_realizacao || group.date || 'Data N/A',
    origin: origin,
    originLabel: isSabin ? 'Sabin Diagnóstico' : 'Externo',
    isSabin,
    type: displayType,
    summary: analysis?.preview.descricao || unifiedDoc.summary,
    isUnifiedSuccess: !!unifiedDoc.isUnified,
    laudador: analysis?.laudador,
    servicoOrigem: analysis?.report_metadata.servico_origem
  };

  // 4. Validação de Alertas
  const hasWarnings = !!(
    structuredData &&
    (structuredData.texto_parece_completo === false ||
      (structuredData.alertas_de_fidelidade && structuredData.alertas_de_fidelidade.length > 0))
  );

  // 5. Helper de Formatação HTML
  const formatBold = (text: string) => {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, '<b>$1</b>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  };

  return {
    unifiedDoc,
    plainText: fullReportText,
    structuredData,
    isStructured: !!structuredData,
    meta,
    formatBold,
    hasWarnings
  };
}

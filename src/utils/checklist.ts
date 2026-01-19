import type { AppSession, AttachmentDoc, ClinicalSummary } from '../types';
import type { PedidoMedicoData, QuestionarioData } from '../adapters/schemas-templates';

export type ChecklistIntent = 'diagnostico' | 'estadiamento' | 'reestadiamento' | 'seguimento';

export type ChecklistInput = {
  pedido_medico: Record<string, any>;
  resumo_clinico: Record<string, any>;
  exame_planejado: {
    modalidade: string;
    regiao: string;
    com_contraste: boolean;
    contexto: ChecklistIntent;
  };
  dados_estruturados_detectados: {
    suspeitas_principais: string[];
    suspeita_principal_normalizada?: string;
    diagnosticos_conhecidos: string[];
    tratamentos_previos: string[];
    cirurgias_previas: string[];
    sintomas_chave: string[];
    laboratorio_relevante: string[];
    exames_previos: string[];
    sinais_de_alerta: string[];
  };
  preferencias_de_estilo: {
    nivel_detalhe: 'alto' | 'medio';
    modo: 'compacto' | 'completo';
    padrao_de_unidades: 'mm_cm';
    formato: 'sinotico';
    termos_preferidos: string[];
    termos_a_evitar: string[];
  };
};

const DEFAULT_STYLE: ChecklistInput['preferencias_de_estilo'] = {
  nivel_detalhe: 'alto',
  modo: 'completo',
  padrao_de_unidades: 'mm_cm',
  formato: 'sinotico',
  termos_preferidos: [],
  termos_a_evitar: []
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueValues = (values: Array<string | undefined | null>) => {
  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
};

const detectIntent = (text: string): ChecklistIntent => {
  const normalized = normalizeText(text);
  if (normalized.includes('reestadi')) return 'reestadiamento';
  if (normalized.includes('estadi')) return 'estadiamento';
  if (normalized.includes('seguimento') || normalized.includes('follow up') || normalized.includes('follow-up') || normalized.includes('controle')) {
    return 'seguimento';
  }
  return 'diagnostico';
};

const inferExamPlan = (rawExam: string) => {
  const fallback = { modalidade: 'não informado', regiao: 'não informado', com_contraste: false };
  if (!rawExam) return fallback;

  const normalized = normalizeText(rawExam);
  let modalidade = 'não informado';

  if (normalized.includes('tomografia') || normalized.includes(' tc ') || normalized.startsWith('tc ')) {
    modalidade = 'TC';
  } else if (normalized.includes('ressonancia') || normalized.includes(' rm ') || normalized.startsWith('rm ')) {
    modalidade = 'RM';
  } else if (normalized.includes('ultrassom') || normalized.includes('ultrassonografia') || normalized.includes('usg')) {
    modalidade = 'USG';
  } else if (normalized.includes('raio x') || normalized.includes('radiografia') || normalized.includes(' rx ') || normalized.startsWith('rx ')) {
    modalidade = 'RX';
  } else if (normalized.includes('mamografia')) {
    modalidade = 'Mamografia';
  } else if (normalized.includes('pet')) {
    modalidade = 'PET-CT';
  }

  const comContraste = (() => {
    if (normalized.includes('sem contraste') || normalized.includes('s/ contraste')) return false;
    if (normalized.includes('com contraste') || normalized.includes('c/ contraste') || normalized.includes('c/contraste') || normalized.includes('contraste')) return true;
    return false;
  })();

  let regiao = rawExam;
  regiao = regiao.replace(/tomografia|tc|ressonância|ressonancia|rm|ultrassom|ultrassonografia|usg|radiografia|raio x|rx|mamografia|pet-?ct|pet/gi, '');
  regiao = regiao.replace(/com contraste|sem contraste|c\/ contraste|c\/contraste/gi, '');
  regiao = regiao.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  if (!regiao) regiao = 'não informado';

  return { modalidade, regiao, com_contraste: comContraste };
};

const getPedidoMedico = (docs: AttachmentDoc[]) => {
  const pedidoDoc = docs.find(
    (doc) => doc.classification === 'pedido_medico' && doc.extractedData?.tipo_documento === 'pedido_medico'
  );
  if (pedidoDoc?.extractedData) return pedidoDoc.extractedData as PedidoMedicoData;
  if (pedidoDoc?.verbatimText) return { texto_verbatim: pedidoDoc.verbatimText };
  return null;
};

const getClinicalSummary = (session: AppSession): Record<string, any> => {
  if (session.clinicalSummaryData) {
    return {
      ...(session.clinicalSummaryData as ClinicalSummary),
      markdown_para_ui: session.clinicalSummaryData.markdown_para_ui || session.clinicalMarkdown
    };
  }
  if (session.clinicalMarkdown) {
    return { markdown_para_ui: session.clinicalMarkdown };
  }
  return {};
};

const extractQuestionarioData = (docs: AttachmentDoc[]) =>
  docs
    .filter((doc) => doc.classification === 'questionario')
    .map((doc) => doc.extractedData)
    .filter((data): data is QuestionarioData => data?.tipo_documento === 'questionario');

const hasIntentKeyword = (text: string) => {
  const normalized = normalizeText(text);
  return /reestadi|estadi|seguim|follow|diagnost/.test(normalized);
};

const hasContrastKeyword = (text: string) => {
  const normalized = normalizeText(text);
  return /contraste|c\/ contraste|c\/contraste|s\/ contraste|sem contraste/.test(normalized);
};

export function buildChecklistInput(session: AppSession, options?: { query?: string }): ChecklistInput {
  const pedido = getPedidoMedico(session.docs);
  const summary = getClinicalSummary(session);
  const questionarios = extractQuestionarioData(session.docs);

  const sintomas = uniqueValues(questionarios.flatMap((q) => q.sintomas_atuais || []));
  const cirurgias = uniqueValues(questionarios.flatMap((q) => q.historico_cirurgico || []));
  const diagnosticos = uniqueValues(questionarios.flatMap((q) => q.historico_patologico || []));

  const suspeitas = uniqueValues([
    typeof pedido === 'object' && pedido ? (pedido as PedidoMedicoData).justificativa_clinica : ''
  ]);

  const examSource =
    (typeof pedido === 'object' && pedido ? (pedido as PedidoMedicoData).exame_solicitado : '') ||
    session.patient?.tipo_exame?.valor ||
    '';

  const examPlan = inferExamPlan(examSource);

  const contexto = detectIntent(
    [
      examSource,
      typeof pedido === 'object' && pedido ? (pedido as PedidoMedicoData).justificativa_clinica : '',
      session.clinicalMarkdown
    ]
      .filter(Boolean)
      .join(' ')
  );

  const baseInput: ChecklistInput = {
    pedido_medico: pedido || {},
    resumo_clinico: summary,
    exame_planejado: {
      modalidade: examPlan.modalidade,
      regiao: examPlan.regiao,
      com_contraste: examPlan.com_contraste,
      contexto
    },
    dados_estruturados_detectados: {
      suspeitas_principais: suspeitas,
      suspeita_principal_normalizada: '',
      diagnosticos_conhecidos: diagnosticos,
      tratamentos_previos: [],
      cirurgias_previas: cirurgias,
      sintomas_chave: sintomas,
      laboratorio_relevante: [],
      exames_previos: [],
      sinais_de_alerta: []
    },
    preferencias_de_estilo: DEFAULT_STYLE
  };

  const query = options?.query?.trim();
  if (!query) return baseInput;

  const queryPlan = inferExamPlan(query);
  const queryIntent = detectIntent(query);
  const useQueryIntent = hasIntentKeyword(query);
  const shouldOverrideRegion =
    queryPlan.modalidade !== 'não informado' || baseInput.exame_planejado.regiao === 'não informado';

  const mergedSuspects = uniqueValues([query, ...baseInput.dados_estruturados_detectados.suspeitas_principais]);

  return {
    ...baseInput,
    exame_planejado: {
      ...baseInput.exame_planejado,
      modalidade: queryPlan.modalidade !== 'não informado' ? queryPlan.modalidade : baseInput.exame_planejado.modalidade,
      regiao: shouldOverrideRegion && queryPlan.regiao !== 'não informado'
        ? queryPlan.regiao
        : baseInput.exame_planejado.regiao,
      com_contraste: hasContrastKeyword(query) ? queryPlan.com_contraste : baseInput.exame_planejado.com_contraste,
      contexto: useQueryIntent ? queryIntent : baseInput.exame_planejado.contexto
    },
    dados_estruturados_detectados: {
      ...baseInput.dados_estruturados_detectados,
      suspeitas_principais: mergedSuspects
    }
  };
}


import { z } from 'zod';

// Helper de Enum Resiliente para Confiança
// Usa z.preprocess para normalizar o input antes de validar
export const ConfiancaSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'baixa';
    const v = val.toLowerCase();
    if (v.includes('alta')) return 'alta';
    if (v.includes('media')) return 'media';
    return 'baixa';
  },
  z.enum(['baixa', 'media', 'alta'])
);

// Helper de Enum Resiliente para Origem
export const OrigemSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'externo';
    const v = val.toLowerCase();
    if (v.includes('sabin') || v.includes('interno')) return 'interno_sabin';
    return 'externo';
  },
  z.enum(['interno_sabin', 'externo'])
);

// Helper para Status com fallback resiliente
export const FindingSeveritySchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'normal';
    const v = val.toLowerCase();
    if (v === 'alteracao_benigna' || v === 'alteracao_relevante') return v;
    return 'normal';
  },
  z.enum(['normal', 'alteracao_benigna', 'alteracao_relevante'])
);

// Helper function para strings resilientes (converte null/undefined/number para string)
export const ResilientString = z.preprocess((v) => v ? String(v) : '', z.string().default(''));

// Schema para campos OCR Texto Simples
export const OCRFieldSchema = z.object({
  valor: ResilientString,
  confianca: ConfiancaSchema,
  evidencia: ResilientString,
  candidatos: z.array(z.string()).optional().default([])
}).catch({
  valor: '',
  confianca: 'baixa',
  evidencia: 'Erro de processamento',
  candidatos: []
});

// Schema para o Campo de Data Complexo
export const DateCandidateSchema = z.object({
  rotulo: ResilientString,
  texto: ResilientString,
  data_normalizada: z.string().nullable().default(null),
  hora: z.string().nullable().default(null),
  confianca: ConfiancaSchema
});

export const DateOCRFieldSchema = z.object({
  valor: ResilientString,
  data_normalizada: z.string().nullable().default(null),
  hora: z.string().nullable().default(null),
  confianca: ConfiancaSchema,
  evidencia: ResilientString,
  candidatos: z.array(DateCandidateSchema).optional().default([])
}).catch({
  valor: '',
  data_normalizada: null,
  hora: null,
  confianca: 'baixa',
  evidencia: 'Erro de processamento',
  candidatos: []
});

// 1. Header Intake
// Tornado resiliente: Se a IA falhar em enviar um objeto inteiro (ex: 'os' faltando), usamos um default vazio.
export const PatientRegistrationSchema = z.object({
  os: OCRFieldSchema.optional().default({}),
  paciente: OCRFieldSchema.optional().default({}),
  tipo_exame: OCRFieldSchema.optional().default({}),
  data_exame: DateOCRFieldSchema.optional().default({}),
  outras_datas_encontradas: z.array(z.object({
    rotulo: ResilientString,
    texto: ResilientString,
    data_normalizada: z.string().nullable().default(null),
    hora: z.string().nullable().default(null)
  })).optional().default([]),
  observacoes: z.array(z.string()).optional().default([])
}).catch({
  os: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
  paciente: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
  tipo_exame: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
  data_exame: { valor: '', confianca: 'baixa', evidencia: '', data_normalizada: null, hora: null, candidatos: [] },
  outras_datas_encontradas: [],
  observacoes: ['Erro crítico de validação de dados do paciente.']
});

// 2. Classificação de Documentos
// Relaxamos classification para aceitar string e tentar normalizar via catch
export const DocumentAnalysisSchema = z.object({
  classification: z.string().default('indeterminado'),
  texto_verbatim: ResilientString,
  report_group_hint: z.string().optional().default('')
});

// Novos Schemas Estruturados com Severidade
export const StructuredFindingSchema = z.object({
  estrutura: ResilientString,
  achados_literais_em_topicos: z.array(z.string()).default([]),
  pontos_de_comparacao: z.array(z.string()).default([]),
  status: FindingSeveritySchema
});

export const StructuredReportBodySchema = z.object({
  tipo_exame_detectado: ResilientString,
  data_exame_detectada: z.string().optional(),
  indicacao_clinica: ResilientString,
  tecnica: ResilientString,

  achados_por_estrutura: z.array(StructuredFindingSchema).default([]),

  orgaos_esperados: z.array(ResilientString).default([]),
  orgaos_encontrados: z.array(ResilientString).default([]),
  orgaos_ausentes: z.array(z.object({
    orgao: ResilientString,
    motivo: ResilientString
  })).default([]),

  linfonodos: z.object({
    achados_literais_em_topicos: z.array(z.string()).default([]),
    pontos_de_comparacao: z.array(z.string()).default([]),
    status: FindingSeveritySchema
  }).optional(),

  impressao_diagnostica_ou_conclusao_literal: ResilientString,

  // Novos campos de controle
  alertas_de_fidelidade: z.array(z.string()).default([]),
  texto_parece_completo: z.boolean().default(true)
});

// Helper para Categoria de Exame
export const CategoriaExameSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'outros';
    const v = val.toLowerCase();
    if (v.includes('imagem') || v.includes('radiologia')) return 'imagem_radiologia';
    if (v.includes('biopsia') || v.includes('anatomopatologico') || v.includes('citopato')) return 'biopsia_anatomopatologico';
    if (v.includes('endoscopia') || v.includes('eda') || v.includes('colonoscopia')) return 'endoscopia';
    return 'outros';
  },
  z.enum(['imagem_radiologia', 'biopsia_anatomopatologico', 'endoscopia', 'outros'])
);

// Helper para Identificação de Laudador
export const IdentificacaoLaudadorSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'nao_identificado';
    const v = val.toLowerCase();
    if (v.includes('manuscrita') || v.includes('caligrafia')) return 'assinatura_manuscrita';
    if (v.includes('digital')) return 'assinatura_digital';
    return 'nao_identificado';
  },
  z.enum(['assinatura_manuscrita', 'assinatura_digital', 'nao_identificado'])
);

// Helper para Identificação de Serviço de Origem
export const IdentificacaoServicoSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'nao_identificado';
    const v = val.toLowerCase();
    if (v.includes('cabecalho') || v.includes('header')) return 'cabecalho';
    if (v.includes('rodape') || v.includes('footer')) return 'rodape';
    return 'nao_identificado';
  },
  z.enum(['cabecalho', 'rodape', 'nao_identificado'])
);

// Schema para Serviço de Origem
export const ServicoOrigemSchema = z.object({
  nome: ResilientString,
  identificado_em: IdentificacaoServicoSchema
}).catch({
  nome: 'Serviço externo não identificado',
  identificado_em: 'nao_identificado'
});

// Schema para Laudador (quem assinou o laudo)
export const LaudadorSchema = z.object({
  nome: ResilientString,
  crm: z.string().nullable().default(null),
  identificado_em: IdentificacaoLaudadorSchema,
  observacao: ResilientString
}).catch({
  nome: 'Não identificado',
  crm: null,
  identificado_em: 'nao_identificado',
  observacao: ''
});

// 3. Metadados Detalhados de Laudo (ATUALIZADO)
export const ReportMetadataSchema = z.object({
  tipo_exame: ResilientString,
  categoria_exame: CategoriaExameSchema.optional(),
  os: ResilientString,
  paciente: ResilientString,
  servico_origem: ServicoOrigemSchema.optional(),
  origem: OrigemSchema,
  datas_encontradas: z.array(z.object({
    rotulo: ResilientString,
    data_literal: ResilientString,
    data_normalizada: z.string().optional()
  })).default([]),
  data_realizacao: ResilientString,
  criterio_data_realizacao: ResilientString
});

export const ReportPreviewSchema = z.object({
  titulo: ResilientString,
  descricao: ResilientString
});

export const ReportAnalysisSchema = z.object({
  report_metadata: ReportMetadataSchema,
  laudador: LaudadorSchema.optional(),
  preview: ReportPreviewSchema,
  structured: StructuredReportBodySchema.optional(),
  documento_incompleto: z.boolean().optional().default(false),
  possible_duplicate: z.object({
    is_possible_duplicate: z.boolean().default(false),
    reason: z.string().nullable().default(null)
  })
});

// 4. Resumo Clínico
export const ClinicalSummarySchema = z.object({
  assistencial_docs: z.array(z.object({
    doc_id: z.string(),
    source: z.string(),
    titulo_sugerido: ResilientString,
    datas_encontradas: z.array(z.string()).default([]),
    mini_resumo: ResilientString
  })).default([]),
  resumo_clinico_consolidado: z.object({
    texto_em_topicos: z.array(z.object({
      secao: ResilientString,
      itens: z.array(z.string())
    }))
  }),
  markdown_para_ui: ResilientString,
  cobertura: z.object({
    doc_ids_assistenciais: z.array(z.string()).default([]),
    total_assistencial_detectados: z.number().default(0)
  })
});

// 4.1 Checklist Radiológico
const PrioridadeSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'P1';
    const v = val.toUpperCase().trim();
    if (v === 'P0' || v === 'P1' || v === 'P2') return v;
    return 'P1';
  },
  z.enum(['P0', 'P1', 'P2'])
);

const TipoCampoSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'text';
    const v = val.toLowerCase().trim();
    if (v === 'boolean' || v === 'number' || v === 'text' || v === 'select' || v === 'multi_select') return v;
    return 'text';
  },
  z.enum(['boolean', 'number', 'text', 'select', 'multi_select'])
);

const UnidadeSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return '';
    const v = val.toLowerCase().trim();
    if (v === 'mm') return 'mm';
    if (v === 'cm') return 'cm';
    if (v === 'ml') return 'mL';
    if (v === 'mL') return 'mL';
    return '';
  },
  z.enum(['mm', 'cm', 'mL', ''])
);

const IntencaoSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'diagnostico';
    const v = val.toLowerCase().trim();
    if (v.includes('reestadi')) return 'reestadiamento';
    if (v.includes('estadi')) return 'estadiamento';
    if (v.includes('seguim') || v.includes('follow')) return 'seguimento';
    return 'diagnostico';
  },
  z.enum(['diagnostico', 'estadiamento', 'reestadiamento', 'seguimento'])
);

const BoolSchema = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase().trim() === 'true';
    return false;
  },
  z.boolean()
);

const ChecklistItemSchema = z.object({
  id: ResilientString,
  rotulo: ResilientString,
  prioridade: PrioridadeSchema,
  evidencia_minima: ResilientString,
  tipo_campo: TipoCampoSchema,
  opcoes: z.array(ResilientString).optional().default([]),
  unidade: UnidadeSchema,
  obrigatorio: BoolSchema,
  quando_aplicar: ResilientString,
  como_avaliar: ResilientString,
  como_reportar_no_laudo: ResilientString,
  thresholds_ou_definicoes: z.array(ResilientString).optional().default([]),
  armadilhas: z.array(ResilientString).optional().default([])
}).catch({
  id: '',
  rotulo: '',
  prioridade: 'P1',
  evidencia_minima: '',
  tipo_campo: 'text',
  opcoes: [],
  unidade: '',
  obrigatorio: false,
  quando_aplicar: '',
  como_avaliar: '',
  como_reportar_no_laudo: '',
  thresholds_ou_definicoes: [],
  armadilhas: []
});

const ChecklistSectionSchema = z.object({
  secao: ResilientString,
  itens: z.array(ChecklistItemSchema).default([])
}).catch({
  secao: '',
  itens: []
});

const ChecklistFrameworkSchema = z.object({
  nome: ResilientString,
  quando_usar: ResilientString,
  observacao: ResilientString
}).catch({
  nome: '',
  quando_usar: '',
  observacao: ''
});

const ChecklistDiferencialSchema = z.object({
  nome: ResilientString,
  por_que_entrou: ResilientString
}).catch({
  nome: '',
  por_que_entrou: ''
});

const ResumoFinalStructSchema = z.object({
  diagnostico_principal: ResilientString,
  classificacao_ou_estadio: ResilientString,
  marcadores_chave: z.array(ResilientString).default(['não informado']),
  margens_criticas: z.array(ResilientString).default(['não informado']),
  linfonodos: z.array(ResilientString).default(['não informado']),
  doenca_a_distancia: z.array(ResilientString).default(['não informado']),
  complicacoes: z.array(ResilientString).default(['não informado']),
  limitacoes: z.array(ResilientString).default(['não informado'])
}).catch({
  diagnostico_principal: 'não informado',
  classificacao_ou_estadio: 'não informado',
  marcadores_chave: ['não informado'],
  margens_criticas: ['não informado'],
  linfonodos: ['não informado'],
  doenca_a_distancia: ['não informado'],
  complicacoes: ['não informado'],
  limitacoes: ['não informado']
});

const ChecklistLacunaSchema = z.object({
  item: ResilientString,
  por_que_importa: ResilientString
}).catch({
  item: '',
  por_que_importa: ''
});

const ChecklistReferenciaSchema = z.object({
  fonte: ResilientString,
  ano: ResilientString,
  nota: ResilientString
}).catch({
  fonte: '',
  ano: '',
  nota: ''
});

export const RadiologyChecklistSchema = z.object({
  condicao_alvo: z.object({
    nome: ResilientString,
    confianca: ConfiancaSchema,
    racional_em_1_linha: ResilientString,
    diferenciais_considerados: z.array(ChecklistDiferencialSchema).default([])
  }).catch({
    nome: '',
    confianca: 'baixa',
    racional_em_1_linha: '',
    diferenciais_considerados: []
  }),
  intencao: IntencaoSchema,
  frameworks_referenciados: z.array(ChecklistFrameworkSchema).default([]),
  checklist: z.array(ChecklistSectionSchema).default([]),
  pitfalls_rapidos: z.array(ResilientString).default([]),
  resumo_final_struct: ResumoFinalStructSchema,
  lacunas_de_informacao: z.array(ChecklistLacunaSchema).default([]),
  perguntas_que_o_radiologista_pode_fazer: z.array(ResilientString).default([]),
  referencias: z.array(ChecklistReferenciaSchema).default([]),
  markdown_para_ui: ResilientString,
  versao: ResilientString
}).catch({
  condicao_alvo: {
    nome: '',
    confianca: 'baixa',
    racional_em_1_linha: '',
    diferenciais_considerados: []
  },
  intencao: 'diagnostico',
  frameworks_referenciados: [],
  checklist: [],
  pitfalls_rapidos: [],
  resumo_final_struct: {
    diagnostico_principal: 'não informado',
    classificacao_ou_estadio: 'não informado',
    marcadores_chave: ['não informado'],
    margens_criticas: ['não informado'],
    linfonodos: ['não informado'],
    doenca_a_distancia: ['não informado'],
    complicacoes: ['não informado'],
    limitacoes: ['não informado']
  },
  lacunas_de_informacao: [],
  perguntas_que_o_radiologista_pode_fazer: [],
  referencias: [],
  markdown_para_ui: '',
  versao: 'v5'
});

// 5. Transcrição de Áudio
export const AudioTranscriptRowSchema = z.object({
  tempo: z.string(),
  orador: z.string(),
  texto: ResilientString
});

export const AudioTranscriptionSchema = z.object({
  rows: z.array(AudioTranscriptRowSchema).default([])
});

// 6. Análise Global de PDF - Agrupamento de Laudos
export const TipoPaginaSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'outro';
    const v = val.toLowerCase();
    if (v.includes('laudo')) return 'laudo_previo';
    if (v.includes('pedido')) return 'pedido_medico';
    if (v.includes('assistencial')) return 'assistencial';
    if (v.includes('administrativo')) return 'administrativo';
    if (v.includes('vazia') || v.includes('branco')) return 'pagina_vazia';
    return 'outro';
  },
  z.enum(['laudo_previo', 'pedido_medico', 'assistencial', 'administrativo', 'pagina_vazia', 'outro'])
);

export const PdfGroupSchema = z.object({
  laudo_id: z.number(),
  paginas: z.array(z.number()),
  tipo_detectado: ResilientString,
  nome_paciente: ResilientString.optional(), // Nome do paciente detectado neste grupo
  tipo_paginas: z.array(TipoPaginaSchema).optional().default([]),
  is_provisorio: z.boolean().optional().default(false),
  is_adendo: z.boolean().optional().default(false),
  confianca: ConfiancaSchema
});

export const PdfGlobalGroupingSchema = z.object({
  analise: ResilientString,
  total_laudos: z.number().default(1),
  total_paginas: z.number().default(0),
  grupos: z.array(PdfGroupSchema).default([]),
  paginas_nao_agrupadas: z.array(z.number()).optional().default([]),
  alertas: z.array(z.string()).optional().default([])
}).catch({
  analise: 'Falha na análise global',
  total_laudos: 1,
  total_paginas: 0,
  grupos: [],
  paginas_nao_agrupadas: [],
  alertas: ['Análise global falhou, usando fallback']
});

// 7. Análise Global de Imagens Soltas
export const ImageGroupSchema = z.object({
  laudo_id: z.number(),
  indices: z.array(z.number()),
  tipo_detectado: ResilientString,
  confianca: ConfiancaSchema
});

export const ImagesGlobalGroupingSchema = z.object({
  analise: ResilientString,
  total_laudos: z.number().default(1),
  grupos: z.array(ImageGroupSchema).default([]),
  alertas: z.array(z.string()).optional().default([])
}).catch({
  analise: 'Falha na análise global de imagens',
  total_laudos: 1,
  grupos: [],
  alertas: ['Análise global de imagens falhou, usando fallback']
});

// Type exports para uso no TypeScript
export type PdfGlobalGroupingResult = z.infer<typeof PdfGlobalGroupingSchema>;
export type ImagesGlobalGroupingResult = z.infer<typeof ImagesGlobalGroupingSchema>;
export type PdfGroup = z.infer<typeof PdfGroupSchema>;
export type ImageGroup = z.infer<typeof ImageGroupSchema>;
export type Laudador = z.infer<typeof LaudadorSchema>;
export type ServicoOrigem = z.infer<typeof ServicoOrigemSchema>;

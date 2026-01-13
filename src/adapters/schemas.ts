
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
const ResilientString = z.preprocess((v) => v ? String(v) : '', z.string().default(''));

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

// 3. Metadados Detalhados de Laudo
export const ReportMetadataSchema = z.object({
  tipo_exame: ResilientString,
  os: ResilientString, // NOVO: Para validação cruzada
  paciente: ResilientString, // NOVO: Para validação cruzada
  origem: OrigemSchema,
  datas_encontradas: z.array(z.object({
    rotulo: ResilientString,
    data_literal: ResilientString
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
  preview: ReportPreviewSchema,
  structured: StructuredReportBodySchema.optional(),
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

// 5. Transcrição de Áudio
export const AudioTranscriptRowSchema = z.object({
  tempo: z.string(),
  orador: z.string(),
  texto: ResilientString
});

export const AudioTranscriptionSchema = z.object({
  rows: z.array(AudioTranscriptRowSchema).default([])
});

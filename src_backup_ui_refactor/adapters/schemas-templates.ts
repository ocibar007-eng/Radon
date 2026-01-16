import { z } from 'zod';
import { ResilientString } from './schemas';

// ==============================================================
// SCHEMAS PARA TEMPLATES ADAPTATIVOS
// Adicionados para suportar diferentes tipos de documentos
// ==============================================================

/**
 * Schema para Pedido Médico / Ordem de Serviço
 */
export const PedidoMedicoDataSchema = z.object({
    tipo_documento: z.literal('pedido_medico'),
    paciente: z.object({
        nome: ResilientString,
        idade: ResilientString.optional(),
        sexo: ResilientString.optional()
    }).optional(),
    medico_solicitante: z.object({
        nome: ResilientString,
        crm: ResilientString.optional(),
        especialidade: ResilientString.optional()
    }).optional(),
    exame_solicitado: ResilientString,
    justificativa_clinica: ResilientString,
    cid: ResilientString.optional(),
    numero_pedido: ResilientString.optional(),
    data_solicitacao: ResilientString.optional(),
    observacoes: z.array(z.string()).optional().default([])
}).catch({
    tipo_documento: 'pedido_medico' as const,
    exame_solicitado: '',
    justificativa_clinica: '',
    observacoes: []
});

/**
 * Schema para Termo de Consentimento
 */
export const TermoConsentimentoDataSchema = z.object({
    tipo_documento: z.literal('termo_consentimento'),
    titulo: ResilientString,
    tipo_termo: z.enum([
        'contraste_iodado',
        'sedacao',
        'procedimento_invasivo',
        'uso_imagem',
        'outro'
    ]).optional(),
    paciente: z.object({
        nome: ResilientString,
        declaracoes: z.array(z.string()).optional().default([])
    }).optional(),
    informacoes_relevantes: z.object({
        medicacoes_em_uso: z.array(z.string()).optional().default([]),
        alergias: z.array(z.string()).optional().default([]),
        comorbidades: z.array(z.string()).optional().default([])
    }).optional(),
    data_aceite: ResilientString.optional(),
    assinatura_presente: z.boolean().optional().default(false)
}).catch({
    tipo_documento: 'termo_consentimento' as const,
    titulo: '',
    assinatura_presente: false
});

/**
 * Schema para Questionário Pré-Exame
 */
export const QuestionarioDataSchema = z.object({
    tipo_documento: z.literal('questionario'),
    tipo_exame_relacionado: ResilientString.optional(),
    secoes: z.array(z.object({
        titulo: ResilientString,
        perguntas_respostas: z.array(z.object({
            pergunta: ResilientString,
            resposta: ResilientString,
            tipo_resposta: z.enum(['texto_livre', 'sim_nao', 'multipla_escolha', 'lista']).optional()
        })).optional().default([])
    })).optional().default([]),
    sintomas_atuais: z.array(z.string()).optional().default([]),
    historico_cirurgico: z.array(z.string()).optional().default([]),
    historico_patologico: z.array(z.string()).optional().default([])
}).catch({
    tipo_documento: 'questionario' as const,
    secoes: [],
    sintomas_atuais: [],
    historico_cirurgico: [],
    historico_patologico: []
});

/**
 * Schema para Guia de Autorização
 */
export const GuiaAutorizacaoDataSchema = z.object({
    tipo_documento: z.literal('guia_autorizacao'),
    convenio: ResilientString,
    numero_guia: ResilientString,
    numero_carteirinha: ResilientString.optional(),
    beneficiario: ResilientString,
    procedimento_autorizado: ResilientString,
    codigo_procedimento: ResilientString.optional(),
    quantidade_autorizada: z.number().optional(),
    validade: ResilientString.optional(),
    observacoes: z.array(z.string()).optional().default([])
}).catch({
    tipo_documento: 'guia_autorizacao' as const,
    convenio: '',
    numero_guia: '',
    beneficiario: '',
    procedimento_autorizado: '',
    observacoes: []
});

// Export all document type schemas
export type PedidoMedicoData = z.infer<typeof PedidoMedicoDataSchema>;
export type TermoConsentimentoData = z.infer<typeof TermoConsentimentoDataSchema>;
export type QuestionarioData = z.infer<typeof QuestionarioDataSchema>;
export type GuiaAutorizacaoData = z.infer<typeof GuiaAutorizacaoDataSchema>;

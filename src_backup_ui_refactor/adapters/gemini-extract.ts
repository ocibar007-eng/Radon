

import { PedidoMedicoDataSchema, TermoConsentimentoDataSchema, QuestionarioDataSchema, GuiaAutorizacaoDataSchema } from './schemas-templates';
import type { PedidoMedicoData, TermoConsentimentoData, QuestionarioData, GuiaAutorizacaoData } from './schemas-templates';
import { generate, CONFIG, PROMPTS, safeJsonParse } from './gemini-prompts';

/**
 * ==============================================================
 * EXTRAÇÃO ESPECÍFICA POR TIPO DE DOCUMENTO (P0)
 * ==============================================================
 * Estas funções chamam a AI para extrair dados estruturados
 * de documentos não-médicos, populando os templates adaptativos.
 */

/**
 * Extrai dados estruturados de um Pedido Médico
 */
export async function extractPedidoMedicoData(verbatimText: string): Promise<PedidoMedicoData> {
    const prompt = `${PROMPTS.pedido_medico_extract}\n\nTEXTO DO DOCUMENTO:\n${verbatimText}`;

    try {
        const response = await generate(CONFIG.MODEL_NAME, {
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });

        const fallback: PedidoMedicoData = {
            tipo_documento: 'pedido_medico',
            exame_solicitado: '',
            justificativa_clinica: '',
            observacoes: []
        };

        return safeJsonParse(response.text || '{}', fallback, PedidoMedicoDataSchema);
    } catch (error) {
        console.error('[ExtractPedido] Erro:', error);
        return {
            tipo_documento: 'pedido_medico',
            exame_solicitado: '',
            justificativa_clinica: '',
            observacoes: ['Erro ao extrair dados']
        };
    }
}

/**
 * Extrai dados estruturados de um Termo de Consentimento
 */
export async function extractTermoConsentimentoData(verbatimText: string): Promise<TermoConsentimentoData> {
    const prompt = `${PROMPTS.termo_consentimento_extract}\n\nTEXTO DO DOCUMENTO:\n${verbatimText}`;

    try {
        const response = await generate(CONFIG.MODEL_NAME, {
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });

        const fallback: TermoConsentimentoData = {
            tipo_documento: 'termo_consentimento',
            titulo: '',
            assinatura_presente: false
        };

        return safeJsonParse(response.text || '{}', fallback, TermoConsentimentoDataSchema);
    } catch (error) {
        console.error('[ExtractTermo] Erro:', error);
        return {
            tipo_documento: 'termo_consentimento',
            titulo: '',
            assinatura_presente: false
        };
    }
}

/**
 * Extrai dados estruturados de um Questionário
 */
export async function extractQuestionarioData(verbatimText: string): Promise<QuestionarioData> {
    const prompt = `${PROMPTS.questionario_extract}\n\nTEXTO DO DOCUMENTO:\n${verbatimText}`;

    try {
        const response = await generate(CONFIG.MODEL_NAME, {
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });

        const fallback: QuestionarioData = {
            tipo_documento: 'questionario',
            secoes: [],
            sintomas_atuais: [],
            historico_cirurgico: [],
            historico_patologico: []
        };

        return safeJsonParse(response.text || '{}', fallback, QuestionarioDataSchema);
    } catch (error) {
        console.error('[ExtractQuestionario] Erro:', error);
        return {
            tipo_documento: 'questionario',
            secoes: [],
            sintomas_atuais: [],
            historico_cirurgico: [],
            historico_patologico: []
        };
    }
}

/**
 * Extrai dados estruturados de uma Guia de Autorização
 */
export async function extractGuiaAutorizacaoData(verbatimText: string): Promise<GuiaAutorizacaoData> {
    const prompt = `${PROMPTS.guia_autorizacao_extract}\n\nTEXTO DO DOCUMENTO:\n${verbatimText}`;

    try {
        const response = await generate(CONFIG.MODEL_NAME, {
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });

        const fallback: GuiaAutorizacaoData = {
            tipo_documento: 'guia_autorizacao',
            convenio: '',
            numero_guia: '',
            beneficiario: '',
            procedimento_autorizado: '',
            observacoes: []
        };

        return safeJsonParse(response.text || '{}', fallback, GuiaAutorizacaoDataSchema);
    } catch (error) {
        console.error('[ExtractGuia] Erro:', error);
        return {
            tipo_documento: 'guia_autorizacao',
            convenio: '',
            numero_guia: '',
            beneficiario: '',
            procedimento_autorizado: '',
            observacoes: []
        };
    }
}

/**
 * Função helper que determina qual extração chamar baseado no tipo
 */
export async function extractDocumentTypeSpecificData(
    classification: string,
    verbatimText: string
): Promise<any | null> {
    switch (classification) {
        case 'pedido_medico':
            return await extractPedidoMedicoData(verbatimText);
        case 'termo_consentimento':
            return await extractTermoConsentimentoData(verbatimText);
        case 'questionario':
            return await extractQuestionarioData(verbatimText);
        case 'guia_autorizacao':
            return await extractGuiaAutorizacaoData(verbatimText);
        default:
            return null; // laudo_previo, assistencial, etc.
    }
}

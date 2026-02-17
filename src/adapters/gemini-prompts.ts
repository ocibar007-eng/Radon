

import { getGeminiClient, fileToPart } from "../core/gemini";
import { CONFIG } from "../core/config";
import { Type, GenerateContentResponse } from "@google/genai";
import { PROMPTS } from "./gemini/prompts";
import { ReportAnalysis, ClinicalSummary, RadiologyChecklist, AttachmentDoc, AudioTranscriptRow, AppSession, PatientRegistrationDetails, DocClassification } from "../types";
import { safeJsonParse } from "../utils/json";
import { withExponentialBackoff } from "../utils/retry";
import { PatientRegistrationSchema, DocumentAnalysisSchema, ReportAnalysisSchema, ClinicalSummarySchema, RadiologyChecklistSchema, AudioTranscriptionSchema, PdfGlobalGroupingSchema, ImagesGlobalGroupingSchema, PdfGlobalGroupingResult, ImagesGlobalGroupingResult } from "./schemas";

// Re-export utilities for gemini-extract.ts
export { CONFIG, PROMPTS, safeJsonParse };

const DEBUG_LOGS = true;

// Helper para chamadas com retry
export async function generate(model: string, params: any): Promise<GenerateContentResponse> {
  const client = getGeminiClient();
  const config = params?.config ? { ...params.config } : undefined;
  if (config && !CONFIG.ENABLE_THINKING) {
    delete config.thinkingConfig;
  }
  return withExponentialBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({ model, ...params, config })
  );
}

export async function extractHeaderInfo(imageFile: File | Blob): Promise<PatientRegistrationDetails> {
  const imagePart = await fileToPart(imageFile);

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: {
      role: 'user',
      parts: [imagePart, { text: PROMPTS.header_ocr }]
    },
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: CONFIG.FAST_MODE_THINKING_BUDGET } // FAST MODE: OCR simples
    }
  });

  const fallback: PatientRegistrationDetails = {
    // Fix: Added missing 'candidatos' property to match schema
    os: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
    paciente: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
    tipo_exame: { valor: '', confianca: 'baixa', evidencia: '', candidatos: [] },
    data_exame: { valor: '', confianca: 'baixa', evidencia: '', data_normalizada: null, hora: null, candidatos: [] },
    outras_datas_encontradas: [],
    observacoes: []
  };

  return safeJsonParse(response.text || '{}', fallback, PatientRegistrationSchema);
}

export async function analyzeDocument(imageFile: File | Blob, forcedClassification?: DocClassification): Promise<{ classification: DocClassification, verbatimText: string, reportGroupHint: string, summary: string, isRecoveredBySystem: boolean }> {
  const imagePart = await fileToPart(imageFile);

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: {
      role: 'user',
      parts: [imagePart, { text: PROMPTS.doc_classify_extract }]
    },
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: CONFIG.FAST_MODE_THINKING_BUDGET } // FAST MODE: classificação simples
    }
  });

  const fallback = { classification: 'indeterminado', texto_verbatim: '', report_group_hint: '' };
  // @ts-ignore
  const result = safeJsonParse(response.text || '{}', fallback, DocumentAnalysisSchema);

  let classification: DocClassification = 'indeterminado';
  let isRecoveredBySystem = false;

  // 1. LÓGICA DE DECISÃO DE TIPO
  if (forcedClassification) {
    // Se o usuário mandou, a gente obedece.
    classification = forcedClassification;
  } else {
    // Senão, confiamos na IA + Heurísticas
    // Lista de tipos válidos que a IA pode retornar
    const validTypes = [
      'assistencial', 'laudo_previo',
      'pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao',
      'administrativo', 'pagina_vazia', 'outro'
    ];

    if (validTypes.includes(result.classification)) {
      classification = result.classification as DocClassification;
      console.log(`[Classification] IA classificou como: ${classification}`);
    }

    // Heurística Fail-Safe - SÓ se ainda for indeterminado
    if (classification === 'indeterminado' && result.texto_verbatim) {
      const upper = result.texto_verbatim.toUpperCase();

      // Verificar primeiro se é um tipo adaptativo
      if (upper.includes('GUIA DE AUTORIZAÇÃO') || upper.includes('Nº GUIA') || upper.includes('CARTEIRINHA')) {
        console.log("⚠️ Heurística: Detectado como 'guia_autorizacao'");
        classification = 'guia_autorizacao';
        isRecoveredBySystem = true;
      } else if (upper.includes('TERMO DE CONSENTIMENTO') || upper.includes('DECLARO QUE')) {
        console.log("⚠️ Heurística: Detectado como 'termo_consentimento'");
        classification = 'termo_consentimento';
        isRecoveredBySystem = true;
      } else if (upper.includes('SOLICITAÇÃO DE EXAME') || upper.includes('PEDIDO MÉDICO')) {
        console.log("⚠️ Heurística: Detectado como 'pedido_medico'");
        classification = 'pedido_medico';
        isRecoveredBySystem = true;
      } else if (upper.includes('QUESTIONÁRIO') || upper.includes('ANAMNESE')) {
        console.log("⚠️ Heurística: Detectado como 'questionario'");
        classification = 'questionario';
        isRecoveredBySystem = true;
      } else {
        // Fallback para laudo apenas se tiver palavras-chave de laudo
        const laudoKeywords = ['IMPRESSÃO DIAGNÓSTICA', 'CONCLUSÃO', 'CRM', 'ASSINADO DIGITALMENTE', 'RADIOLOGISTA', 'MEDINDO', 'CM', 'MM'];
        if (laudoKeywords.some(k => upper.includes(k)) && upper.length > 50) {
          console.log("⚠️ Heurística: Detectado como 'laudo_previo' por palavras-chave");
          classification = 'laudo_previo';
          isRecoveredBySystem = true;
        }
      }
    }
  }

  return {
    classification,
    verbatimText: result.texto_verbatim || '',
    reportGroupHint: (result.report_group_hint || '').trim(),
    summary: result.texto_verbatim ? result.texto_verbatim.substring(0, 150) + '...' : '',
    isRecoveredBySystem
  };
}

export async function groupPagesWithAI(docsMetadata: Array<{ id: string, source: string, reportGroupHint?: string }>) {
  if (docsMetadata.length <= 1) return { groups: [] };
  const prompt = PROMPTS.doc_grouping.replace('{{DOCS_LIST_JSON}}', JSON.stringify(docsMetadata, null, 2));

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json' }
  });

  return safeJsonParse(response.text || '{ "groups": [] }', { groups: [] });
}

/**
 * Análise Global de PDF - Identifica quantos laudos existem e quais páginas pertencem a cada um.
 * Esta função envia TODAS as páginas do PDF de uma vez para o modelo tomar uma decisão com contexto completo.
 */
export async function analyzePdfGlobalGrouping(pageBlobs: Blob[]): Promise<PdfGlobalGroupingResult> {
  if (pageBlobs.length === 0) {
    return {
      analise: 'PDF vazio',
      total_laudos: 0,
      total_paginas: 0,
      grupos: [],
      paginas_nao_agrupadas: [],
      alertas: ['PDF não contém páginas']
    };
  }

  if (DEBUG_LOGS) {
    console.log('[Debug][GlobalGrouping] analyzePdfGlobalGrouping:start', {
      totalPages: pageBlobs.length
    });
  }

  try {
    // Converter todas as páginas para parts do Gemini
    const pageParts = await Promise.all(
      pageBlobs.map(async (blob) => {
        return await fileToPart(blob);
      })
    );

    // Criar mensagem com todas as páginas + prompt
    const response = await generate(CONFIG.MODEL_NAME, {
      contents: {
        role: 'user',
        parts: [
          ...pageParts,
          { text: `As ${pageBlobs.length} imagens acima são as páginas de um PDF médico, na ordem em que aparecem no documento.\n\n${PROMPTS.pdf_global_grouping}` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        // Usar thinking budget maior para decisão complexa de agrupamento
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    const fallback: PdfGlobalGroupingResult = {
      analise: 'Fallback: assumindo documento único',
      total_laudos: 1,
      total_paginas: pageBlobs.length,
      grupos: [{
        laudo_id: 1,
        paginas: pageBlobs.map((_, i) => i + 1),
        tipo_detectado: 'Documento não classificado',
        tipo_paginas: pageBlobs.map(() => 'laudo_previo'),
        is_provisorio: false,
        is_adendo: false,
        confianca: 'baixa'
      }],
      paginas_nao_agrupadas: [],
      alertas: ['Análise global usou fallback - verificar manualmente']
    };

    const result = safeJsonParse(response.text || '{}', fallback, PdfGlobalGroupingSchema);

    if (DEBUG_LOGS) {
      console.log('[Debug][GlobalGrouping] analyzePdfGlobalGrouping:result', {
        totalLaudos: result.total_laudos,
        grupos: result.grupos.length,
        alertas: result.alertas
      });
    }

    return result;
  } catch (error) {
    console.error('[GlobalGrouping] Erro na análise global de PDF:', error);

    // Retornar fallback em caso de erro
    return {
      analise: 'Erro na análise - fallback aplicado',
      total_laudos: 1,
      total_paginas: pageBlobs.length,
      grupos: [{
        laudo_id: 1,
        paginas: pageBlobs.map((_, i) => i + 1),
        tipo_detectado: 'Erro de processamento',
        tipo_paginas: [],
        is_provisorio: false,
        is_adendo: false,
        confianca: 'baixa'
      }],
      paginas_nao_agrupadas: [],
      alertas: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    };
  }
}

/**
 * Análise Global de Imagens Soltas - Quando múltiplas imagens são enviadas juntas.
 * Identifica se são partes do mesmo laudo ou de laudos diferentes.
 */
export async function analyzeImagesGlobalGrouping(imageBlobs: Blob[]): Promise<ImagesGlobalGroupingResult> {
  if (imageBlobs.length <= 1) {
    return {
      analise: imageBlobs.length === 0 ? 'Nenhuma imagem' : 'Imagem única',
      total_laudos: imageBlobs.length,
      grupos: imageBlobs.length === 1 ? [{
        laudo_id: 1,
        indices: [0],
        tipo_detectado: 'Imagem única',
        confianca: 'alta'
      }] : [],
      alertas: []
    };
  }

  if (DEBUG_LOGS) {
    console.log('[Debug][GlobalGrouping] analyzeImagesGlobalGrouping:start', {
      totalImages: imageBlobs.length
    });
  }

  try {
    // Converter todas as imagens para parts do Gemini
    const imageParts = await Promise.all(
      imageBlobs.map(async (blob) => {
        return await fileToPart(blob);
      })
    );

    // Criar mensagem com todas as imagens + prompt
    const response = await generate(CONFIG.MODEL_NAME, {
      contents: {
        role: 'user',
        parts: [
          ...imageParts,
          { text: `As ${imageBlobs.length} imagens acima foram enviadas juntas pelo usuário.\n\n${PROMPTS.images_global_grouping}` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    const fallback: ImagesGlobalGroupingResult = {
      analise: 'Fallback: assumindo mesmo laudo',
      total_laudos: 1,
      grupos: [{
        laudo_id: 1,
        indices: imageBlobs.map((_, i) => i),
        tipo_detectado: 'Documento não classificado',
        confianca: 'baixa'
      }],
      alertas: ['Análise global de imagens usou fallback - verificar manualmente']
    };

    const result = safeJsonParse(response.text || '{}', fallback, ImagesGlobalGroupingSchema);

    if (DEBUG_LOGS) {
      console.log('[Debug][GlobalGrouping] analyzeImagesGlobalGrouping:result', {
        totalLaudos: result.total_laudos,
        grupos: result.grupos.length,
        alertas: result.alertas
      });
    }

    return result;
  } catch (error) {
    console.error('[GlobalGrouping] Erro na análise global de imagens:', error);

    return {
      analise: 'Erro na análise - fallback aplicado',
      total_laudos: 1,
      grupos: [{
        laudo_id: 1,
        indices: imageBlobs.map((_, i) => i),
        tipo_detectado: 'Erro de processamento',
        confianca: 'baixa'
      }],
      alertas: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    };
  }
}

export async function extractReportDetailedMetadata(fullText: string): Promise<ReportAnalysis> {
  const prompt = PROMPTS.report_structured_analysis.replace('{{TEXTO_VERBATIM}}', fullText);

  try {
    const response = await generate(CONFIG.MODEL_NAME, {
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' }
    });

    const fallback: ReportAnalysis = {
      report_metadata: {
        tipo_exame: 'Não identificado',
        os: '',
        paciente: '',
        origem: 'externo',
        datas_encontradas: [],
        data_realizacao: '',
        criterio_data_realizacao: ''
      },
      preview: { titulo: '', descricao: '' },
      possible_duplicate: { is_possible_duplicate: false, reason: null }
    };

    return safeJsonParse(response.text || '{}', fallback, ReportAnalysisSchema);
  } catch (error) {
    console.error("Erro na extração detalhada:", error);
    return {
      report_metadata: {
        tipo_exame: 'Erro de Análise',
        origem: 'externo',
        datas_encontradas: [],
        data_realizacao: '',
        criterio_data_realizacao: 'erro'
      },
      preview: { titulo: 'Erro', descricao: 'Falha ao processar detalhes.' },
      possible_duplicate: { is_possible_duplicate: false, reason: null }
    };
  }
}

export async function generateClinicalSummary(docs: AttachmentDoc[]): Promise<ClinicalSummary | null> {
  if (docs.length === 0) return null;

  // IMPORTANTE: Filtrar laudos prévios para não contaminar o resumo clínico com achados de exames anteriores.
  // O resumo deve ser baseado apenas em pedido médico, questionários, guias e documentos de suporte.
  const contextDocs = docs.filter(d => d.classification !== 'laudo_previo');

  if (contextDocs.length === 0) return null;

  const docsInput = contextDocs.map(d => ({
    doc_id: d.id,
    source: d.source,
    classification: d.classification, // Adicionar classificação para ajudar o modelo
    verbatim: d.verbatimText || ''
  }));

  const prompt = PROMPTS.clinical_summary_structured.replace('{{DOCS_JSON}}', JSON.stringify(docsInput, null, 2));

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json' }
  });

  return safeJsonParse(response.text || '{}', null, ClinicalSummarySchema);
}

export async function generateRadiologyChecklist(input: Record<string, any>): Promise<RadiologyChecklist | null> {
  const prompt = PROMPTS.checklist_generator.replace('{{INPUT_JSON}}', JSON.stringify(input, null, 2));

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json' }
  });

  const fallback: RadiologyChecklist = {
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
  };

  return safeJsonParse(response.text || '{}', fallback, RadiologyChecklistSchema);
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string, rows: AudioTranscriptRow[] }> {
  const audioPart = await fileToPart(audioBlob);

  const response = await generate(CONFIG.MODEL_AUDIO, {
    contents: {
      role: 'user',
      parts: [audioPart, { text: PROMPTS.audio_transcribe_raw }]
    },
    config: { responseMimeType: 'application/json' }
  });

  const json = safeJsonParse(response.text || '{ "rows": [] }', { rows: [] }, AudioTranscriptionSchema);
  const rows = json.rows || [];
  const text = rows.map((r: AudioTranscriptRow) => `[${r.tempo}] ${r.texto}`).join('\n');

  return { rows, text };
}

export async function compileFinalReport(session: AppSession, ocrData?: { batchName: string; jsonResult: any }): Promise<string> {
  const client = getGeminiClient();

  const previousReports = session.docs
    .filter(d => d.classification === 'laudo_previo' && d.verbatimText)
    .map((d, index) => ({
      index: index + 1,
      source: d.source,
      type: d.detailedAnalysis?.report_metadata.tipo_exame || 'Tipo Indefinido',
      realizationDate: d.detailedAnalysis?.report_metadata.data_realizacao || 'Data N/A',
      origin: d.detailedAnalysis?.report_metadata.origem || 'Desconhecida',
      verbatim: d.verbatimText
    }));

  const inputData = {
    cadastro: {
      os: session.patient?.os?.valor,
      paciente: session.patient?.paciente?.valor,
      exame: session.patient?.tipo_exame?.valor,
      data: session.patient?.data_exame?.valor
    },
    resumo_clinico_ui: session.clinicalMarkdown || "Não gerado.",
    laudos_previos: previousReports,
    transcricoes: session.audioJobs.map(j => j.transcriptRaw).join('\n---\n')
  };

  const prompt = PROMPTS.compile_markdown.replace('{{INPUT_DATA}}', JSON.stringify(inputData, null, 2));

  const response = await withExponentialBackoff<GenerateContentResponse>(() => client.models.generateContent({
    model: CONFIG.MODEL_NAME,
    contents: { role: 'user', parts: [{ text: prompt }] }
  }));

  let generatedText = response.text || '# Erro ao gerar relatório final.';

  // Injetar dados de OCR se fornecidos e vinculados ao paciente
  if (ocrData?.jsonResult) {
    try {
      // Estrutura do jsonResult: { items: [...], full_combined_text: "..." }
      const items = ocrData.jsonResult.items || [];
      const fullCombinedText = ocrData.jsonResult.full_combined_text;

      if (fullCombinedText) {
        // Usar o texto combinado completo se disponível
        const ocrSection = '\n\n---\n\n## 📷 Transcrição de Imagens USG\n\n**Dados extraídos automaticamente via OCR**\n\n' + fullCombinedText;
        generatedText += ocrSection;
      } else if (items.length > 0) {
        // Fallback: iterar sobre os items
        let ocrSection = '\n\n---\n\n## 📷 Transcrição de Imagens USG\n\n**Dados extraídos automaticamente via OCR**\n\n';
        items.forEach((item: any) => {
          const text = item.result?.full_text || '';
          if (text) {
            ocrSection += `### ${item.original_filename || item.normalized_filename}\n${text}\n\n`;
          }
        });
        generatedText += ocrSection;
      }
    } catch (e) {
      console.warn('Erro ao injetar OCR no report:', e);
    }
  }

  return generatedText;
}
/**
 * Extrai tabela com múltiplos exames de uma imagem
 */
export async function extractBatchTable(file: File): Promise<any[]> {
  const client = getGeminiClient();
  const part = await fileToPart(file);
  if (DEBUG_LOGS) {
    console.log('[Debug][Batch] extractBatchTable:start', {
      name: file.name,
      type: file.type,
      size: file.size
    });
  }

  const prompt = `Você está analisando uma imagem/PDF/screenshot que contém MÚLTIPLOS EXAMES médicos.

O documento pode estar em QUALQUER um destes formatos:

FORMATO 1 - TABELA (colunas visíveis, inclusive prints em dark mode):
- Cabeçalhos comuns: OS, Paciente, Exame, Data, Data Realiz., Entrega
- Pode haver colunas extras (Responsável, Status, Check, Ações) -> ignore

FORMATO 2 - RELATÓRIO PDF/LISTA (blocos de texto):
Exemplo:
"Origem: UBA - CRU - MATRIZ     Data O.S.: 21/01/2025
 O.S.: 870-67226-13510 - REGINA HELENA BRIGADAO CALDEIRA
 Procedimentos: TCSAF (HU)
 Entrega: 24/01/2025"

FORMATO 3 - LISTA COLORIDA WEB (linhas alternadas):
- Cada linha tem: código/OS, nome, exame, datas, checkboxes

TAREFA: Extraia TODOS os exames encontrados (todas as linhas visíveis).

MAPEAMENTO DE CAMPOS (procure em qualquer parte do texto):
- "os": coluna "OS", "O.S.", "Pedido", "Protocolo", "Nº", "Número", "N°", "ID", "Código"
  Se o OS estiver quebrado em duas linhas (ex: "870-67579-" + "10256"), una em "870-67579-10256"
- "paciente": coluna "Paciente"/"Nome"
  Se o nome estiver quebrado em linhas, una com espaço
- "tipo_exame": coluna "Exame"/"Tipo" ou linha "Procedimentos:"
  Remova siglas de unidade: (HU), (EP), etc.
- "data_exame": coluna "Data", "Data Exame", "Data Realiz.", "Data Realização", "Data O.S."
- "data_entrega": coluna "Entrega", "Data Entrega", "Prazo"

FORMATO DE SAÍDA: retorne SOMENTE um array JSON (sem markdown, sem texto extra).
Exemplo:
[
  {
    "os": "870-67226-13510",
    "paciente": "REGINA HELENA BRIGADAO CALDEIRA",
    "tipo_exame": "TCSAF",
    "data_exame": "2025-01-21",
    "data_entrega": "2025-01-24"
  }
]

REGRAS:
1. Extraia TODOS os exames (sem limites).
2. Campo vazio -> "".
3. Preserve UPPERCASE dos nomes se estiver assim.
4. Normalize datas: DD/MM/YYYY -> YYYY-MM-DD.
5. Remova parênteses dos exames: "TCSAF (HU)" -> "TCSAF".
6. Ignore colunas extras (Responsável, Médico, Status, Check).
7. Se não encontrar dados -> retorne []`;

  const response = await withExponentialBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({
      model: CONFIG.MODEL_NAME,
      contents: { role: 'user', parts: [part, { text: prompt }] },
      config: { responseMimeType: 'application/json' }
    })
  );

  const text = response.text || '[]';
  if (DEBUG_LOGS) {
    console.log('[Debug][Batch] extractBatchTable:response', {
      textPreview: text.slice(0, 300),
      textLength: text.length
    });
  }
  const json = safeJsonParse(text, []);
  const items = Array.isArray(json)
    ? json
    : Array.isArray((json as { items?: unknown[] })?.items)
      ? (json as { items: unknown[] }).items
      : Array.isArray((json as { exames?: unknown[] })?.exames)
        ? (json as { exames: unknown[] }).exames
        : [];

  if (DEBUG_LOGS) {
    console.log('[Debug][Batch] extractBatchTable:items', { count: items.length });
  }
  return items;
}

/**
 * Detecta se uma imagem contém uma tabela com múltiplos pacientes
 */
export async function detectIfTableImage(file: File): Promise<boolean> {
  const client = getGeminiClient();
  const part = await fileToPart(file);
  if (DEBUG_LOGS) {
    console.log('[Debug][Batch] detectIfTableImage:start', {
      name: file.name,
      type: file.type,
      size: file.size
    });
  }

  const prompt = `Analise esta imagem/documento e identifique se contém uma LISTA ou TABELA com MÚLTIPLOS EXAMES/PACIENTES.

Responda "sim" se houver 2+ linhas de dados com padrão repetido (OS + Paciente + Exame + Datas), mesmo que:
- seja screenshot de tabela escura ("Tabela de Trabalho") ou lista verde com checkboxes
- seja PDF renderizado, print/screenshot ou foto de tela
- OS/nomes estejam quebrados em duas linhas
- existam colunas extras (Responsável, Status, Check, Ações)

Responda "não" apenas se:
- houver apenas 1 paciente/exame isolado
- etiqueta individual de requisição
- laudo médico descritivo (texto corrido sem lista)
- documento sem padrão repetitivo

Em caso de dúvida entre lista/tabela e outro documento, responda "sim".

RESPONDA APENAS: "sim" ou "não" (lowercase, sem pontuação)`;

  const response = await withExponentialBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({
      model: CONFIG.MODEL_NAME,
      contents: { role: 'user', parts: [part, { text: prompt }] }
    })
  );

  const text = (response.text || '').toLowerCase().trim();
  if (DEBUG_LOGS) {
    console.log('[Debug][Batch] detectIfTableImage:response', { text });
  }
  return text.includes('sim');
}

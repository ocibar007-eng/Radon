
import { getGeminiClient, fileToPart } from "../core/gemini";
import { CONFIG } from "../core/config";
import { Type, GenerateContentResponse } from "@google/genai";
import { PROMPTS } from "./gemini/prompts";
import { ReportAnalysis, ClinicalSummary, AttachmentDoc, AudioTranscriptRow, AppSession, PatientRegistrationDetails, DocClassification } from "../types";
import { safeJsonParse } from "../utils/json";
import { withExponentialBackoff } from "../utils/retry";
import { PatientRegistrationSchema, DocumentAnalysisSchema, ReportAnalysisSchema, ClinicalSummarySchema, AudioTranscriptionSchema } from "./schemas";

// Helper para chamadas com retry
async function generate(model: string, params: any): Promise<GenerateContentResponse> {
  const client = getGeminiClient();
  return withExponentialBackoff<GenerateContentResponse>(() => client.models.generateContent({ model, ...params }));
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
    if (result.classification === 'assistencial' || result.classification === 'laudo_previo') {
      classification = result.classification as DocClassification;
    }

    // Heurística Fail-Safe
    if (classification === 'indeterminado' && result.texto_verbatim) {
      const upper = result.texto_verbatim.toUpperCase();
      const keywords = ['IMPRESSÃO DIAGNÓSTICA', 'CONCLUSÃO', 'CRM', 'ASSINADO DIGITALMENTE', 'RADIOLOGISTA', 'MEDINDO', 'CM', 'MM'];
      if (keywords.some(k => upper.includes(k)) && upper.length > 50) {
        console.log("⚠️ Heurística de Correção: Reclassificando documento 'Indeterminado' para 'laudo_previo' com base em palavras-chave.");
        classification = 'laudo_previo';
        isRecoveredBySystem = true;
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

  const docsInput = docs.map(d => ({
    doc_id: d.id,
    source: d.source,
    verbatim: d.verbatimText || ''
  }));

  const prompt = PROMPTS.clinical_summary_structured.replace('{{DOCS_JSON}}', JSON.stringify(docsInput, null, 2));

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json' }
  });

  return safeJsonParse(response.text || '{}', null, ClinicalSummarySchema);
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string, rows: AudioTranscriptRow[] }> {
  const audioPart = await fileToPart(audioBlob);

  const response = await generate(CONFIG.MODEL_NAME, {
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

export async function compileFinalReport(session: AppSession): Promise<string> {
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

  return response.text || '# Erro ao gerar relatório final.';
}
/**
 * Extrai tabela com múltiplos exames de uma imagem
 */
export async function extractBatchTable(file: File): Promise<any[]> {
  const client = getGeminiClient();
  const part = await fileToPart(file);

  const prompt = `Você está analisando uma imagem/PDF/screenshot que contém uma TABELA com MÚLTIPLOS EXAMES médicos.

TAREFA: Extraia TODAS as linhas de dados da tabela (ignore apenas o cabeçalho).

MAPEAMENTO DE COLUNAS (procure estas variações):
- "os": OS, Pedido, Protocolo, Nº, Número, N°, ID, Código
- "paciente": Paciente, Nome, Nome Paciente, Nome do Paciente, Patient
- "tipo_exame": Exame, Tipo, Modalidade, Tipo Exame, Tipo de Exame, Procedimento
- "data_exame": Data, Data Exame, Data Realiz., Data Realização, Data do Exame, Realização
- "data_entrega": Entrega, Data Entrega, Prazo, Data de Entrega, Delivery

NORMALIZAÇÃO DE DATAS:
- Converta SEMPRE para formato ISO: YYYY-MM-DD
- Exemplos: "09/01/2026" → "2026-01-09", "14/01/2026" → "2026-01-14"
- Se data não estiver clara, use ""

FORMATO DE SAÍDA (JSON válido):
[
  {
    "os": "870-67579-10256",
    "paciente": "DORA MARIA DE PAIVA VON GLEHN",
    "tipo_exame": "TCTORAX",
    "data_exame": "2026-01-09",
    "data_entrega": "2026-01-14"
  },
  {
    "os": "870-67579-429",
    "paciente": "LUCIANA CUNHA CASTRO LOUREIRO BORGES",
    "tipo_exame": "TCTORAX",
    "data_exame": "2026-01-09",
    "data_entrega": "2026-01-14"
  }
]

REGRAS IMPORTANTES:
1. Extraia TODAS as linhas visíveis (não limite a quantidade)
2. Se campo não encontrado → use "" (string vazia)
3. Mantenha nomes em UPPERCASE se assim estiverem na tabela
4. Se tabela não identificável ou vazia → retorne []
5. NÃO invente dados, só extraia o que está VISÍVEL`;

  const response = await withExponentialBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({
      model: CONFIG.MODEL_NAME,
      contents: { role: 'user', parts: [part, { text: prompt }] },
      generationConfig: { responseMimeType: 'application/json' }
    })
  );

  const text = response.text || '[]';
  const json = safeJsonParse(text, []);

  return Array.isArray(json) ? json : [];
}

/**
 * Detecta se uma imagem contém uma tabela com múltiplos pacientes
 */
export async function detectIfTableImage(file: File): Promise<boolean> {
  const client = getGeminiClient();
  const part = await fileToPart(file);

  const prompt = `Analise esta imagem e identifique se contém uma TABELA com MÚLTIPLOS EXAMES/PACIENTES.

CRITÉRIOS para responder "SIM":
- Tem 2 OU MAIS linhas de dados (não conte cabeçalho)
- Tem colunas como: OS/Pedido/Protocolo, Paciente/Nome, Exame/Tipo, Data
- É uma tabela/lista/planilha organizada em linhas e colunas
- Pode ser screenshot, foto de tela, PDF exportado, tabela HTML, etc.

CRITÉRIOS para responder "NÃO":
- Apenas 1 paciente/exame (cabeçalho individual, etiqueta, requisição única)
- Texto corrido sem estrutura tabular
- Laudo médico com texto descritivo

RESPONDA APENAS: "sim" ou "não" (sem pontuação, sem explicação)`;

  const response = await withExponentialBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({
      model: CONFIG.MODEL_NAME,
      contents: { role: 'user', parts: [part, { text: prompt }] }
    })
  );

  const text = (response.text || '').toLowerCase().trim();
  return text.includes('sim');
}

import { z } from 'zod';
import { generateWithExtendedThinking } from '../../../adapters/openai/client';
import { OPENAI_PROMPTS } from '../../../adapters/openai/prompts';
import { CONFIG } from '../../config';
import { safeJsonParse } from '../../../utils/json';
import type { ReportJSON } from '../../../types/report-json';
import type { CaseBundle } from '../../../types';

export type RevisorOutput = {
  revised_report: ReportJSON;
  corrections: string[];
  confidence: number;
  reasoning_tokens: number;
};

const RevisorOutputSchema = z.object({
  revised_report: z.any(), // Full ReportJSON structure
  corrections: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

function buildRevisorInput(draftReport: ReportJSON, bundle: CaseBundle): string {
  const input = {
    draft_report: draftReport,
    original_bundle: {
      dictation: bundle.dictation_raw || '',
      prior_reports: bundle.prior_reports?.raw_markdown || '',
      clinical_context: bundle.clinical_context?.raw_markdown || '',
      case_metadata: bundle.case_metadata?.fields || {},
      exam_data: bundle.exam_data?.raw_markdown || '',
    },
  };

  return JSON.stringify(input, null, 2);
}

export async function runRevisor(
  draftReport: ReportJSON,
  bundle: CaseBundle
): Promise<RevisorOutput> {
  if (!CONFIG.REVISOR_ENABLED) {
    console.log('[Revisor] Desabilitado via config. Retornando rascunho sem modificações.');
    return {
      revised_report: draftReport,
      corrections: [],
      confidence: 1.0,
      reasoning_tokens: 0,
    };
  }

  const userInput = buildRevisorInput(draftReport, bundle);

  const fallback: RevisorOutput = {
    revised_report: draftReport,
    corrections: [],
    confidence: 0.5,
    reasoning_tokens: 0,
  };

  try {
    console.log(`[Revisor] Iniciando revisão com reasoning_effort="${CONFIG.REVISOR_REASONING_EFFORT}"...`);
    const startTime = Date.now();

    const response = await generateWithExtendedThinking({
      systemPrompt: OPENAI_PROMPTS.revisor,
      userInput,
      reasoningEffort: CONFIG.REVISOR_REASONING_EFFORT,
      maxOutputTokens: 8192, // Laudo revisado pode ser longo
      timeoutMs: 180000, // 3 min para extended thinking
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Revisor] Concluído em ${elapsed}s. Reasoning tokens: ${response.reasoning_tokens}`);

    const parsed = safeJsonParse(response.text || '{}', fallback, RevisorOutputSchema);

    // Garantir que revised_report mantém estrutura de ReportJSON
    const revisedReport = {
      ...draftReport,
      ...parsed.revised_report,
      // Preservar metadata original com flag de revisão
      metadata: {
        ...draftReport.metadata,
        revised: true,
        revisor_corrections: parsed.corrections.length,
        revisor_confidence: parsed.confidence,
        revisor_reasoning_tokens: response.reasoning_tokens,
      },
    } as ReportJSON;

    return {
      revised_report: revisedReport,
      corrections: parsed.corrections || [],
      confidence: parsed.confidence || 0.5,
      reasoning_tokens: response.reasoning_tokens,
    };
  } catch (error) {
    console.warn('[Revisor] Erro na revisão, usando rascunho original:', error);
    return fallback;
  }
}

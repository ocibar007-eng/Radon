import { z } from 'zod';
import { generateOpenAIResponse } from '../../../adapters/openai/client';
import { OPENAI_PROMPTS } from '../../../adapters/openai/prompts';
import { OPENAI_MODELS } from '../../openai';
import { safeJsonParse } from '../../../utils/json';
import type { ReportJSON } from '../../../types/report-json';
import type { CaseBundle } from '../../../types';
import type { ImpressionOutput } from './types';

const ImpressionOutputSchema = z.object({
  primary_diagnosis: z.string(),
  differentials: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  indication_relation: z.array(z.string()).optional(),
  incidental_findings: z.array(z.string()).optional(),
  adverse_events: z.array(z.string()).optional(),
  criteria_assessment: z.array(z.string()).optional(),
});

function buildImpressionPrompt(
  report: ReportJSON,
  bundle: CaseBundle,
  explicitRecommendations: string[]
): string {
  const payload = {
    report,
    prior_reports: bundle.prior_reports?.raw_markdown || '',
    explicit_recommendations_from_input: explicitRecommendations,
  };

  return [
    OPENAI_PROMPTS.impression,
    'Regras adicionais:',
    '- A impressao deve ser guiada pelo exame atual. Laudos previos podem servir de guia, sem copia literal.',
    '- Nao inventar dados. Se faltar informacao essencial, use "<VERIFICAR>."',
    '- Escreva em portugues brasileiro.',
    '- Recomendacoes: apenas se estiverem explicitamente no input ou em report.evidence_recommendations.',
    '- Se nao houver recomendacoes explicitas no input nem na biblioteca, retorne recommendations como lista vazia.',
    '- Proibido meta-texto.',
    '',
    'Dados do caso (JSON):',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export async function synthesizeImpression(
  report: ReportJSON,
  bundle: CaseBundle,
  explicitRecommendations: string[] = []
): Promise<ImpressionOutput> {
  const prompt = buildImpressionPrompt(report, bundle, explicitRecommendations);

  const fallback: ImpressionOutput = {
    primary_diagnosis: '<VERIFICAR>.',
    differentials: [],
    recommendations: [],
    indication_relation: [],
    incidental_findings: [],
    adverse_events: [],
    criteria_assessment: [],
  };

  try {
    const response = await generateOpenAIResponse({
      model: OPENAI_MODELS.impression,
      input: prompt,
      responseFormat: { type: 'json_object' },
      temperature: 0,
      maxOutputTokens: 1200,
    });

    return safeJsonParse(response.text || '{}', fallback, ImpressionOutputSchema);
  } catch (error) {
    console.warn('[ImpressionAgent] OpenAI unavailable, usando fallback local.');
    return fallback;
  }
}

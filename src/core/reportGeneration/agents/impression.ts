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
});

function buildImpressionPrompt(report: ReportJSON, bundle: CaseBundle): string {
  const payload = {
    report,
    prior_reports: bundle.prior_reports?.raw_markdown || '',
  };

  return [
    OPENAI_PROMPTS.impression,
    'Regras adicionais:',
    '- A impressao deve ser guiada pelo exame atual. Laudos previos podem servir de guia, sem copia literal.',
    '- Nao inventar dados. Se faltar informacao essencial, use "<VERIFICAR>."',
    '- Proibido meta-texto.',
    '',
    'Dados do caso (JSON):',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export async function synthesizeImpression(
  report: ReportJSON,
  bundle: CaseBundle
): Promise<ImpressionOutput> {
  const prompt = buildImpressionPrompt(report, bundle);

  const response = await generateOpenAIResponse({
    model: OPENAI_MODELS.impression,
    input: prompt,
    responseFormat: { type: 'json_object' },
    temperature: 0,
    maxOutputTokens: 1200,
  });

  const fallback: ImpressionOutput = {
    primary_diagnosis: '<VERIFICAR>.',
    differentials: [],
    recommendations: [],
  };

  return safeJsonParse(response.text || '{}', fallback, ImpressionOutputSchema);
}

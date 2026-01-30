import { z } from 'zod';
import { generateOpenAIResponse } from '../../../adapters/openai/client';
import { OPENAI_PROMPTS } from '../../../adapters/openai/prompts';
import { OPENAI_MODELS } from '../../openai';
import { safeJsonParse } from '../../../utils/json';
import type { ReportJSON } from '../../../types/report-json';
import type { CaseBundle } from '../../../types';
import type { ComparisonOutput } from './types';

const ComparisonOutputSchema = z.object({
  summary: z.string(),
  mode: z.string().optional(),
  limitations: z.array(z.string()).optional(),
});

function buildComparisonPrompt(report: ReportJSON, bundle: CaseBundle): string {
  const payload = {
    report,
    comparison_mode: bundle.comparison_mode || 'none',
    prior_reports: bundle.prior_reports?.raw_markdown || '',
  };

  return [
    OPENAI_PROMPTS.comparison,
    'Regras adicionais:',
    '- Use apenas os dados fornecidos.',
    '- Se nao houver comparacao valida, indique claramente na summary.',
    '- Proibido meta-texto.',
    '',
    'Dados do caso (JSON):',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export async function generateComparisonSummary(
  report: ReportJSON,
  bundle: CaseBundle
): Promise<ComparisonOutput> {
  const prompt = buildComparisonPrompt(report, bundle);

  const response = await generateOpenAIResponse({
    model: OPENAI_MODELS.comparison,
    input: prompt,
    responseFormat: { type: 'json_object' },
    temperature: 0,
    maxOutputTokens: 800,
  });

  const fallback: ComparisonOutput = {
    summary: '<VERIFICAR>.',
    mode: bundle.comparison_mode || 'none',
    limitations: [],
  };

  return safeJsonParse(response.text || '{}', fallback, ComparisonOutputSchema);
}

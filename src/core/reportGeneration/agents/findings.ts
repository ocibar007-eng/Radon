import { z } from 'zod';
import { generate } from '../../../adapters/gemini-prompts';
import { CONFIG } from '../../config';
import { safeJsonParse } from '../../../utils/json';
import type { CaseBundle } from '../../../types';
import type { FindingsOutput } from './types';

const ComputeRequestSchema = z.object({
  formula: z.string(),
  inputs: z.record(z.any()),
  ref_id: z.string(),
});

const FindingSchema = z.object({
  finding_id: z.string().optional(),
  organ: z.string().optional(),
  description: z.string(),
  measurements: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
  })).optional(),
  compute_requests: z.array(ComputeRequestSchema).optional(),
});

const FindingsOutputSchema = z.object({
  findings: z.array(FindingSchema),
});

function buildFindingsPrompt(input: CaseBundle): string {
  return `
Voce e o Findings Agent. Gere ACHADOS por orgao/regiao seguindo o BLOCO 4.
Regras:
- Nao inventar medidas. Se medida essencial estiver ausente, use "<VERIFICAR>" depois do ponto final.
- Orgaos intestinais e pelvicos: descricao generica quando nao houver detalhes.
- Apendice: se nao citado, usar "Apendice nao visualizado com seguranca".
- Bases pulmonares/pleura/diafragma: descricao generica se sem detalhes.
- Se houver necessidade de calculo, gere compute_requests[] com formula (ID canonico), inputs e ref_id obrigatorio.
- Nao calcular manualmente.
- Retorne SOMENTE JSON valido com campos: findings[].

Dados do caso (JSON):
${JSON.stringify({
    case_id: input.case_id,
    case_metadata: input.case_metadata,
    clinical_context: input.clinical_context,
    dictation_raw: input.dictation_raw,
    exam_data: input.exam_data,
    prior_reports: input.prior_reports,
  }, null, 2)}
  `.trim();
}

export async function generateFindings(
  input: CaseBundle
): Promise<FindingsOutput> {
  const prompt = buildFindingsPrompt(input);

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
      thinkingConfig: { thinkingBudget: CONFIG.FULL_MODE_THINKING_BUDGET },
    },
  });

  const fallback: FindingsOutput = { findings: [] };
  const parsed = safeJsonParse(response.text || '{}', fallback, FindingsOutputSchema);
  return {
    findings: parsed.findings.map((finding) => ({
      ...finding,
      organ: finding.organ && finding.organ.trim().length > 0 ? finding.organ : 'Achados gerais',
    })),
  };
}

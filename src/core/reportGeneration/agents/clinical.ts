import { z } from 'zod';
import { generate } from '../../../adapters/gemini-prompts';
import { CONFIG } from '../../config';
import { safeJsonParse } from '../../../utils/json';
import type { CaseBundle } from '../../../types';
import type { ClinicalOutput } from './types';

const ClinicalOutputSchema = z.object({
  clinical_history: z.string(),
  exam_reason: z.string(),
  patient_age_group: z.string(),
  patient_sex: z.enum(['M', 'F', 'O']),
});

function buildClinicalPrompt(input: CaseBundle): string {
  return `
Voce e o Clinical Agent. Extraia a indicacao clinica com rigor tecnico.
Regras:
- Use faixa etaria OMS em minusculas (ex: "pediatrico", "adolescente", "adulto", "idoso"). Nao use idade numerica.
- Nao mencione fonte (audio, transcricao, OCR, input, prompt, anexos).
- Se faltar dado essencial, use "<VERIFICAR>" sempre depois do ponto final.
- Retorne SOMENTE JSON valido com campos: clinical_history, exam_reason, patient_age_group, patient_sex (M/F/O).

Dados do caso (JSON):
${JSON.stringify({
    case_id: input.case_id,
    case_metadata: input.case_metadata,
    clinical_context: input.clinical_context,
    dictation_raw: input.dictation_raw,
    exam_data: input.exam_data,
  }, null, 2)}
  `.trim();
}

export async function processClinicalIndication(input: CaseBundle): Promise<ClinicalOutput> {
  const prompt = buildClinicalPrompt(input);

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: CONFIG.FULL_MODE_THINKING_BUDGET },
    },
  });

  const fallback: ClinicalOutput = {
    clinical_history: '<VERIFICAR>.',
    exam_reason: '<VERIFICAR>.',
    patient_age_group: '<VERIFICAR>.',
    patient_sex: 'O',
  };

  return safeJsonParse(response.text || '{}', fallback, ClinicalOutputSchema);
}

import { z } from 'zod';
import { generate } from '../../../adapters/gemini-prompts';
import { CONFIG } from '../../config';
import { safeJsonParse } from '../../../utils/json';
import type { CaseBundle } from '../../../types';
import type { TechnicalOutput } from './types';

const TechnicalOutputSchema = z.object({
  equipment: z.string(),
  protocol: z.string(),
  contrast: z.object({
    used: z.boolean(),
    type: z.string().optional(),
    volume_ml: z.union([z.number(), z.string()]).nullable().optional(),
    phases: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
  }),
});

function buildTechnicalPrompt(input: CaseBundle): string {
  return `
Voce e o Technical Agent. Gere a tecnica e protocolo em JSON.
Regras principais:
- Para TC: equipamento SEMPRE "tomografo multislice (64 canais)".
- Contraste de TC: "Henetix" (iodado nao ionico).
- Protocolo rotina: fase portal (fase sem contraste apenas se explicita no input).
- Protocolo oncologico: pre-contraste; arterial abdome superior; portal abdome todo; equilibrio. Tardia/excretora somente se mencionada.
- Buscopan so em RM. Manitol so em entero-TC.
- Nao inventar dose/volume; so preencher volume_ml se explicitado.
- Se faltar dado essencial, use "<VERIFICAR>" sempre depois do ponto final no texto do protocolo.
- Retorne SOMENTE JSON valido com campos: equipment, protocol, contrast{used,type,volume_ml,phases}.

Dados do caso (JSON):
${JSON.stringify({
    case_id: input.case_id,
    case_metadata: input.case_metadata,
    exam_data: input.exam_data,
    protocol_type: input.protocol_type,
    dictation_raw: input.dictation_raw,
  }, null, 2)}
  `.trim();
}

export async function generateTechniqueSection(input: CaseBundle): Promise<TechnicalOutput> {
  const prompt = buildTechnicalPrompt(input);

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
      thinkingConfig: { thinkingBudget: CONFIG.FULL_MODE_THINKING_BUDGET },
    },
  });

  const fallback: TechnicalOutput = {
    equipment: '<VERIFICAR>.',
    protocol: '<VERIFICAR>.',
    contrast: { used: false },
  };

  const parsed = safeJsonParse(response.text || '{}', fallback, TechnicalOutputSchema);
  if (parsed.contrast && parsed.contrast.volume_ml === null) {
    delete (parsed.contrast as { volume_ml?: number | null }).volume_ml;
  }
  if (parsed.contrast && typeof parsed.contrast.volume_ml === 'string') {
    const normalized = parsed.contrast.volume_ml.replace(',', '.').replace(/[^\d.]/g, '');
    const value = Number.parseFloat(normalized);
    if (Number.isFinite(value)) {
      parsed.contrast.volume_ml = value;
    } else {
      delete (parsed.contrast as { volume_ml?: number | string | null }).volume_ml;
    }
  }
  if (parsed.contrast && parsed.contrast.phases === null) {
    delete (parsed.contrast as { phases?: string[] | string | null }).phases;
  }
  if (parsed.contrast && typeof parsed.contrast.phases === 'string') {
    const phases = parsed.contrast.phases
      .split(/[,;]+/)
      .map((phase) => phase.trim())
      .filter(Boolean);
    parsed.contrast.phases = phases;
  }
  return parsed;
}

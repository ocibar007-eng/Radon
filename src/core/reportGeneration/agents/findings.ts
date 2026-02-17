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

const MEASURE_NEEDED_RE = /(espessamento|estenose|colec[aã]o|abscesso|dilatac|cisto|n[óo]dulo|les[aã]o|massa)\b/i;
const HAS_MEASURE_RE = /\d+(?:[.,]\d+)?\s*(mm|cm)\b/i;

const ORGAN_RULES: Array<{ organ: string; patterns: RegExp[] }> = [
  { organ: 'Fígado', patterns: [/f[ií]gado/i, /hep[aá]t/i, /segmento hep[aá]tico/i, /lobo hep[aá]tico/i, /veias? hep[aá]ticas?/i] },
  { organ: 'Vesícula biliar e vias biliares', patterns: [/ves[ií]cula/i, /vias biliares/i, /col[eé]doco/i] },
  { organ: 'Pâncreas', patterns: [/p[âa]ncreas/i] },
  { organ: 'Baço', patterns: [/ba[çc]o/i, /esplen/i] },
  { organ: 'Rins e vias urinárias superiores', patterns: [/rim|rins|renal|pielocalic|pelvicalic|ureter/i] },
  { organ: 'Adrenais', patterns: [/adrenal/i] },
  { organ: 'Bexiga e trato urinário inferior', patterns: [/bexiga|vesical/i] },
  { organ: 'Órgãos pélvicos, útero e anexos', patterns: [/útero|utero|anexos?|ov[áa]rio/i] },
  { organ: 'Estômago e duodeno', patterns: [/est[oô]mago|gastroplasti|bypass|duodeno/i] },
  { organ: 'Intestino delgado', patterns: [/intestino delgado|al[çc]as? (ileais|intestinais)|jejuno|ileal/i] },
  { organ: 'Cólon e apêndice cecal', patterns: [/c[oó]lon|sigmoide|ap[eê]ndice|ileocec/i] },
  { organ: 'Vasos abdominais e pélvicos', patterns: [/veia porta|veia cava|aorta|vasos? abdominais?/i] },
  { organ: 'Linfonodos retroperitoneais e pélvicos', patterns: [/linfonod|linfaden/i] },
  { organ: 'Mesentério e peritônio', patterns: [/mesent[eé]rio|ascite|perit[oô]nio/i] },
  { organ: 'Parede abdominal e pélvica', patterns: [/parede abdominal|di[aá]stase|h[ée]rnia|cicatriz|subcut[aâ]neo|gl[úu]teo/i] },
  { organ: 'Estruturas ósseas', patterns: [/ossos?|coluna|escolio|degenerativ|textura mineral/i] },
  { organ: 'Bases pulmonares, pleuras basais e diafragma', patterns: [/base(s)? pulmonar(es)?|pleura|diafragma|implantes mam[aá]rios/i] },
];

function cleanDictation(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/\[\d{2}:\d{2}\]\s*/g, '')
    .replace(/\b(t[áa]|eh|e[h]?|né|ahn|hum)\b/gi, '')
    .replace(/[.]{3,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeSentence(sentence: string): string {
  let cleaned = sentence.trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(cleaned)) {
    cleaned = `${cleaned}.`;
  }
  if (MEASURE_NEEDED_RE.test(cleaned) && !HAS_MEASURE_RE.test(cleaned)) {
    cleaned = cleaned.replace(/\.*$/, '').trim() + ' <VERIFICAR>.';
  }
  return cleaned;
}

function splitSentences(raw: string): string[] {
  const lines = raw
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const line of lines) {
    const parts = line
      .split(/[.!?]\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;
    parts.forEach((part, index) => {
      const suffix = index === parts.length - 1 && /[.!?]$/.test(line) ? '' : '.';
      sentences.push(`${part}${suffix}`);
    });
  }
  return sentences;
}

function fallbackFindingsFromDictation(dictationRaw: string | undefined): FindingsOutput {
  const dictation = cleanDictation(dictationRaw);
  if (!dictation) return { findings: [] };

  const sentences = splitSentences(dictation);
  const findings: Array<{ organ: string; description: string }> = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const normalized = normalizeSentence(sentence);
    if (!normalized) continue;
    let matched = false;

    for (const rule of ORGAN_RULES) {
      if (rule.patterns.some((pattern) => pattern.test(normalized))) {
        const key = `${rule.organ}::${normalized}`;
        if (!seen.has(key)) {
          findings.push({ organ: rule.organ, description: normalized });
          seen.add(key);
        }
        matched = true;
      }
    }

    if (!matched) {
      const key = `Achados gerais::${normalized}`;
      if (!seen.has(key)) {
        findings.push({ organ: 'Achados gerais', description: normalized });
        seen.add(key);
      }
    }
  }

  return { findings };
}

function buildFindingsPrompt(input: CaseBundle, mode: 'normal' | 'retry' = 'normal'): string {
  const dictationClean = cleanDictation(input.dictation_raw);
  const strictBlock = mode === 'retry'
    ? [
      'ATENCAO: Sua ultima resposta nao foi JSON valido.',
      'Retorne SOMENTE JSON valido, sem markdown, sem texto extra.',
      'Se nao houver dados suficientes, ainda assim retorne findings com descricoes genericas.',
    ].join('\n')
    : '';

  return `
Voce e o Findings Agent. Gere ACHADOS por orgao/regiao seguindo o BLOCO 4.
Regras:
- Nao inventar medidas. Se medida essencial estiver ausente, use "<VERIFICAR>" depois do ponto final.
- Orgaos intestinais e pelvicos: descricao generica quando nao houver detalhes.
- Apendice: se nao citado, usar "Apendice nao visualizado com seguranca".
- Bases pulmonares/pleura/diafragma: descricao generica se sem detalhes.
- Se o ditado mencionar "imagem chave X", manter essa referencia no achado correspondente.
- Se houver necessidade de calculo, gere compute_requests[] com formula (ID canonico), inputs e ref_id obrigatorio.
- Nao calcular manualmente.
- Retorne SOMENTE JSON valido com campos: findings[].
${strictBlock}

Dados do caso (JSON):
${JSON.stringify({
    case_id: input.case_id,
    case_metadata: input.case_metadata,
    clinical_context: input.clinical_context,
    dictation_raw: input.dictation_raw,
    dictation_clean: dictationClean,
    exam_data: input.exam_data,
    prior_reports: input.prior_reports,
  }, null, 2)}
  `.trim();
}

export async function generateFindings(
  input: CaseBundle
): Promise<FindingsOutput> {
  const prompt = buildFindingsPrompt(input, 'normal');

  const response = await generate(CONFIG.MODEL_NAME, {
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
      thinkingConfig: { thinkingBudget: CONFIG.FULL_MODE_THINKING_BUDGET },
    },
  });

  const fallback: FindingsOutput = { findings: [] };
  let parsed = safeJsonParse(response.text || '{}', fallback, FindingsOutputSchema);

  if (parsed.findings.length === 0 && (input.dictation_raw || '').trim().length > 0) {
    const retryPrompt = buildFindingsPrompt(input, 'retry');
    const retryResponse = await generate(CONFIG.MODEL_NAME, {
      contents: { role: 'user', parts: [{ text: retryPrompt }] },
      config: {
        responseMimeType: 'application/json',
        temperature: 0,
        thinkingConfig: { thinkingBudget: CONFIG.FULL_MODE_THINKING_BUDGET },
      },
    });
    parsed = safeJsonParse(retryResponse.text || '{}', fallback, FindingsOutputSchema);
  }
  if (parsed.findings.length === 0 && (input.dictation_raw || '').trim().length > 0) {
    parsed = fallbackFindingsFromDictation(input.dictation_raw);
  }
  return {
    findings: parsed.findings.map((finding) => ({
      ...finding,
      organ: finding.organ && finding.organ.trim().length > 0 ? finding.organ : 'Achados gerais',
    })),
  };
}

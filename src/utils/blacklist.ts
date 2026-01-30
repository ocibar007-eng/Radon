/**
 * BLACKLIST: termos incorretos → termos corretos.
 * Aplicar automaticamente no renderer.
 */
export const BLACKLIST_CORRECTIONS: Record<string, string> = {
  // Ortografia
  'subsentimétrico': 'subcentimétrico',
  'subsentimetrico': 'subcentimetrico',
  'subsentimetricos': 'subcentimetricos',
  'subsentimetricas': 'subcentimetricas',

  // Terminologia
  'zonalidade': 'zonagem',
  'parênquima hepático normal': 'parênquima hepático de aspecto habitual',
  'parênquima renal normal': 'parênquima renal de aspecto habitual',
  'sem alterações': 'sem alterações significativas',
  'dentro da normalidade': 'dentro dos limites da normalidade',

  // Abreviações
  'TC': 'tomografia computadorizada',
  'RM': 'ressonância magnética',
  'USG': 'ultrassonografia',
  'RX': 'radiografia',

  // Anglicismos
  'follow-up': 'acompanhamento',
  'follow up': 'acompanhamento',
  'screening': 'rastreamento',
  'findings': 'achados',
  'enhancement': 'realce',
};

export interface BlacklistResult {
  corrected: string;
  corrections: Array<{
    original: string;
    corrected: string;
    count: number;
  }>;
}

export function applyBlacklist(text: string): BlacklistResult {
  let result = text;
  const corrections: BlacklistResult['corrections'] = [];

  for (const [wrong, correct] of Object.entries(BLACKLIST_CORRECTIONS)) {
    const isAbbrev = /^[A-Z]{2,}$/.test(wrong);
    const pattern = isAbbrev ? `\\b${wrong}\\b` : wrong;
    const regex = new RegExp(pattern, 'gi');
    const matches = result.match(regex);
    if (matches) {
      result = result.replace(regex, correct);
      corrections.push({
        original: wrong,
        corrected: correct,
        count: matches.length,
      });
    }
  }

  return { corrected: result, corrections };
}

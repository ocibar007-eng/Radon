/**
 * BANLIST: frases que NUNCA devem aparecer no laudo final.
 * Use frases específicas, NÃO palavras soltas (evita falsos positivos).
 */
export const BANLIST_PHRASES = [
  // Meta-referências ao input
  'conforme áudio',
  'conforme o áudio',
  'segundo o áudio',
  'de acordo com o áudio',
  'conforme ditado',
  'segundo ditado',
  'conforme transcrição',
  'conforme transcricao',
  'conforme a transcrição',
  'segundo a transcrição',
  'conforme input',
  'conforme o input',
  'no input',
  'do input',
  'conforme anexo',
  'conforme os anexos',
  'segundo anexo',
  'no anexo',
  'conforme ocr',
  'segundo ocr',

  // Auto-referências ao laudo
  'neste laudo',
  'neste exame',
  'no presente laudo',
  'no presente exame',
  'nesta análise',
  'achados acima',
  'os achados acima',
  'conforme descrito acima',
  'como descrito acima',
  'vide acima',
  'na impressão',
  'na impressão acima',
  'conforme impressão',

  // Meta-linguagem
  'cabe ressaltar',
  'é importante notar',
  'vale destacar',
  'importante ressaltar',
  'importante destacar',
  'nota-se que',
  'observa-se que',
  'destaca-se que',
  'salienta-se que',

  // Referências ao prompt/sistema
  'conforme solicitado',
  'como solicitado',
  'conforme instruções',
  'conforme as instruções',
];

export interface BanlistResult {
  passed: boolean;
  violations: Array<{
    phrase: string;
    index: number;
  }>;
}

export function checkBanlist(text: string): BanlistResult {
  const normalizedText = text.toLowerCase();
  const violations: BanlistResult['violations'] = [];

  for (const phrase of BANLIST_PHRASES) {
    const index = normalizedText.indexOf(phrase.toLowerCase());
    if (index !== -1) {
      violations.push({ phrase, index });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

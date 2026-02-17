import { z } from 'zod';
import { generateOpenAIResponse } from '../../adapters/openai/client';
import { OPENAI_MODELS } from '../openai';
import { safeJsonParse } from '../../utils/json';

const TranslationSchema = z.object({
  translated: z.array(z.string()),
});

const ENGLISH_HINTS: RegExp[] = [
  /\bfollow-?up\b/i,
  /\bmonths?\b/i,
  /\bweeks?\b/i,
  /\bif no change\b/i,
  /\blow-?risk\b/i,
  /\bhigh-?risk\b/i,
  /\bfor nodules?\b/i,
  /\binitial\b/i,
  /\bthen at\b/i,
  /\bct\b/i,
];

function isLikelyEnglish(text: string): boolean {
  return ENGLISH_HINTS.some((hint) => hint.test(text));
}

export async function localizeRecommendationsToPt(recommendations: string[]): Promise<string[]> {
  if (!recommendations || recommendations.length === 0) return [];
  const needsTranslation = recommendations.some((rec) => isLikelyEnglish(rec));
  if (!needsTranslation) return recommendations;

  try {
    const prompt = [
      'Você é um tradutor médico.',
      'Traduza as recomendações para português brasileiro.',
      'Preserve números, unidades e intervalos exatamente como no texto original.',
      'Não adicione novas recomendações nem remova conteúdo.',
      'Retorne SOMENTE JSON válido no formato:',
      '{ "translated": ["..."] }',
      '',
      'Recomendações:',
      JSON.stringify(recommendations, null, 2),
    ].join('\n');

    const response = await generateOpenAIResponse({
      model: OPENAI_MODELS.impression,
      input: prompt,
      responseFormat: { type: 'json_object' },
      temperature: 0,
      maxOutputTokens: 800,
    });

    const fallback = { translated: recommendations };
    const parsed = safeJsonParse(response.text || '{}', fallback, TranslationSchema);

    if (!Array.isArray(parsed.translated) || parsed.translated.length !== recommendations.length) {
      return recommendations;
    }

    return parsed.translated;
  } catch (error) {
    console.warn('[RecommendationLocalizer] Failed to translate recommendations:', error);
    return recommendations;
  }
}

const DEFAULT_COMPARISON_MODEL = 'gpt-5.2-2025-12-11';
const DEFAULT_IMPRESSION_MODEL = 'gpt-5.2-2025-12-11';
const DEFAULT_RENDERER_MODEL = 'gpt-5.2-2025-12-11';

let cachedKey: string | null = null;

export const getOpenAIKey = () => {
  if (!cachedKey) {
    const rawKey = process.env.OPENAI_API_KEY;
    if (!rawKey) {
      console.error('❌ OPENAI_API_KEY is missing in process.env!');
      throw new Error('OPENAI_API_KEY not found in environment');
    }

    cachedKey = rawKey.replace(/^"|"$/g, '').trim();
  }
  return cachedKey;
};

export const OPENAI_MODELS = {
  comparison: process.env.OPENAI_MODEL_COMPARISON || DEFAULT_COMPARISON_MODEL,
  impression: process.env.OPENAI_MODEL_IMPRESSION || DEFAULT_IMPRESSION_MODEL,
  renderer: process.env.OPENAI_MODEL_RENDERER || DEFAULT_RENDERER_MODEL,
};

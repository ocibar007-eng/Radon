export const CONFIG = {
  MODEL_NAME: 'gemini-3-flash-preview',
  MODEL_FAST: 'gemini-2.5-flash', // Fallback para tarefas simples
  MAX_CONCURRENCY: 2,
  // Thinking Budget: 0 = desativa pensamento (rápido), -1 = dinâmico, N = tokens fixos
  FAST_MODE_THINKING_BUDGET: 0,    // Para OCR de etiquetas (não precisa raciocinar)
  FULL_MODE_THINKING_BUDGET: 1024, // Para resumo clínico (precisa analisar)
};

export const PROMPTS = {
  SYSTEM_INSTRUCTION: 'You are an expert radiology assistant. Be precise, concise, and use medical terminology correctly.',
};

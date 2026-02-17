export const CONFIG = {
  // Modelos Gemini
  MODEL_NAME: process.env.GEMINI_MODEL_NAME || 'gemini-3-flash-preview', // Agentes principais
  MODEL_AUDIO: process.env.GEMINI_MODEL_AUDIO || 'gemini-3-flash-preview',
  MODEL_FAST: 'gemini-2.0-flash', // Standardize on efficient model
  MODEL_OCR: 'gemini-2.0-flash', // OCR continua no 2.0 (rápido e barato)
  MAX_CONCURRENCY: 2,
  // Thinking Budget: 0 = desativa pensamento (rápido), -1 = dinâmico, N = tokens fixos
  FAST_MODE_THINKING_BUDGET: 0,    // Para OCR de etiquetas (não precisa raciocinar)
  FULL_MODE_THINKING_BUDGET: 1024, // Para resumo clínico (precisa analisar)
  ENABLE_THINKING: process.env.GEMINI_ENABLE_THINKING === '1',

  // OpenAI Revisor com Extended Thinking
  // NOTA: Requer Vercel Pro (maxDuration > 10s) ou desabilitar com REVISOR_ENABLED=0
  REVISOR_ENABLED: process.env.REVISOR_ENABLED === '1', // Default: desabilitado (timeout issues)
  REVISOR_REASONING_EFFORT: (process.env.REVISOR_REASONING_EFFORT || 'medium') as 'low' | 'medium' | 'high',
  REVISOR_MODEL: 'gpt-5.2-2025-12-11',

  // OpenAI Draft (Pré-Laudo IA com GPT)
  // Default: habilitado. Use OPENAI_DRAFT_ENABLED=0 para desligar.
  OPENAI_DRAFT_ENABLED: process.env.OPENAI_DRAFT_ENABLED !== '0',
  OPENAI_DRAFT_MODEL: process.env.OPENAI_DRAFT_MODEL || 'gpt-5.2-2025-12-11',
  OPENAI_DRAFT_CORRECTION_MODEL: process.env.OPENAI_DRAFT_CORRECTION_MODEL
    || process.env.OPENAI_DRAFT_MODEL
    || 'gpt-5.2-2025-12-11',
  OPENAI_DRAFT_MAX_TOKENS: Number(process.env.OPENAI_DRAFT_MAX_TOKENS || '8192'),
  OPENAI_DRAFT_REASONING_EFFORT: (process.env.OPENAI_DRAFT_REASONING_EFFORT || 'high') as 'low' | 'medium' | 'high' | 'xhigh',

  // Claude API (Super Agent para laudos)
  // Default: habilitado. Use CLAUDE_REPORT_ENABLED=0 para desligar.
  // Requer ANTHROPIC_API_KEY configurada no .env.local ou Vercel.
  CLAUDE_REPORT_ENABLED: process.env.CLAUDE_REPORT_ENABLED !== '0',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
  CLAUDE_CORRECTION_MODEL: process.env.CLAUDE_CORRECTION_MODEL || 'claude-sonnet-4-5',
  CLAUDE_MAX_TOKENS: 8192,
  CLAUDE_MONTHLY_BUDGET_BRL: Number(process.env.CLAUDE_MONTHLY_BUDGET_BRL || '1000'),
};

export const PROMPTS = {
  SYSTEM_INSTRUCTION: 'You are an expert radiology assistant. Be precise, concise, and use medical terminology correctly.',
};

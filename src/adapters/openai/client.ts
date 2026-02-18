import { getOpenAIKey } from '../../core/openai.ts';
import { withExponentialBackoff } from '../../utils/retry.ts';
import { CONFIG } from '../../core/config.ts';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export type OpenAIResponseText = {
  text: string;
  raw: any;
};

export type ExtendedThinkingResponse = {
  text: string;
  reasoning_tokens: number;
  raw: any;
};

export type OpenAIReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export type OpenAIUsage = {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
};

export type OpenAIChatCompletionResponse = {
  text: string;
  usage: OpenAIUsage;
  finish_reason: string | null;
  reasoning?: string;
  raw: any;
};

export type OpenAIResponseParams = {
  model: string;
  input: string;
  responseFormat?: Record<string, any>;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

function extractText(payload: any): string {
  if (typeof payload?.output_text === 'string') {
    return payload.output_text;
  }
  const output = payload?.output;
  if (Array.isArray(output)) {
    const chunks = output
      .flatMap((item: any) => item?.content || [])
      .map((content: any) => content?.text || content?.output_text || '')
      .filter(Boolean);
    if (chunks.length > 0) return chunks.join('');
  }
  const choice = payload?.choices?.[0]?.message?.content;
  if (typeof choice === 'string') return choice;
  return '';
}

function extractChatText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text || '')
      .filter(Boolean)
      .join('');
  }
  return extractText(payload);
}

function extractReasoningText(payload: any): string | undefined {
  const message = payload?.choices?.[0]?.message;

  const directReasoning = message?.reasoning;
  if (typeof directReasoning === 'string' && directReasoning.trim()) {
    return directReasoning;
  }

  if (Array.isArray(directReasoning)) {
    const merged = directReasoning
      .map((item: any) => item?.text || item?.summary || '')
      .filter(Boolean)
      .join('\n');
    if (merged.trim()) return merged;
  }

  const output = payload?.output;
  if (Array.isArray(output)) {
    const merged = output
      .flatMap((item: any) => item?.content || [])
      .filter((item: any) => typeof item?.type === 'string' && item.type.includes('reasoning'))
      .map((item: any) => item?.text || item?.summary || '')
      .filter(Boolean)
      .join('\n');
    if (merged.trim()) return merged;
  }

  return undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function generateOpenAIResponse(params: OpenAIResponseParams): Promise<OpenAIResponseText> {
  const apiKey = getOpenAIKey();
  const {
    model,
    input,
    responseFormat,
    maxOutputTokens,
    temperature,
    timeoutMs = 30000,
  } = params;

  const body: Record<string, any> = {
    model,
    input,
  };

  if (responseFormat) {
    body.text = { format: responseFormat };
  }
  if (typeof maxOutputTokens === 'number') body.max_output_tokens = maxOutputTokens;
  if (typeof temperature === 'number') body.temperature = temperature;

  const response = await withExponentialBackoff(async () => {
    const res = await fetchWithTimeout(`${OPENAI_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, timeoutMs);

    if (!res.ok) {
      const errorText = await res.text();
      const err: any = new Error(`OpenAI error ${res.status}: ${errorText}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  });

  return {
    text: extractText(response),
    raw: response,
  };
}

export type OpenAIChatCompletionParams = {
  model: string;
  systemPrompt: string;
  userMessage: string;
  reasoningEffort?: OpenAIReasoningEffort;
  maxCompletionTokens?: number;
  timeoutMs?: number;
  temperature?: number;
};

export type OpenAIChatCompletionStreamCallbacks = {
  onTextDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: OpenAIUsage) => void;
};

function extractDeltaText(payload: any): string {
  const deltaContent = payload?.choices?.[0]?.delta?.content;
  if (typeof deltaContent === 'string') return deltaContent;
  if (Array.isArray(deltaContent)) {
    return deltaContent
      .map((item: any) => item?.text || item?.content || '')
      .filter(Boolean)
      .join('');
  }
  return '';
}

function extractDeltaReasoning(payload: any): string | undefined {
  const delta = payload?.choices?.[0]?.delta;
  if (!delta) return undefined;

  const direct = delta.reasoning ?? delta.reasoning_content;
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  if (Array.isArray(direct)) {
    const merged = direct
      .map((item: any) => item?.text || item?.summary || '')
      .filter(Boolean)
      .join('\n');
    if (merged.trim()) return merged;
  }

  const content = delta.content;
  if (Array.isArray(content)) {
    const merged = content
      .filter((item: any) => typeof item?.type === 'string' && item.type.includes('reasoning'))
      .map((item: any) => item?.text || item?.summary || '')
      .filter(Boolean)
      .join('\n');
    if (merged.trim()) return merged;
  }

  return undefined;
}

function extractUsage(payload: any, fallback?: OpenAIUsage): OpenAIUsage {
  return {
    input_tokens: Number(payload?.usage?.prompt_tokens ?? fallback?.input_tokens ?? 0),
    output_tokens: Number(payload?.usage?.completion_tokens ?? fallback?.output_tokens ?? 0),
    reasoning_tokens: Number(
      payload?.usage?.completion_tokens_details?.reasoning_tokens
      ?? fallback?.reasoning_tokens
      ?? 0,
    ),
  };
}

function drainSSEDataBuffer(
  rawBuffer: string,
  onData: (data: string) => void,
): string {
  let buffer = rawBuffer;

  while (true) {
    const boundary = buffer.indexOf('\n\n');
    if (boundary === -1) break;

    const eventBlock = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 2);

    const dataLines: string[] = [];
    for (const line of eventBlock.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) continue;
    onData(dataLines.join('\n'));
  }

  return buffer;
}

export async function generateOpenAIChatCompletion(
  params: OpenAIChatCompletionParams
): Promise<OpenAIChatCompletionResponse> {
  const apiKey = getOpenAIKey();
  const {
    model,
    systemPrompt,
    userMessage,
    reasoningEffort,
    maxCompletionTokens = 8192,
    timeoutMs = 180000,
    temperature,
  } = params;

  const body: Record<string, any> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_completion_tokens: maxCompletionTokens,
  };

  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }
  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }

  const response = await withExponentialBackoff(async () => {
    const res = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, timeoutMs);

    if (!res.ok) {
      const errorText = await res.text();
      const err: any = new Error(`OpenAI Chat Completion error ${res.status}: ${errorText}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  });

  const usage: OpenAIUsage = {
    input_tokens: Number(response?.usage?.prompt_tokens ?? 0),
    output_tokens: Number(response?.usage?.completion_tokens ?? 0),
    reasoning_tokens: Number(response?.usage?.completion_tokens_details?.reasoning_tokens ?? 0),
  };

  return {
    text: extractChatText(response),
    usage,
    finish_reason: response?.choices?.[0]?.finish_reason ?? null,
    reasoning: extractReasoningText(response),
    raw: response,
  };
}

export async function streamOpenAIChatCompletion(
  params: OpenAIChatCompletionParams & OpenAIChatCompletionStreamCallbacks
): Promise<OpenAIChatCompletionResponse> {
  const apiKey = getOpenAIKey();
  const {
    model,
    systemPrompt,
    userMessage,
    reasoningEffort,
    maxCompletionTokens = 8192,
    timeoutMs = 300000,
    temperature,
    onTextDelta,
    onReasoningDelta,
    onUsage,
  } = params;

  const body: Record<string, any> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_completion_tokens: maxCompletionTokens,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }
  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      const err: any = new Error(`OpenAI Chat Completion stream error ${res.status}: ${errorText}`);
      err.status = res.status;
      throw err;
    }

    if (!res.body) {
      throw new Error('OpenAI stream response body is empty.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let accumulatedText = '';
    let accumulatedReasoning = '';
    let usage: OpenAIUsage = { input_tokens: 0, output_tokens: 0, reasoning_tokens: 0 };
    let finishReason: string | null = null;
    let lastPayload: any = null;

    const handleData = (data: string) => {
      if (!data || data === '[DONE]') return;

      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      lastPayload = payload;

      const textDelta = extractDeltaText(payload);
      if (textDelta) {
        accumulatedText += textDelta;
        onTextDelta?.(textDelta);
      }

      const reasoningDelta = extractDeltaReasoning(payload);
      if (reasoningDelta) {
        accumulatedReasoning += reasoningDelta;
        onReasoningDelta?.(reasoningDelta);
      }

      if (payload?.usage) {
        usage = extractUsage(payload, usage);
        onUsage?.(usage);
      }

      const chunkFinish = payload?.choices?.[0]?.finish_reason;
      if (typeof chunkFinish === 'string' && chunkFinish.trim()) {
        finishReason = chunkFinish;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      buffer = drainSSEDataBuffer(buffer, handleData);
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer.trim()) {
      drainSSEDataBuffer(`${buffer}\n\n`, handleData);
    }

    usage = extractUsage(lastPayload, usage);

    return {
      text: accumulatedText,
      usage,
      finish_reason: finishReason,
      reasoning: accumulatedReasoning || undefined,
      raw: lastPayload ?? null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isOpenAIAvailable(): boolean {
  try {
    getOpenAIKey();
    return true;
  } catch {
    return false;
  }
}

export type ExtendedThinkingParams = {
  systemPrompt: string;
  userInput: string;
  reasoningEffort?: OpenAIReasoningEffort;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export async function generateWithExtendedThinking(
  params: ExtendedThinkingParams
): Promise<ExtendedThinkingResponse> {
  const apiKey = getOpenAIKey();
  const {
    systemPrompt,
    userInput,
    reasoningEffort = CONFIG.REVISOR_REASONING_EFFORT,
    maxOutputTokens = 4096,
    timeoutMs = 120000, // 2 min for extended thinking
  } = params;

  const body = {
    model: CONFIG.REVISOR_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    reasoning_effort: reasoningEffort,
    response_format: { type: 'json_object' },
    max_completion_tokens: maxOutputTokens,
  };

  const response = await withExponentialBackoff(async () => {
    const res = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, timeoutMs);

    if (!res.ok) {
      const errorText = await res.text();
      const err: any = new Error(`OpenAI Extended Thinking error ${res.status}: ${errorText}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  });

  const text = response?.choices?.[0]?.message?.content || '';
  const reasoningTokens = response?.usage?.completion_tokens_details?.reasoning_tokens || 0;

  return {
    text,
    reasoning_tokens: reasoningTokens,
    raw: response,
  };
}

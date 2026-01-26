import { getOpenAIKey } from '../../core/openai';
import { withExponentialBackoff } from '../../utils/retry';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export type OpenAIResponseText = {
  text: string;
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

  if (responseFormat) body.response_format = responseFormat;
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
      throw new Error(`OpenAI error ${res.status}: ${errorText}`);
    }

    return res.json();
  });

  return {
    text: extractText(response),
    raw: response,
  };
}

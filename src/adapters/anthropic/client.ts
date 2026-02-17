/**
 * Anthropic Claude API Client
 *
 * HTTP client for the Anthropic Messages API, following the same patterns
 * as the existing OpenAI adapter (src/adapters/openai/client.ts).
 *
 * Features:
 * - Prompt caching (reduces cost by ~90% on system prompt)
 * - Exponential backoff retry (reuses withExponentialBackoff)
 * - Configurable timeout (default 2 min for long reports)
 * - Usage tracking (input/output/cache tokens)
 */

import { withExponentialBackoff } from '../../utils/retry.ts';
import type {
    AnthropicRawResponse,
    AnthropicRequestBody,
    AnthropicResponse,
    AnthropicTextBlock,
    AnthropicTextContentBlock,
    AnthropicThinkingBlock,
    AnthropicUsage,
    AnthropicStopReason,
} from './types.ts';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const PROMPT_CACHING_BETA = 'prompt-caching-2024-07-31';

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

function getAnthropicKey(): string {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        throw new Error(
            'ANTHROPIC_API_KEY não configurada. Adicione ao .env.local ou Vercel.'
        );
    }
    return key;
}

// ============================================================================
// HELPERS
// ============================================================================

function extractText(response: AnthropicRawResponse): string {
    if (!response.content || response.content.length === 0) return '';
    return response.content
        .filter((block): block is AnthropicTextContentBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
}

function extractThinking(response: AnthropicRawResponse): string | undefined {
    if (!response.content || response.content.length === 0) return undefined;
    const thinkingBlocks = response.content
        .filter((block): block is AnthropicThinkingBlock => block.type === 'thinking')
        .map((block) => block.thinking);
    return thinkingBlocks.length > 0 ? thinkingBlocks.join('\n') : undefined;
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

// ============================================================================
// MAIN CLIENT
// ============================================================================

export type GenerateClaudeParams = {
    systemPrompt: string;
    userMessage: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    enableCaching?: boolean;
    /**
     * Legacy compatibility:
     * - true: thinking on
     * - false: thinking off
     */
    enableThinking?: boolean;
    /**
     * Legacy compatibility for manual thinking budget.
     * Prefer using `thinkingMode`.
     */
    thinkingBudget?: number;
    /**
     * Thinking control:
     * - off: disable thinking
     * - adaptive: enabled with default budget
     * - manual: enabled with explicit budget
     */
    thinkingMode?: 'off' | 'adaptive' | 'manual';
};

type ResolvedThinking = {
    enabled: boolean;
    budget: number;
};

function resolveThinking(params: GenerateClaudeParams): ResolvedThinking {
    if (params.thinkingMode) {
        if (params.thinkingMode === 'off') {
            return { enabled: false, budget: 0 };
        }
        if (params.thinkingMode === 'manual') {
            const budget = Math.max(256, params.thinkingBudget ?? 2048);
            return { enabled: true, budget };
        }
        return { enabled: true, budget: 2048 };
    }

    // Backward-compatible branch
    const enabled = params.enableThinking ?? true;
    if (!enabled) return { enabled: false, budget: 0 };
    return { enabled: true, budget: Math.max(256, params.thinkingBudget ?? 10000) };
}

/**
 * Gera uma resposta usando a API Claude Messages.
 *
 * @example
 * const result = await generateClaudeResponse({
 *   systemPrompt: CLAUDE_SYSTEM_PROMPT,
 *   userMessage: buildCaseMessage(caseBundle),
 * });
 * console.log(result.text);       // laudo gerado
 * console.log(result.usage);      // { input_tokens, output_tokens, ... }
 */
export async function generateClaudeResponse(
    params: GenerateClaudeParams
): Promise<AnthropicResponse> {
    const apiKey = getAnthropicKey();
    const {
        systemPrompt,
        userMessage,
        model = process.env.CLAUDE_MODEL || 'claude-opus-4-6',
        maxTokens = 16384,
        temperature,
        timeoutMs = 300_000, // 5 min — extended thinking + inputs grandes
        enableCaching = true,
    } = params;
    const resolvedThinking = resolveThinking(params);

    // Extended thinking requires temperature = 1
    const effectiveTemperature = resolvedThinking.enabled ? 1 : (temperature ?? 0);

    // Build system blocks (with optional caching)
    const systemBlocks: AnthropicTextBlock[] = [
        {
            type: 'text',
            text: systemPrompt,
            ...(enableCaching ? { cache_control: { type: 'ephemeral' as const, ttl: '1h' as const } } : {}),
        },
    ];

    const body: AnthropicRequestBody = {
        model,
        max_tokens: maxTokens,
        system: systemBlocks,
        messages: [{ role: 'user', content: userMessage }],
        temperature: effectiveTemperature,
        ...(resolvedThinking.enabled ? {
            thinking: { type: 'enabled' as const, budget_tokens: resolvedThinking.budget },
        } : {}),
    };

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
    };
    // Beta features
    const betaFeatures: string[] = [];
    if (enableCaching) betaFeatures.push(PROMPT_CACHING_BETA);
    if (betaFeatures.length > 0) {
        headers['anthropic-beta'] = betaFeatures.join(',');
    }

    const rawResponse = await withExponentialBackoff(async () => {
        const res = await fetchWithTimeout(
            `${ANTHROPIC_BASE_URL}/messages`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            },
            timeoutMs
        );

        if (!res.ok) {
            const errorText = await res.text();
            const err: any = new Error(
                `Anthropic error ${res.status}: ${errorText}`
            );
            err.status = res.status;
            throw err;
        }

        return res.json() as Promise<AnthropicRawResponse>;
    });

    return {
        text: extractText(rawResponse),
        thinking: extractThinking(rawResponse),
        usage: rawResponse.usage,
        raw: rawResponse,
    };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Verifica se a API key está configurada e válida.
 * Não faz chamada real — apenas verifica a presença da key.
 */
export function isClaudeAvailable(): boolean {
    try {
        getAnthropicKey();
        return true;
    } catch {
        return false;
    }
}

// ============================================================================
// STREAMING CLIENT
// ============================================================================

export type StreamChunk =
    | { type: 'thinking_delta'; text: string }
    | { type: 'text_delta'; text: string }
    | { type: 'usage'; usage: AnthropicUsage }
    | { type: 'stop'; stopReason: AnthropicStopReason }
    | { type: 'error'; error: string };

/**
 * Streaming version — yields chunks as Claude generates them.
 * Uses Anthropic SSE streaming API (`stream: true`).
 *
 * @example
 * for await (const chunk of generateClaudeResponseStreaming(params)) {
 *   if (chunk.type === 'text_delta') process.stdout.write(chunk.text);
 * }
 */
export async function* generateClaudeResponseStreaming(
    params: GenerateClaudeParams
): AsyncGenerator<StreamChunk> {
    const apiKey = getAnthropicKey();
    const {
        systemPrompt,
        userMessage,
        model = process.env.CLAUDE_MODEL || 'claude-opus-4-6',
        maxTokens = 16384,
        temperature,
        timeoutMs = 300_000,
        enableCaching = true,
    } = params;
    const resolvedThinking = resolveThinking(params);

    const effectiveTemperature = resolvedThinking.enabled ? 1 : (temperature ?? 0);

    const systemBlocks: AnthropicTextBlock[] = [
        {
            type: 'text',
            text: systemPrompt,
            ...(enableCaching ? { cache_control: { type: 'ephemeral' as const, ttl: '1h' as const } } : {}),
        },
    ];

    const body: AnthropicRequestBody & { stream: boolean } = {
        model,
        max_tokens: maxTokens,
        system: systemBlocks,
        messages: [{ role: 'user', content: userMessage }],
        temperature: effectiveTemperature,
        stream: true,
        ...(resolvedThinking.enabled ? {
            thinking: { type: 'enabled' as const, budget_tokens: resolvedThinking.budget },
        } : {}),
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
    };
    const betaFeatures: string[] = [];
    if (enableCaching) betaFeatures.push(PROMPT_CACHING_BETA);
    if (betaFeatures.length > 0) {
        headers['anthropic-beta'] = betaFeatures.join(',');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errorText = await res.text();
            yield { type: 'error', error: `Anthropic error ${res.status}: ${errorText}` };
            return;
        }

        if (!res.body) {
            yield { type: 'error', error: 'No response body for streaming' };
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let latestStopReason: AnthropicStopReason = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const event = JSON.parse(jsonStr);

                        if (event.type === 'content_block_delta') {
                            if (event.delta?.type === 'thinking_delta') {
                                yield { type: 'thinking_delta', text: event.delta.thinking };
                            } else if (event.delta?.type === 'text_delta') {
                                yield { type: 'text_delta', text: event.delta.text };
                            }
                        } else if (event.type === 'message_delta') {
                            const stopReason = event?.delta?.stop_reason as AnthropicStopReason | undefined;
                            if (typeof stopReason !== 'undefined') {
                                latestStopReason = stopReason;
                            }
                            if (event.usage) {
                                yield { type: 'usage', usage: event.usage };
                            }
                        } else if (event.type === 'message_start' && event.message?.usage) {
                            yield { type: 'usage', usage: event.message.usage };
                        } else if (event.type === 'message_stop') {
                            yield { type: 'stop', stopReason: latestStopReason };
                        } else if (event.type === 'error') {
                            yield { type: 'error', error: event.error?.message || 'Unknown streaming error' };
                        }
                    } catch {
                        // Skip unparseable lines
                    }
                }
            }
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

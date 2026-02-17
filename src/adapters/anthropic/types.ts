/**
 * Types for the Anthropic Claude API adapter.
 *
 * Based on: https://docs.anthropic.com/en/api/messages
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

export type AnthropicCacheControl = {
    type: 'ephemeral';
    ttl?: '5m' | '1h';
};

export type AnthropicTextBlock = {
    type: 'text';
    text: string;
    cache_control?: AnthropicCacheControl;
};

export type AnthropicMessage = {
    role: 'user' | 'assistant';
    content: string | AnthropicTextBlock[];
};

export type AnthropicThinkingParam = {
    type: 'enabled';
    budget_tokens: number;
};

export type AnthropicRequestBody = {
    model: string;
    max_tokens: number;
    system?: AnthropicTextBlock[];
    messages: AnthropicMessage[];
    temperature?: number;
    top_p?: number;
    thinking?: AnthropicThinkingParam;
    metadata?: { user_id?: string };
};

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export type AnthropicTextContentBlock = {
    type: 'text';
    text: string;
};

export type AnthropicThinkingBlock = {
    type: 'thinking';
    thinking: string;
};

export type AnthropicContentBlock = AnthropicTextContentBlock | AnthropicThinkingBlock;

export type AnthropicUsage = {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
};

export type AnthropicRawResponse = {
    id: string;
    type: 'message';
    role: 'assistant';
    content: AnthropicContentBlock[];
    model: string;
    stop_reason: AnthropicStopReason;
    usage: AnthropicUsage;
};

export type AnthropicStopReason =
    | 'end_turn'
    | 'max_tokens'
    | 'stop_sequence'
    | 'tool_use'
    | null;

export type AnthropicResponse = {
    text: string;
    thinking?: string;
    usage: AnthropicUsage;
    raw: AnthropicRawResponse;
};

// ============================================================================
// CONFIG
// ============================================================================

export type AnthropicConfig = {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
    enableCaching: boolean;
};

export const DEFAULT_ANTHROPIC_CONFIG: Omit<AnthropicConfig, 'apiKey'> = {
    model: 'claude-opus-4-6',
    maxTokens: 16384,
    temperature: 1, // Required for extended thinking
    timeoutMs: 120_000, // 2 min — laudos são longos
    enableCaching: true,
};

// ============================================================================
// BATCH TYPES (for future use)
// ============================================================================

export type AnthropicBatchRequest = {
    custom_id: string;
    params: Omit<AnthropicRequestBody, 'model'>;
};

export type AnthropicBatchResponse = {
    id: string;
    type: 'message_batch';
    processing_status: 'in_progress' | 'ended' | 'canceling';
    request_counts: {
        processing: number;
        succeeded: number;
        errored: number;
        canceled: number;
        expired: number;
    };
};

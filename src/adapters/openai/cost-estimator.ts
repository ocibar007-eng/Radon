import type { OpenAIUsage } from './client';

type Pricing = {
  input: number;
  output: number;
};

const DEFAULT_PRICING: Pricing = {
  // Defaults to 0 to avoid misleading cost estimates when pricing changes.
  // Configure via env if you want non-zero estimates:
  // OPENAI_DRAFT_INPUT_USD_PER_M, OPENAI_DRAFT_OUTPUT_USD_PER_M
  input: Number(process.env.OPENAI_DRAFT_INPUT_USD_PER_M || '0'),
  output: Number(process.env.OPENAI_DRAFT_OUTPUT_USD_PER_M || '0'),
};

export function estimateOpenAICostUSD(
  usage: OpenAIUsage,
  _modelName: string,
): number {
  const inputCost = (Number(usage.input_tokens || 0) / 1_000_000) * DEFAULT_PRICING.input;
  const outputCost = (Number(usage.output_tokens || 0) / 1_000_000) * DEFAULT_PRICING.output;
  return inputCost + outputCost;
}

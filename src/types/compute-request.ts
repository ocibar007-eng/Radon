import { z } from 'zod';
import { FormulaIdSchema } from '../generated/formula-registry';

export const ComputeRequestSchema = z.object({
  formula: FormulaIdSchema,
  inputs: z.record(z.any()),
  ref_id: z.string(),
});

export const ComputeResultSchema = z.object({
  ref_id: z.string(),
  formula: z.string(),
  result: z.any().optional(),
  error: z.string().optional(),
});

export type ComputeRequest = z.infer<typeof ComputeRequestSchema>;
export type ComputeResult = z.infer<typeof ComputeResultSchema>;

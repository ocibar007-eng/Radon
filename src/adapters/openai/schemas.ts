import { z } from 'zod';

export const ComparisonOutputSchema = z.object({
  summary: z.string(),
  mode: z.string().optional(),
  limitations: z.array(z.string()).optional(),
});

export const ImpressionOutputSchema = z.object({
  primary_diagnosis: z.string(),
  differentials: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type ComparisonOutput = z.infer<typeof ComparisonOutputSchema>;
export type ImpressionOutput = z.infer<typeof ImpressionOutputSchema>;

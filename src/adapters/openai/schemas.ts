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
  indication_relation: z.array(z.string()).optional(),
  incidental_findings: z.array(z.string()).optional(),
  adverse_events: z.array(z.string()).optional(),
  criteria_assessment: z.array(z.string()).optional(),
});

export type ComparisonOutput = z.infer<typeof ComparisonOutputSchema>;
export type ImpressionOutput = z.infer<typeof ImpressionOutputSchema>;

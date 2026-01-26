import { z } from 'zod';

export const ComparisonModeSchema = z.enum([
  'none',
  'same_service_images',
  'external_report_only',
  'external_images_limited',
  'other',
]);

export const ProtocolTypeSchema = z.enum([
  'routine',
  'oncologic',
  'adrenal',
  'uro',
  'other',
]);

export const CaseMetadataSchema = z.object({
  fields: z.record(z.string()).default({}),
  raw_markdown: z.string().default(''),
});

export const CaseBundleSchema = z.object({
  case_id: z.string(),
  case_metadata: CaseMetadataSchema,
  clinical_context: z.object({
    raw_markdown: z.string().default(''),
  }).default({ raw_markdown: '' }),
  dictation_raw: z.string().default(''),
  exam_data: z.object({
    raw_markdown: z.string().default(''),
    notes: z.string().optional().default(''),
  }).default({ raw_markdown: '', notes: '' }),
  prior_reports: z.object({
    raw_markdown: z.string().default(''),
  }).default({ raw_markdown: '' }),
  attachments_summary: z.any().nullable().optional(),
  source: z.object({
    format: z.string(),
    path: z.string(),
  }).optional(),
  raw_input_markdown: z.string().optional(),
  comparison_mode: ComparisonModeSchema.optional(),
  protocol_type: ProtocolTypeSchema.optional(),
});

export type ComparisonMode = z.infer<typeof ComparisonModeSchema>;
export type ProtocolType = z.infer<typeof ProtocolTypeSchema>;
export type CaseMetadata = z.infer<typeof CaseMetadataSchema>;
export type CaseBundle = z.infer<typeof CaseBundleSchema>;

import { z } from 'zod';
import { ComputeRequestSchema, ComputeResultSchema } from './compute-request';

export const FindingSchema = z.object({
  finding_id: z.string().optional(),
  organ: z.string(),
  description: z.string(),
  measurements: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
  })).optional(),
  compute_requests: z.array(ComputeRequestSchema).optional(),
});

export const ReportJSONSchema = z.object({
  case_id: z.string(),
  modality: z.string(),
  exam_title: z.string().optional(),
  indication: z.object({
    clinical_history: z.string(),
    exam_reason: z.string(),
    patient_age_group: z.string(),
    patient_sex: z.enum(['M', 'F', 'O']),
  }),
  technique: z.object({
    equipment: z.string(),
    protocol: z.string(),
    protocol_type: z.string().optional(),
    contrast: z.object({
      used: z.boolean(),
      type: z.string().optional(),
      volume_ml: z.number().optional(),
      phases: z.array(z.string()).optional(),
    }),
  }),
  comparison: z.object({
    available: z.boolean(),
    mode: z.string().optional(),
    source: z.string().optional(),
    date: z.string().optional(),
    findings: z.string().optional(),
    summary: z.string().optional(),
    limitations: z.array(z.string()).optional(),
  }).optional(),
  findings: z.array(FindingSchema),
  compute_results: z.record(ComputeResultSchema).optional(),
  impression: z.object({
    primary_diagnosis: z.string(),
    differentials: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    risk_classification: z.string().optional(),
  }),
  flags: z.object({
    hard_gate_failed: z.boolean().optional(),
    laterality_mismatch: z.boolean().optional(),
    hallucination_detected: z.boolean().optional(),
    auto_fix_applied: z.boolean().optional(),
    missing_data_markers: z.array(z.string()).optional(),
  }).optional(),
  metadata: z.object({
    created_at: z.string(),
    model_used: z.string(),
    prompt_version: z.string(),
    qa_passed: z.boolean(),
    risk_score: z.enum(['S1', 'S2', 'S3']),
  }),
});

export type ReportJSON = z.infer<typeof ReportJSONSchema>;
export type Finding = z.infer<typeof FindingSchema>;

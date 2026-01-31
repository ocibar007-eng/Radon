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

export const ReportAuditEntrySchema = z.object({
  type: z.enum(['inferred', 'missing']),
  ref_id: z.string(),
  formula: z.string(),
  details: z.string(),
});

export const ReportAuditSchema = z.object({
  inference_level: z.enum(['strict', 'cautious', 'permissive']),
  entries: z.array(ReportAuditEntrySchema),
});

// Schema for evidence-based recommendations from the library
export const EvidenceRecommendationSchema = z.object({
  finding_type: z.string(),
  text: z.string(),
  applicability: z.string().optional(),
  conditional: z.boolean(),
  source_id: z.string().optional(),
  guideline_id: z.string().optional(),
  reference_key: z.string().optional(),
});

export const ReferenceEntrySchema = z.object({
  key: z.string(),
  citation: z.string(),
});

// NEW: Consult Assist (Pacote de Consulta - NÃO vai pro laudo)
export const ConsultAssistSourceSchema = z.object({
  source_type: z.enum(['guideline', 'journal', 'society', 'government', 'secondary']),
  organization_or_journal: z.string(),
  title: z.string(),
  year: z.string(), // "YYYY" ou "unknown"
  url: z.string(),
  doi: z.string().optional(),
  accessed_at: z.string(), // ISO date
  relevance: z.enum(['high', 'medium', 'low']),
});

export const ConsultAssistEntrySchema = z.object({
  finding_id: z.string(),
  title: z.string(),
  summary: z.string(),
  suggested_actions: z.array(z.string()),
  copy_ready_note: z.string(),
  sources: z.array(ConsultAssistSourceSchema),
  evidence_quality: z.enum(['high', 'moderate', 'low']),
  conflicts_or_caveats: z.array(z.string()),
  numeric_safety: z.object({
    numbers_included: z.boolean(),
    rule: z.string(),
  }),
});

// NEW: Library Ingestion Candidates (Curadoria/Staging)
export const LibraryIngestionCandidateSchema = z.object({
  finding_type: z.string(),
  trigger_terms: z.array(z.string()),
  candidate_recommendation_text: z.string(),
  applicability_rules: z.object({
    requires: z.array(z.string()),
    size_brackets: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
  }),
  citations: z.array(z.object({
    organization_or_journal: z.string(),
    title: z.string(),
    year: z.string(),
    url: z.string(),
    doi: z.string().optional(),
    accessed_at: z.string(),
  })),
  extracted_verbatim_snippet: z.string().optional(),
  confidence_for_ingestion: z.enum(['high', 'medium', 'low']),
  review_required: z.boolean(),
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
  audit: ReportAuditSchema.optional(),
  // NEW: Evidence-based recommendations from library (SOMENTE pro LAUDO)
  evidence_recommendations: z.array(EvidenceRecommendationSchema).optional(),
  // NEW: References for citations (SOMENTE da biblioteca)
  references: z.array(ReferenceEntrySchema).optional(),
  // NEW: Consult Assist - Pacote de consulta para médico (NÃO vai pro laudo)
  consult_assist: z.array(ConsultAssistEntrySchema).optional(),
  // NEW: Library Ingestion Candidates - Curadoria para alimentar biblioteca
  library_ingestion_candidates: z.array(LibraryIngestionCandidateSchema).optional(),
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
export type ReportAudit = z.infer<typeof ReportAuditSchema>;
export type ReportAuditEntry = z.infer<typeof ReportAuditEntrySchema>;
export type EvidenceRecommendation = z.infer<typeof EvidenceRecommendationSchema>;
export type ReferenceEntry = z.infer<typeof ReferenceEntrySchema>;
export type ConsultAssistEntry = z.infer<typeof ConsultAssistEntrySchema>;
export type ConsultAssistSource = z.infer<typeof ConsultAssistSourceSchema>;
export type LibraryIngestionCandidate = z.infer<typeof LibraryIngestionCandidateSchema>;

import { z } from "zod";

// ==========================================
// LAYER 1: CASE BUNDLE (Immutable Input)
// ==========================================

export const PatientDemographicsSchema = z.object({
    age_bracket: z.enum(["pediatric", "adult", "geriatric"]),
    sex: z.enum(["M", "F"]),
    clinical_history: z.array(z.string()).optional(),
});

export const CaseBundleSchema = z.object({
    meta: z.object({
        case_id: z.string().uuid(),
        trace_id: z.string().uuid(),
        patient: PatientDemographicsSchema,
        modality: z.string(),
        study_description: z.string(),
        timestamp: z.string().datetime(),
    }),
    inputs: z.object({
        dictation_raw: z.string(),
        dictation_clean: z.string().optional(),
        ocr_results: z.record(z.string(), z.string()).optional(),
    }),
    flags: z.object({
        is_oncologic: z.boolean().default(false),
        has_contrast: z.boolean().default(false),
    }),
});

export type CaseBundle = z.infer<typeof CaseBundleSchema>;

// ==========================================
// CALCULATOR CONTRACTS
// ==========================================

export const ComputeRequestSchema = z.object({
    request_id: z.string().uuid(),
    operation: z.enum([
        "calculate_volume_ellipsoid",
        "calculate_adrenal_washout",
        "calculate_prostate_density",
        "calculate_bmi"
    ]),
    params: z.record(z.string(), z.number()),
});

export const ComputeResultSchema = z.object({
    request_id: z.string(),
    success: z.boolean(),
    value: z.number().nullable(),
    formatted_string: z.string().optional(),
    error_message: z.string().nullable(),
    details: z.record(z.string(), z.any()).optional(),
});

export type ComputeRequest = z.infer<typeof ComputeRequestSchema>;
export type ComputeResult = z.infer<typeof ComputeResultSchema>;


import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3005;
const CALCULATOR_URL = 'http://localhost:8001/compute';

// --- INLINED SCHEMAS (To avoid ts-node module resolution issues) ---

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


// Mock Banlist
const BANLIST = [
    /conforme áudio/i,
    /segundo input/i,
    /neste laudo/i,
    /conforme anexos/i
];

app.post('/v3/process-case', async (req, res) => {
    console.log("📥 [Orchestrator] Received Case Request");
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    }

    try {
        // 1. Validate Input
        log("🔍 [Layer 1] Validating CaseBundle...");
        const bundle = CaseBundleSchema.parse(req.body);
        log("✅ [Layer 1] Validation Passed.");

        // 2. Logic simulation (Calculator)
        // Detect need for calculator based on raw text (naive mock)
        let calcResult = null;
        if (bundle.inputs.dictation_raw.toLowerCase().includes("washout")) {
            log("🧮 [Layer 2] Detected need for Adrenal Washout. Calling Python Service...");
            try {
                // Mocking extraction of values for demo - In production this comes from the LLM Extractor
                const resp = await axios.post(CALCULATOR_URL, {
                    request_id: crypto.randomUUID(),
                    operation: "calculate_adrenal_washout",
                    params: {
                        enhanced_hu: 80, // Hardcoded for demo/simulated extraction
                        delayed_hu: 35,
                        unenhanced_hu: 10
                    }
                });
                calcResult = resp.data;
                log(`✅ [Layer 2] Calculator Result: ${JSON.stringify(calcResult)}`);
            } catch (err: any) {
                log(`❌ [Layer 2] Calculator Failed: ${err.message}`);
                // Fallback / Circuit breaker logic could go here
            }
        }

        // 3. Prepare Context for Layer 2 (Medical Reasoner)
        log("🤖 [Layer 2] Preparing Prompt for Medical Reasoner (O Médico)...");

        const ABS_PATH_REASONER = "/Users/lucasdonizetecamargos/Downloads/app (6)/inbox/references/radon_v3_standalone/prompt_layer2_reasoner.md";
        const ABS_PATH_STYLIST = "/Users/lucasdonizetecamargos/Downloads/app (6)/inbox/references/radon_v3_standalone/prompt_layer3_stylist.md";

        let promptReasoner = "";
        let promptStylist = "";

        try {
            promptReasoner = fs.readFileSync(ABS_PATH_REASONER, 'utf-8');
            promptStylist = fs.readFileSync(ABS_PATH_STYLIST, 'utf-8');
            log("✅ [System] Loaded Prompts for Layer 2 and Layer 3.");
        } catch (e) {
            log(`⚠️ [System] Failed to load prompts: ${e}.`);
            throw e;
        }

        // 3.1 Chain Link 1: Medical Reasoner
        const reasonerInput = JSON.stringify({
            dictation: bundle.inputs.dictation_raw,
            calculator_results: calcResult || "Nenhum cálculo automático.",
            patient_context: bundle.meta.patient
        }, null, 2);

        const fullPromptReasoner = `${promptReasoner}\n\n=== INPUT DATA ===\n${reasonerInput}`;

        dotenv.config({ path: '../../../.env' }); // Adjust if needed

        log("🧠 [Layer 2] Calling Gemini (Medical Reasoner)...");

        // Use environment variable, fallback to hardcoded ONLY if env not found (for safety) 
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            throw new Error("GEMINI_API_KEY not set in environment");
        }

        async function callGemini(p: string, model: string) {
            try {
                const resp = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
                    { contents: [{ parts: [{ text: p }] }] },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                return resp.data.candidates[0].content.parts[0].text;
            } catch (error: any) {
                if (error.response) {
                    throw new Error(`API Error ${error.response.status} (${model}): ${JSON.stringify(error.response.data)}`);
                }
                throw new Error(`Network/Unknown Error: ${error.message}`);
            }
        }

        // Initialize Telemetry Data
        const telemetry = {
            layer2_latency_ms: 0,
            layer3_latency_ms: 0,
            layer2_model: "gemini-3-pro-preview",
            layer3_model: "gemini-3-flash-preview",
            reasoner_thoughts: ""
        };

        // ... inside callGemini ... no change needed there ...

        let medicalDraft = "";
        try {
            // Layer 2: Medical Reasoner
            const tStart = Date.now();
            const rawResponse = await callGemini(fullPromptReasoner, telemetry.layer2_model);
            telemetry.layer2_latency_ms = Date.now() - tStart;

            // Extract <thinking> block
            const thinkingMatch = rawResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
            if (thinkingMatch) {
                telemetry.reasoner_thoughts = thinkingMatch[1].trim();
                // Clean draft for next layer
                medicalDraft = rawResponse.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();
            } else {
                medicalDraft = rawResponse; // No thinking block found
                telemetry.reasoner_thoughts = "No explicit thinking block generated.";
            }

            log(`📝 [Layer 2] Medical Draft Generated (${telemetry.layer2_latency_ms}ms).`);
        } catch (err: any) {
            log(`❌ [Layer 2] Reasoner Failed: ${err.message}`);
            return res.json({ success: false, error: `Reasoner Failed: ${err.message}` });
        }

        // 3.2 Chain Link 2: Style Editor
        log("🎨 [Layer 3] Calling Gemini (Style Editor - Flash)...");
        const fullPromptStylist = `${promptStylist}\n\n=== DRAFT TEXT TO FORMAT ===\n${medicalDraft}`;

        let generatedReport = "";
        try {
            // Layer 3: Stylist
            const tStart = Date.now();
            generatedReport = await callGemini(fullPromptStylist, telemetry.layer3_model);
            telemetry.layer3_latency_ms = Date.now() - tStart;

            log(`✅ [Layer 3] Final Report Formatted (${telemetry.layer3_latency_ms}ms).`);
        } catch (err: any) {
            log(`❌ [Layer 3] Stylist Failed: ${err.message}`);
            generatedReport = medicalDraft + "\n\n[AVISO: Falha na formatação final. Texto bruto apresentado.]";
        }

        // 5. QA Layer (Simple Banlist Check on Real Output)
        // --- A3 AUTOMATION: DETERMINISTIC LINTER & AUTO-FIX ---
        log("🛡️ [Layer 4] Running Automation A3 (Linter & Guards)...");

        // Load Configuration
        const PIPELINE_CONFIG = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'pipeline_thresholds.json'), 'utf-8'));
        const { banlist, auto_fix_map, hard_gates } = PIPELINE_CONFIG;

        // 1. Auto-Fix (Typos & Terminology)
        let finalReport = generatedReport;
        let fixesApplied: string[] = [];

        Object.keys(auto_fix_map).forEach(badTerm => {
            const goodTerm = auto_fix_map[badTerm];
            const regex = new RegExp(badTerm, 'gi');
            if (regex.test(finalReport)) {
                finalReport = finalReport.replace(regex, goodTerm);
                fixesApplied.push(`${badTerm} -> ${goodTerm}`);
            }
        });

        if (fixesApplied.length > 0) {
            log(`🛠️ [A3 Linter] Applied Auto-Fixes: ${fixesApplied.join(", ")}`);
        }

        // 2. Hard Gates (Meta-Text & Forbidden Terms)
        const criticalIssues: string[] = [];

        // Check Meta-Text
        banlist.meta_text.forEach((term: string) => {
            if (new RegExp(term, 'gi').test(finalReport)) {
                criticalIssues.push(`META-TEXT DETECTED: "${term}"`);
            }
        });

        // Check Forbidden Clinical
        banlist.forbidden_clinical.forEach((term: string) => {
            if (new RegExp(term, 'gi').test(finalReport)) {
                criticalIssues.push(`FORBIDDEN TERM: "${term}"`);
            }
        });

        // Enforce Hard Gates
        if (criticalIssues.length > 0) {
            log(`❌ [A3 Linter] HARD GATE FAILURE: ${criticalIssues.join(", ")}`);
            // In a real pipeline, this blocks publishing. Here we mark it clearly.
            finalReport += `\n\n🚨 [BLOCKED BY AUTOMATION]: ${criticalIssues.join(", ")}`;

            // If configured to strictly block, we could throw:
            // throw new Error(`Hard Gate Failed: ${criticalIssues.join(", ")}`);
        } else {
            log("✅ [A3 Linter] All Hard Gates Passed.");
        }

        // --- DATA FLYWHEEL / COLLECTOR ---
        try {
            // Restore datasetEntry definition
            const datasetEntry: any = {
                timestamp: new Date().toISOString(),
                case_id: bundle.meta.case_id,
                inputs: {
                    dictation: bundle.inputs.dictation_raw,
                    patient_context: bundle.meta.patient,
                    calculator_results: calcResult
                },
                thinking_process: {
                    layer2_cot: telemetry.reasoner_thoughts
                },
                outputs: {
                    layer2_draft: medicalDraft,
                    layer3_final: finalReport,
                    qa_issues: criticalIssues
                },
                telemetry: telemetry,
                attempts: attempts // Log how many attempts it took
            };

            // --- A4 AUTOMATION: RISK SCORING (S1/S2) ---
            const riskFlags: string[] = [];
            let riskLevel = "S3"; // Default: Low Risk/Sampling

            // S1 Criteria (Must Review)
            if (criticalIssues.length > 0) {
                riskFlags.push("S1_HARD_GATE_FAIL");
                riskLevel = "S1";
            }
            // Check for missing calculator usage when dictation implies it
            if (bundle.inputs.dictation_raw.toLowerCase().includes("washout") && !calcResult) {
                riskFlags.push("S1_MISSING_CALCULATION");
                riskLevel = "S1";
            }

            // --- POWER-UP 1: CLINICAL QA (CONSISTENCY CHECK) ---
            const clinicalIssues: string[] = [];

            // 1. Lateralidade Check (Naive but effective backup)
            const right = (finalReport.match(/direito|direita|us_d|od/gi) || []).length;
            const left = (finalReport.match(/esquerdo|esquerda|us_e|oe/gi) || []).length;
            // If report mentions both heavily, it might be bilateral, but if Dictation only mentioned one side...
            const dictRight = (bundle.inputs.dictation_raw.match(/direito|direita/gi) || []).length;
            const dictLeft = (bundle.inputs.dictation_raw.match(/esquerdo|esquerda/gi) || []).length;

            if (dictRight > 0 && dictLeft === 0 && left > 0) {
                clinicalIssues.push("LATERALITY_MISMATCH_DICT_RIGHT_REPORT_LEFT");
            }
            if (dictLeft > 0 && dictRight === 0 && right > 0) {
                clinicalIssues.push("LATERALITY_MISMATCH_DICT_LEFT_REPORT_RIGHT");
            }

            // 2. Impression Support Check (Heuristic)
            // Does the report contain "IMPRESSÃO DIAGNÓSTICA" or "CONCLUSÃO"?
            if (!/IMPRESSÃO|CONCLUSÃO/i.test(finalReport)) {
                clinicalIssues.push("MISSING_IMPRESSION_SECTION");
            }

            // 3. Measurement Consistency (Omission Detector)
            // Extract measurements (e.g. "2,5 cm", "14 mm") from dictation vs report
            const extractNums = (text: string) => (text.match(/\d+([.,]\d+)?\s*(cm|mm)/gi) || []);
            const dictNums = extractNums(bundle.inputs.dictation_raw);
            const reportNums = extractNums(finalReport);

            // If dictation has significantly more measurements than report
            if (dictNums.length > reportNums.length + 2) {
                clinicalIssues.push("POTENTIAL_MEASUREMENT_OMISSION");
            }

            if (clinicalIssues.length > 0) {
                log(`⚕️ [Clinical QA] Issues Found: ${clinicalIssues.join(", ")}`);
                // Promote to Critical Issues for S1 Flag
                riskFlags.push("S1_CLINICAL_INCONSISTENCY");
                riskLevel = "S1";
                // Append to metadata for UI
                datasetEntry['clinical_qa'] = clinicalIssues;
            }
            // ----------------------------------------------------

            // S2 Criteria (Should Review)
            if (telemetry.layer2_latency_ms > 20000) { // arbitrary threshold from config
                riskFlags.push("S2_HIGH_LATENCY");
                if (riskLevel !== "S1") riskLevel = "S2";
            }
            if (fixesApplied.length > 0) {
                riskFlags.push("S2_AUTO_FIXES_APPLIED");
                if (riskLevel !== "S1") riskLevel = "S2";
            }

            const finalEntry = {
                ...datasetEntry,
                risk_level: riskLevel, // S1, S2, S3
                risk_flags: [...riskFlags, ...clinicalIssues], // Merge all flags
                outputs: {
                    ...datasetEntry.outputs,
                    layer3_final: finalReport, // Use the auto-fixed version
                    qa_issues: criticalIssues
                }
            };

            const LOG_DIR = path.join(process.cwd(), 'logs');
            const DATASET_FILE = path.join(LOG_DIR, 'dataset.jsonl');

            if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

            fs.appendFileSync(DATASET_FILE, JSON.stringify(finalEntry) + '\n');
            log(`💾 [Data Flywheel] Run saved to ${DATASET_FILE}`);
        } catch (e: any) {
            log(`⚠️ [Data Flywheel] Failed to save log: ${e.message}`);
        }
        // --------------------------------

        res.json({
            success: true,
            logs,
            final_report: generatedReport,
            calculator_data: calcResult,
            telemetry: telemetry
        });

    } catch (error: any) {
        // ... (error handling) ...
        log(`🔥 Critical Error: ${error.message}`);
        if (error instanceof z.ZodError) {
            log(`Validation Details: ${JSON.stringify(error.errors)}`);
        }
        res.status(400).json({ success: false, logs, error: error.message });
    }
});

// --- REVIEWER UI ENDPOINTS ---

// 1. GET /v3/dataset - List all raw logs
app.get('/v3/dataset', (req, res) => {
    try {
        const LOG_DIR = path.join(process.cwd(), 'logs');
        const DATASET_FILE = path.join(LOG_DIR, 'dataset.jsonl');

        if (!fs.existsSync(DATASET_FILE)) {
            return res.json({ entries: [] });
        }

        const fileContent = fs.readFileSync(DATASET_FILE, 'utf-8');
        // Parse JSONL line by line
        const entries = fileContent
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                try { return JSON.parse(line); } catch (e) { return null; }
            })
            .filter(e => e !== null)
            .reverse(); // Newest first

        res.json({ entries });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. POST /v3/dataset/feedback - Save Golden/Negative data
app.post('/v3/dataset/feedback', (req, res) => {
    try {
        const { action, entry, correction, tags } = req.body;
        // action: "approve" | "edit" | "reject"

        const LOG_DIR = path.join(process.cwd(), 'logs');
        let TARGET_FILE = "";
        let finalData = {};

        if (action === "reject") {
            TARGET_FILE = path.join(LOG_DIR, 'negative_examples.jsonl');
            finalData = {
                ...entry,
                feedback: "rejected",
                feedback_tags: tags || [],
                timestamp_feedback: new Date().toISOString()
            };
        } else {
            // Approve or Edit -> Goes to Golden
            TARGET_FILE = path.join(LOG_DIR, 'golden_dataset.jsonl');
            finalData = {
                ...entry,
                // If edited, overwrite key outputs with human correction
                outputs: { ...entry.outputs, layer3_final: correction || entry.outputs.layer3_final },
                feedback: action, // "approve" or "edit"
                feedback_tags: tags || [],
                timestamp_feedback: new Date().toISOString()
            };
        }

        fs.appendFileSync(TARGET_FILE, JSON.stringify(finalData) + '\n');

        console.log(`🧠 [RLHF] Feedback received: ${action} -> Saved to ${path.basename(TARGET_FILE)}`);
        res.json({ success: true, message: `Saved to ${path.basename(TARGET_FILE)}` });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. POST /v3/dataset/critic - Run AI Shadow Audit
app.post('/v3/dataset/critic', async (req, res) => {
    try {
        const { entry } = req.body;
        if (!entry) throw new Error("Missing entry data");

        log("🧐 [Shadow Critic] Auditor Gemini Pro is reviewing the case...");

        const criticPrompt = `
ATIVIDADE: Auditoria de Laudo Radiológico (Shadow Critic).
PAPEL: Você é um Auditor Senior de Radiologia. Sua função NÃO é reescrever o laudo, mas criticá-lo impiedosamente para garantir segurança e qualidade.

=== DADOS DE ENTRADA (O que o radiologista ditou) ===
${entry.inputs.dictation}

=== CONTEXTO / CÁLCULOS ===
${JSON.stringify(entry.inputs.patient_context)}
${JSON.stringify(entry.inputs.calculator_results)}

=== LAUDO GERADO PELA IA (Para auditoria) ===
${entry.outputs.layer3_final}

=== SUA TAREFA ===
Analise o LAUDO GERADO procurando por:
1. ALUCINAÇÕES: O laudo inventou algo que não estava no ditado ou cálculos? (Ex: Inventou Washout sem ter dados?)
2. OMISSÕES: O laudo esqueceu algo crítico que foi ditado?
3. ESTILO: O texto está profissional?
4. SEGURANÇA: Há algum risco para o paciente?

Responda em JSON puro neste formato:
{
  "score": 0 a 100,
  "status": "APPROVED" | "WARNING" | "REJECT",
  "summary": "Resumo de 1 linha",
  "issues": ["Lista", "De", "Problemas", "Encontrados"]
}
`;

        // Start Timer
        const tStart = Date.now();
        // Call Gemini Pro for Critique
        const analysis = await callGemini(criticPrompt, "gemini-3-pro-preview");
        const latency = Date.now() - tStart;

        // Clean JSON formatting from LLM
        const jsonStr = analysis.replace(/```json/g, "").replace(/```/g, "").trim();
        const feedback = JSON.parse(jsonStr);

        log(`🧐 [Shadow Critic] Audit Complete. Score: ${feedback.score}/100 in ${latency}ms`);

        res.json({ success: true, feedback, latency });

    } catch (error: any) {
        log(`❌ [Shadow Critic] Failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Radon V3 Orchestrator running on http://localhost:${PORT}`);
});

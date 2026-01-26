import type { CaseBundle } from '../../types';
import type { ReportJSON, Finding } from '../../types/report-json';
import type { ComputeRequest, ComputeResult } from '../../types/compute-request';
import type { ClinicalOutput, TechnicalOutput, FindingsOutput } from './agents/types';
import { processClinicalIndication } from './agents/clinical';
import { generateTechniqueSection } from './agents/technical';
import { generateFindings } from './agents/findings';
import { generateComparisonSummary } from './agents/comparison';
import { synthesizeImpression } from './agents/impression';
import { attachComputeResults, computeFormulas } from '../../services/calculator-client';
import { CONFIG } from '../config';
import { OPENAI_MODELS } from '../openai';
import { renderReportMarkdown } from './renderer';
import { canonicalizeMarkdown } from './canonicalizer';
import { appendAuditBlock } from './audit';
import { applyCautiousInference, INFERENCE_LEVEL } from './compute-inference';
import { runDeterministicQA } from './qa/deterministic';
import { healReport } from './qa/self-healing';
import { classifyRisk } from './qa/risk';
import type { QAResult } from '../../types/qa-result';
import type { RiskAssessment } from './qa/risk';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function resolveModality(bundle: CaseBundle): string {
  const fields = bundle.case_metadata?.fields || {};
  const candidates = [
    fields.Exame,
    fields['Tipo de Exame'],
    fields['Tipo Exame'],
    fields['Exame Solicitado'],
  ].filter((val) => typeof val === 'string' && val.trim().length > 0) as string[];

  const examRaw = candidates[0]
    || (Object.values(fields).find((val) => typeof val === 'string' && val.trim().length > 0) as string | undefined);

  if (!examRaw) return 'UNKNOWN';

  const exam = normalizeText(examRaw);
  if (exam.includes('TOMOGRAFIA') || exam.includes(' TC ' ) || exam.includes('TC ')) return 'CT';
  if (exam.includes('RESSONANCIA') || exam.includes(' RM ' ) || exam.includes('RM ')) return 'MR';
  if (exam.includes('ULTRASSOM') || exam.includes('USG') || exam.includes('US ')) return 'US';
  return 'UNKNOWN';
}

function resolveExamTitle(bundle: CaseBundle): string | undefined {
  const fields = bundle.case_metadata?.fields || {};
  const candidates = [
    fields.Exame,
    fields['Tipo de Exame'],
    fields['Tipo Exame'],
    fields['Exame Solicitado'],
  ].filter((val) => typeof val === 'string' && val.trim().length > 0) as string[];

  const examRaw = candidates[0]
    || (Object.values(fields).find((val) => typeof val === 'string' && val.trim().length > 0) as string | undefined);

  return examRaw?.trim();
}

function collectComputeRequests(findings: FindingsOutput): ComputeRequest[] {
  const requests: ComputeRequest[] = [];
  for (const finding of findings.findings) {
    if (!finding.compute_requests?.length) continue;
    for (const request of finding.compute_requests) {
      requests.push({
        formula: request.formula,
        inputs: request.inputs,
        ref_id: request.ref_id,
      });
    }
  }
  return requests;
}

function countMissingMarkers(text: string): number {
  const matches = text.match(/<VERIFICAR>/g);
  return matches ? matches.length : 0;
}

export function buildReport(
  bundle: CaseBundle,
  clinical: ClinicalOutput,
  technical: TechnicalOutput,
  findings: FindingsOutput,
  computeResults?: ComputeResult[]
): ReportJSON {
  const report: ReportJSON = {
    case_id: bundle.case_id,
    modality: resolveModality(bundle),
    exam_title: resolveExamTitle(bundle),
    indication: {
      clinical_history: clinical.clinical_history,
      exam_reason: clinical.exam_reason,
      patient_age_group: clinical.patient_age_group,
      patient_sex: clinical.patient_sex,
    },
    technique: {
      equipment: technical.equipment,
      protocol: technical.protocol,
      protocol_type: bundle.protocol_type,
      contrast: technical.contrast,
    },
    comparison: bundle.prior_reports?.raw_markdown
      ? {
          available: true,
          mode: bundle.comparison_mode,
        }
      : {
          available: false,
        },
    findings: findings.findings as Finding[],
    impression: {
      primary_diagnosis: '<VERIFICAR>.',
    },
    metadata: {
      created_at: new Date().toISOString(),
      model_used: CONFIG.MODEL_NAME,
      prompt_version: 'v8.7.9',
      qa_passed: false,
      risk_score: 'S3',
    },
  };

  if (computeResults && computeResults.length > 0) {
    return attachComputeResults(report, computeResults);
  }

  return report;
}

export async function processCase(bundle: CaseBundle): Promise<ReportJSON> {
  const clinical = await processClinicalIndication(bundle);
  const technical = await generateTechniqueSection(bundle);
  const findings = await generateFindings(bundle);
  const modality = resolveModality(bundle);

  const { requests: computeRequests, auditEntries } = applyCautiousInference(findings, modality);
  let computeResults: ComputeResult[] | undefined;

  if (computeRequests.length > 0) {
    computeResults = await computeFormulas(computeRequests);
  }

  let report = buildReport(bundle, clinical, technical, findings, computeResults);

  if (auditEntries.length > 0) {
    report = {
      ...report,
      audit: {
        inference_level: INFERENCE_LEVEL,
        entries: auditEntries,
      },
    };
  }

  return report;
}

export type ReportPipelineResult = {
  report: ReportJSON;
  markdown: string;
  qa: QAResult;
  risk: RiskAssessment;
};

export async function processCasePipeline(bundle: CaseBundle): Promise<ReportPipelineResult> {
  const start = Date.now();
  let report = await processCase(bundle);

  if (bundle.prior_reports?.raw_markdown?.trim()) {
    const comparison = await generateComparisonSummary(report, bundle);
    report = {
      ...report,
      comparison: {
        ...(report.comparison || { available: true }),
        mode: comparison.mode || bundle.comparison_mode,
        summary: comparison.summary,
        limitations: comparison.limitations,
      },
    };
  }

  const impression = await synthesizeImpression(report, bundle);
  report = {
    ...report,
    impression: {
      ...report.impression,
      ...impression,
    },
  };

  const initialMarkdown = await renderReportMarkdown(report);
  const canonicalizer = (text: string) => canonicalizeMarkdown(text).text;

  const healing = await healReport(
    report,
    initialMarkdown,
    renderReportMarkdown,
    runDeterministicQA,
    canonicalizer
  );

  let finalMarkdown = healing.markdown;
  if (report.audit?.entries?.length) {
    finalMarkdown = appendAuditBlock(finalMarkdown, report.audit);
    finalMarkdown = canonicalizer(finalMarkdown);
  }

  const latencyMs = Date.now() - start;
  const missingMarkers = countMissingMarkers(finalMarkdown);

  const risk = classifyRisk(report, healing.qa, {
    latency_ms: latencyMs,
    auto_fix_applied: healing.autoFixApplied,
    missing_markers: missingMarkers,
  });

  report = {
    ...report,
    flags: {
      ...report.flags,
      hard_gate_failed: !healing.qa.passed,
      auto_fix_applied: healing.autoFixApplied,
      missing_data_markers: Array(missingMarkers).fill('<VERIFICAR>'),
    },
    metadata: {
      ...report.metadata,
      qa_passed: healing.qa.passed,
      risk_score: risk.level,
      model_used: `${CONFIG.MODEL_NAME}+${OPENAI_MODELS.impression}`,
    },
  };

  return {
    report,
    markdown: finalMarkdown,
    qa: healing.qa,
    risk,
  };
}

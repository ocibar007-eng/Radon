import type { CaseBundle } from '../../types';
import type { ReportJSON, Finding } from '../../types/report-json';
import type { ComputeRequest, ComputeResult } from '../../types/compute-request';
import type { ClinicalOutput, TechnicalOutput, FindingsOutput } from './agents/types';
import { processClinicalIndication } from './agents/clinical';
import { generateTechniqueSection } from './agents/technical';
import { generateFindings } from './agents/findings';
import { synthesizeImpression } from './agents/impression';
import { runRevisor } from './agents/revisor';
import { runRecommendationsAgent, AgentContext as RecsContext } from './agents/recommendations';
import { validateRecommendations } from './recommendations-guard';
import { recordGuardSanitization } from './recommendations-observability';
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
import { applyImpressionProbabilityGuards } from './impression-guard';
import { applyVocabularyGate } from './vocabulary-gate';
import {
  extractExplicitRecommendations,
  extractMostRecentDate,
  extractMostRecentPriorReport,
  buildComparisonContext,
  buildDeterministicComparisonSummary,
  isEnteroTCFromText
} from './report-utils';
import { localizeRecommendationsToPtGemini } from './recommendation-localizer-gemini';
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
  if (exam.includes('TCABT') || exam.includes('TC ABDOME')) return 'CT';
  if (exam.includes('TOMOGRAFIA') || exam.includes(' TC ') || exam.includes('TC ')) return 'CT';
  if (exam.includes('RESSONANCIA') || exam.includes(' RM ') || exam.includes('RM ')) return 'MR';
  if (exam.includes('ULTRASSOM') || exam.includes('USG') || exam.includes('US ')) return 'US';
  return 'UNKNOWN';
}

function resolveComparisonMode(
  bundle: CaseBundle,
  priorInfo: ReturnType<typeof extractMostRecentPriorReport> | undefined
): string | undefined {
  if (bundle.comparison_mode) return bundle.comparison_mode;
  if (!bundle.prior_reports?.raw_markdown?.trim()) return undefined;
  const context = buildComparisonContext(priorInfo, undefined);
  return context.mode;
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

  if (!examRaw) return undefined;
  const normalized = normalizeText(examRaw);
  const examMap: Record<string, string> = {
    TCABT: 'Tomografia Computadorizada de Abdome Total',
    'TC ABDOME TOTAL': 'Tomografia Computadorizada de Abdome Total',
    'TC ABDOME': 'Tomografia Computadorizada de Abdome',
  };
  return examMap[normalized] || examRaw.trim();
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

function extractPatientAge(report: ReportJSON): number | undefined {
  // Try to extract age from clinical history or patient_age_group
  const ageGroup = report.indication?.patient_age_group;
  if (!ageGroup) return undefined;

  // Parse common patterns like "45 anos", "45y", "adulto 45a"
  const numMatch = ageGroup.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // Default adult age if "adulto" mentioned
  if (ageGroup.toLowerCase().includes('adulto')) return 50;
  if (ageGroup.toLowerCase().includes('idoso')) return 70;
  if (ageGroup.toLowerCase().includes('criança') || ageGroup.toLowerCase().includes('pediatr')) return 10;

  return undefined;
}

function extractComparisonHint(bundle: CaseBundle): { summary: string; date?: string } | null {
  const raw = bundle.clinical_context?.raw_markdown || '';
  if (!raw) return null;

  const hasUS = /ultrassonografia|usg/i.test(raw);
  if (!hasUS) return null;

  const dateMatches = raw.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);
  const date = dateMatches ? dateMatches[dateMatches.length - 1] : undefined;

  const summary = date
    ? `Conforme informação clínica, há registro de ultrassonografia de abdome total e parede abdominal realizada em ${date}, na mesma data. Não foram disponibilizados seus achados e imagens para comparação direta.`
    : 'Conforme informação clínica, há registro de ultrassonografia prévia. Não foram disponibilizados seus achados e imagens para comparação direta.';

  return { summary, date };
}

export function buildReport(
  bundle: CaseBundle,
  clinical: ClinicalOutput,
  technical: TechnicalOutput,
  findings: FindingsOutput,
  computeResults?: ComputeResult[]
): ReportJSON {
  const enterography = isEnteroTCFromText(
    resolveExamTitle(bundle),
    bundle.dictation_raw,
    clinical.exam_reason
  );
  const priorInfo = extractMostRecentPriorReport(bundle.prior_reports?.raw_markdown || '');
  const comparisonMode = resolveComparisonMode(bundle, priorInfo);
  const comparisonDate = priorInfo?.date || extractMostRecentDate(bundle.prior_reports?.raw_markdown || '');
  const comparisonSource = priorInfo?.institution;
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
        mode: comparisonMode,
        date: comparisonDate,
        source: comparisonSource,
      }
      : {
        available: false,
      },
    findings: findings.findings as Finding[],
    impression: {
      primary_diagnosis: '<VERIFICAR>.',
    },
    flags: enterography ? { enterography: true } : undefined,
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

  const comparisonHint = extractComparisonHint(bundle);
  if (comparisonHint && (!report.comparison || !report.comparison.available)) {
    report = {
      ...report,
      comparison: {
        available: true,
        mode: 'external_report_only',
        date: comparisonHint.date,
        summary: comparisonHint.summary,
      },
    };
  }

  if (bundle.prior_reports?.raw_markdown?.trim()) {
    const priorInfo = extractMostRecentPriorReport(bundle.prior_reports?.raw_markdown || '');
    const comparisonContext = buildComparisonContext(priorInfo, report.modality);
    const currentText = [
      report.findings?.map((finding) => finding.description).join(' ') || '',
      bundle.dictation_raw || '',
    ].join(' ');
    const comparisonSummary = buildDeterministicComparisonSummary(
      priorInfo?.text || bundle.prior_reports?.raw_markdown || '',
      currentText,
      comparisonContext
    );
    report = {
      ...report,
      comparison: {
        ...(report.comparison || { available: true }),
        mode: comparisonContext.mode,
        summary: comparisonSummary,
        limitations: [],
        date: report.comparison?.date || comparisonContext.priorDate,
        source: report.comparison?.source || comparisonContext.institution,
      },
    };
  }

  try {
    const dict_result_pre = applyVocabularyGate(report, {
      caseId: report.case_id,
      fields: {
        findings: true,
        comparison_summary: true,
        impression_primary_diagnosis: false,
        impression_recommendations: false,
        impression_differentials: false,
        impression_indication_relation: false,
        impression_incidental_findings: false,
        impression_adverse_events: false,
        impression_criteria_assessment: false,
      },
    });
    report = dict_result_pre.report;
    if (dict_result_pre.diagnostics.needs_review_hits.length > 0) {
      console.log(`[VocabularyGate] needs_review hits: ${dict_result_pre.diagnostics.needs_review_hits.length}`);
    }
  } catch (error) {
    console.warn('[Orchestrator] VocabularyGate error:', error);
  }

  // === RECOMMENDATIONS AGENT (NEW) ===
  // Call after Comparison, before Impression
  // Regra-mãe: "Recomendação só entra se for recuperada + aplicável"
  try {
    const recsContext: RecsContext = {
      patient_age: extractPatientAge(report),
      risk_category: 'unknown', // Conservative default
      immunosuppressed: false,
      oncologic_context: report.indication?.clinical_history?.toLowerCase().includes('oncol') ||
        report.indication?.clinical_history?.toLowerCase().includes('câncer') ||
        report.indication?.clinical_history?.toLowerCase().includes('tumor'),
    };

    const enrichedReport = await runRecommendationsAgent(recsContext, report as any);

    // Extract library payloads for full number verification
    // Convert plain object back to Map for Guard
    const payloadsObject = (enrichedReport as any)._libraryPayloads || {};
    const libraryPayloads = new Map<string, any>(Object.entries(payloadsObject));

    // Validate with Guard - NOW WITH REAL PAYLOADS
    const guardResult = validateRecommendations(
      enrichedReport.recommendations || [],
      libraryPayloads
    );

    if (!guardResult.valid) {
      console.warn('[Orchestrator] Recommendations Guard violations:', guardResult.violations);
    }

    const originalRecs = enrichedReport.recommendations || [];
    const sanitizedRecs = guardResult.sanitized_recommendations || [];
    const sanitizedCount = sanitizedRecs.filter((rec, index) => rec.text !== originalRecs[index]?.text).length;
    for (let i = 0; i < sanitizedCount; i += 1) {
      recordGuardSanitization();
    }

    // Apply validated recommendations (3 trilhas separadas)
    report = {
      ...report,
      // TRILHA 1: LAUDO (somente biblioteca + guard)
      evidence_recommendations: guardResult.sanitized_recommendations as any,
      references: enrichedReport.references as any,
      // TRILHA 2: CONSULTA (web evidence - NÃO vai pro laudo)
      consult_assist: enrichedReport.consult_assist as any,
      // TRILHA 3: CURADORIA (candidatos staging)
      library_ingestion_candidates: enrichedReport.library_ingestion_candidates as any,
    };
  } catch (error) {
    console.error('[Orchestrator] RecommendationsAgent error:', error);
    // Continue without recommendations - graceful degradation
  }

  const explicitInputRecommendations = extractExplicitRecommendations(
    bundle.raw_input_markdown || [
      bundle.prior_reports?.raw_markdown || '',
      bundle.dictation_raw || '',
    ].join('\n')
  );

  const impression = await synthesizeImpression(report, bundle, explicitInputRecommendations);

  const curatedRecommendations = explicitInputRecommendations.length > 0
    ? explicitInputRecommendations
    : (report.evidence_recommendations?.map((rec) => rec.text) || []);

  const localizedRecommendations = await localizeRecommendationsToPtGemini(curatedRecommendations);

  report = {
    ...report,
    impression: {
      ...report.impression,
      ...applyImpressionProbabilityGuards(report.findings, {
        ...impression,
        recommendations: localizedRecommendations,
      }),
      recommendations: localizedRecommendations,
    },
  };

  try {
    const dict_result_post = applyVocabularyGate(report, {
      caseId: report.case_id,
      fields: {
        findings: false,
        comparison_summary: false,
        impression_primary_diagnosis: true,
        impression_recommendations: true,
        impression_differentials: true,
        impression_indication_relation: true,
        impression_incidental_findings: true,
        impression_adverse_events: true,
        impression_criteria_assessment: true,
      },
    });
    report = dict_result_post.report;
    if (dict_result_post.diagnostics.needs_review_hits.length > 0) {
      console.log(`[VocabularyGate] needs_review hits: ${dict_result_post.diagnostics.needs_review_hits.length}`);
    }
  } catch (error) {
    console.warn('[Orchestrator] VocabularyGate error:', error);
  }

  // === REVISOR AGENT (Extended Thinking) ===
  // Revisa o laudo completo antes do rendering final
  // NOTA: Requer Vercel Pro (maxDuration > 10s) - desabilitado por padrão
  if (CONFIG.REVISOR_ENABLED) {
    try {
      console.log('[Orchestrator] Iniciando Revisor (Extended Thinking)...');
      const revisorResult = await runRevisor(report, bundle);

      if (revisorResult.corrections.length > 0) {
        console.log(`[Orchestrator] Revisor aplicou ${revisorResult.corrections.length} correções:`);
        revisorResult.corrections.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
        report = revisorResult.revised_report;
      } else {
        console.log('[Orchestrator] Revisor: nenhuma correção necessária');
      }

      // Log reasoning tokens para monitorar custos
      if (revisorResult.reasoning_tokens > 0) {
        console.log(`[Orchestrator] Revisor reasoning tokens: ${revisorResult.reasoning_tokens}`);
      }
    } catch (error) {
      console.error('[Orchestrator] Revisor error:', error);
      // Continue without revision - graceful degradation
    }
  } else {
    console.log('[Orchestrator] Revisor desabilitado (REVISOR_ENABLED=0)');
  }

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
      model_used: `${CONFIG.MODEL_NAME}+${OPENAI_MODELS.impression}+${CONFIG.REVISOR_MODEL}`,
    },
  };

  return {
    report,
    markdown: finalMarkdown,
    qa: healing.qa,
    risk,
  };
}

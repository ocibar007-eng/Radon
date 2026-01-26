import type { ReportJSON } from '../../../types/report-json';
import type { QAResult } from '../../../types/qa-result';

export type RiskLevel = 'S1' | 'S2' | 'S3';

export type RiskTelemetry = {
  latency_ms: number;
  auto_fix_applied: boolean;
  missing_markers: number;
};

export type RiskAssessment = {
  level: RiskLevel;
  reasons: string[];
  telemetry: RiskTelemetry;
};

export function classifyRisk(
  report: ReportJSON,
  qa: QAResult,
  telemetry: RiskTelemetry
): RiskAssessment {
  const reasons: string[] = [];
  const flags = report.flags || {};

  const hardGateFailed = flags.hard_gate_failed ?? !qa.passed;
  if (hardGateFailed) {
    reasons.push('hard_gate_failed');
  }
  if (flags.laterality_mismatch) {
    reasons.push('laterality_mismatch');
  }
  if (flags.hallucination_detected) {
    reasons.push('hallucination_detected');
  }

  if (reasons.length > 0) {
    return { level: 'S1', reasons, telemetry };
  }

  if (flags.auto_fix_applied || telemetry.auto_fix_applied) {
    reasons.push('auto_fix_applied');
  }
  if (telemetry.latency_ms > 10000) {
    reasons.push('latency_high');
  }
  if (telemetry.missing_markers > 2) {
    reasons.push('missing_data_markers');
  }

  if (reasons.length > 0) {
    return { level: 'S2', reasons, telemetry };
  }

  return { level: 'S3', reasons: ['passed_all_gates'], telemetry };
}

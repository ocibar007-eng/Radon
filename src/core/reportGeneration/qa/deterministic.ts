import { checkBanlist } from '../../../utils/banlist';
import { applyBlacklist } from '../../../utils/blacklist';
import type { ReportJSON } from '../../../types/report-json';
import type { QAResult } from '../../../types/qa-result';

const REQUIRED_SECTIONS = ['indication', 'technique', 'findings', 'impression'] as const;

export function runDeterministicQA(report: ReportJSON, finalText: string): QAResult {
  const banlist = checkBanlist(finalText);
  const blacklist = applyBlacklist(finalText);

  const missingSections: string[] = [];
  if (!report.indication?.clinical_history) missingSections.push('indication.clinical_history');
  if (!report.indication?.exam_reason) missingSections.push('indication.exam_reason');
  if (!report.technique?.equipment) missingSections.push('technique.equipment');
  if (!report.findings || report.findings.length === 0) missingSections.push('findings');
  if (!report.impression?.primary_diagnosis) missingSections.push('impression.primary_diagnosis');

  const issues: string[] = [];

  if (!banlist.passed) {
    issues.push(`Banlist: ${banlist.violations.map(v => `"${v.phrase}"`).join(', ')}`);
  }

  if (blacklist.corrections.length > 0) {
    issues.push(`Blacklist: ${blacklist.corrections.length} correções aplicáveis`);
  }

  if (missingSections.length > 0) {
    issues.push(`Estrutura: faltando ${missingSections.join(', ')}`);
  }

  return {
    passed: banlist.passed && missingSections.length === 0,
    banlist,
    blacklist,
    structure: {
      passed: missingSections.length === 0,
      missing_sections: missingSections,
    },
    issues,
  };
}

export { REQUIRED_SECTIONS };

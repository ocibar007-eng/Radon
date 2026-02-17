import { checkBanlist } from '../../../utils/banlist';
import { applyBlacklist } from '../../../utils/blacklist';
import type { ReportJSON } from '../../../types/report-json';
import type { QAResult } from '../../../types/qa-result';

const REQUIRED_SECTIONS = ['indication', 'technique', 'findings', 'impression'] as const;
const IMPRESSION_SUBTITLES = [
  '**Diagnóstico principal:**',
  '**Diagnósticos diferenciais:**',
  '**Relação com a indicação clínica:**',
  '**Recomendações:**',
  '**Achados incidentais:**',
  '**Eventos adversos:**',
];
const PROBABILITY_NOTE_TITLE = '**NOTA SOBRE DESCRITORES DE PROBABILIDADE**';
const CLARIFICATION_NOTE_TITLE = '**■ NOTA DE ESCLARECIMENTO**';
const COMPARISON_TITLE = '**COMPARAÇÃO**';

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

  const missingImpressionSubtitles = IMPRESSION_SUBTITLES.filter(
    (title) => !finalText.includes(title)
  );
  if (missingImpressionSubtitles.length > 0) {
    issues.push(`Impressão: subtítulos ausentes (${missingImpressionSubtitles.join(', ')})`);
  }

  const missingComparisonSection = !finalText.includes(COMPARISON_TITLE);
  if (missingComparisonSection) {
    issues.push('Comparação: seção ausente');
  }

  const needsNotes = ['CT', 'MR'].includes(report.modality?.toUpperCase?.() || '');
  let missingNotes = false;
  if (needsNotes) {
    if (!finalText.includes(PROBABILITY_NOTE_TITLE)) {
      issues.push('Impressão: nota de descritores de probabilidade ausente');
      missingNotes = true;
    }
    if (!finalText.includes(CLARIFICATION_NOTE_TITLE)) {
      issues.push('Impressão: nota de esclarecimento ausente');
      missingNotes = true;
    }
  }

  let comparisonIssues = false;
  if (report.comparison?.available) {
    if (/não foram disponibilizados exames prévios/i.test(finalText)) {
      issues.push('Comparação: texto indica ausência de exames prévios apesar de estarem disponíveis');
      comparisonIssues = true;
    }
    if (report.comparison?.date && !finalText.includes(report.comparison.date)) {
      issues.push('Comparação: data do laudo prévio ausente');
      comparisonIssues = true;
    }
  }

  const structurePassed = missingSections.length === 0
    && missingImpressionSubtitles.length === 0
    && !missingComparisonSection
    && !missingNotes
    && !comparisonIssues;

  return {
    passed: banlist.passed && structurePassed,
    banlist,
    blacklist,
    structure: {
      passed: structurePassed,
      missing_sections: missingSections,
    },
    issues,
  };
}

export { REQUIRED_SECTIONS };

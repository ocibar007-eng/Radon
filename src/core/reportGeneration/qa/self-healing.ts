import type { ReportJSON } from '../../../types/report-json';
import type { QAResult } from '../../../types/qa-result';

export const MAX_ATTEMPTS = 2;

export type SelfHealingResult = {
  markdown: string;
  qa: QAResult;
  attempts: number;
  autoFixApplied: boolean;
};

export type SelfHealingRenderer = (report: ReportJSON, feedback?: string) => Promise<string>;
export type SelfHealingCanonicalizer = (text: string) => string;
export type SelfHealingQaRunner = (report: ReportJSON, text: string) => QAResult;

function buildFeedback(qa: QAResult): string {
  if (qa.issues.length === 0) {
    return 'Revisar o texto para cumprir o formato e remover erros.';
  }
  return `Corrigir os seguintes problemas: ${qa.issues.join(' | ')}`;
}

export async function healReport(
  report: ReportJSON,
  initialMarkdown: string,
  render: SelfHealingRenderer,
  qaRunner: SelfHealingQaRunner,
  canonicalize: SelfHealingCanonicalizer
): Promise<SelfHealingResult> {
  let markdown = canonicalize(initialMarkdown);
  let qa = qaRunner(report, markdown);
  let attempts = 0;
  let autoFixApplied = false;

  while (!qa.passed && attempts < MAX_ATTEMPTS) {
    const feedback = buildFeedback(qa);
    const regenerated = await render(report, feedback);
    markdown = canonicalize(regenerated);
    qa = qaRunner(report, markdown);
    attempts += 1;
    autoFixApplied = true;
  }

  return { markdown, qa, attempts, autoFixApplied };
}

import type { ReportAudit } from '../../types/report-json';

const AUDIT_TITLE = 'AUDITORIA INTERNA (NAO COPIAR PARA O LAUDO)';

export function formatAuditBlock(audit?: ReportAudit): string {
  if (!audit || !audit.entries || audit.entries.length === 0) return '';

  const inferred = audit.entries.filter((entry) => entry.type === 'inferred');
  const missing = audit.entries.filter((entry) => entry.type === 'missing');

  const lines: string[] = ['---', '', AUDIT_TITLE, ''];
  lines.push(`Nivel de inferencia: ${audit.inference_level.toUpperCase()}`);
  lines.push('');

  if (inferred.length > 0) {
    lines.push('Inferencias aplicadas:');
    lines.push('');
    for (const entry of inferred) {
      lines.push(`▪ ${entry.formula} (${entry.ref_id}): ${entry.details}`);
      lines.push('');
    }
  }

  if (missing.length > 0) {
    lines.push('Pendencias para classificacao:');
    lines.push('');
    for (const entry of missing) {
      lines.push(`▪ ${entry.formula} (${entry.ref_id}): ${entry.details}`);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

export function appendAuditBlock(markdown: string, audit?: ReportAudit): string {
  const block = formatAuditBlock(audit);
  if (!block) return markdown;
  const trimmed = markdown.trimEnd();
  return `${trimmed}\n\n${block}\n`;
}

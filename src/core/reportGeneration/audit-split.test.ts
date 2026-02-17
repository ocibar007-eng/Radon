import { describe, expect, it } from 'vitest';
import { mergeReportAndAudit, splitReportAndAudit } from './audit-split';

describe('audit-split', () => {
  it('splits report and audit when marker exists', () => {
    const markdown = [
      '# IMPRESSAO',
      '',
      'Texto do laudo.',
      '',
      '---',
      '',
      'AUDITORIA INTERNA (NÃO COPIAR PARA O LAUDO)',
      '',
      '- item 1',
    ].join('\n');

    const split = splitReportAndAudit(markdown);
    expect(split.report).toContain('Texto do laudo.');
    expect(split.audit).toContain('AUDITORIA INTERNA');
  });

  it('merges report and audit preserving sections', () => {
    const merged = mergeReportAndAudit('LAUDO', 'AUDITORIA INTERNA (NAO COPIAR PARA O LAUDO)');
    expect(merged).toContain('LAUDO');
    expect(merged).toContain('AUDITORIA INTERNA');
  });
});


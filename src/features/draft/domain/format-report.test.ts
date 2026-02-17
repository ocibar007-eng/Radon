import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildStyledReportHtmlForExport,
  markdownToCleanHTML,
  markdownToClipboardText,
  prepareMarkdownForRender,
} from './format-report';

describe('format-report', () => {
  it('renders GFM table and horizontal rules from laudo fixture', () => {
    const fixturePath = path.resolve(process.cwd(), 'src/adapters/anthropic/laudo-api.md');
    const markdown = fs.readFileSync(fixturePath, 'utf-8');
    const html = markdownToCleanHTML(markdown);

    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<hr');
    expect(html).toContain('Estrutura / Achado');
  });

  it('normalizes legacy separators and keeps sections visually stable', () => {
    const fixturePath = path.resolve(process.cwd(), 'docs/testes laudos atuais/pre-laudo-2026-02-17 (1).md');
    const markdown = fs.readFileSync(fixturePath, 'utf-8');
    const normalized = prepareMarkdownForRender(markdown);
    const html = markdownToCleanHTML(markdown);

    const hrCount = (html.match(/<hr\/?/g) || []).length;
    expect(hrCount).toBeGreaterThan(5);
    expect(html).not.toContain('<h2>ANEXO LIDO INTEGRALMENTE');
    expect(normalized).not.toContain('\n---\n---\n');
    expect(normalized).toMatch(/\*\*Achados incidentais relevantes:\*\*[\s\S]*\n\n[▪◦•·]/u);
    expect(normalized).toMatch(/\nAdulto de meia-idade/u);
  });

  it('splits inline labels and differential rationale into separate lines', () => {
    const markdown = [
      '**Achados incidentais relevantes:** ▪ foco esclerotico em T9.',
      '► **Acometimento osseo:** A favor: contexto oncologico.',
      '► **Acometimento osseo 2:** Contra/menos favoravel: sem sinais especificos.',
    ].join('\n');

    const normalized = prepareMarkdownForRender(markdown);
    expect(normalized).toContain('**Achados incidentais relevantes:**\n\n▪ foco esclerotico em T9.');
    expect(normalized).toContain('► **Acometimento osseo:**\n\n▪ A favor: contexto oncologico.');
    expect(normalized).toContain('► **Acometimento osseo 2:**\n\n▪ Contra/menos favoravel: sem sinais especificos.');
  });

  it('builds styled export html with clinical typography profile', () => {
    const markdown = [
      '**TOMOGRAFIA COMPUTADORIZADA DE TORAX**',
      '',
      'Corpo do laudo em paragrafo normal.',
      '',
      '---',
      '',
      '**NOTA SOBRE DESCRITORES DE PROBABILIDADE**',
      '',
      'Texto da nota.',
    ].join('\n');

    const html = buildStyledReportHtmlForExport(markdown, {
      bodyFontPt: 12,
      titleFontPt: 14,
      notesFontPt: 10,
      lineHeight: 1.5,
      centerExamTitle: true,
      justify: true,
    });

    expect(html).toContain('font-size: 12pt');
    expect(html).toContain('line-height: 1.5');
    expect(html).toContain('text-align: justify');
    expect(html).toContain('font-size: 14pt');
    expect(html).toContain('text-align: center');
    expect(html).toContain('font-size: 10pt');
    expect(html).toContain('NOTA SOBRE DESCRITORES DE PROBABILIDADE');
  });

  it('removes ANEXO LIDO header only when requested', () => {
    const markdown = [
      'ANEXO LIDO INTEGRALMENTE: SIM. NOME: TESTE | OS: 123',
      '',
      '**TOMOGRAFIA COMPUTADORIZADA DE TORAX**',
      '',
      'Texto principal.',
      '',
      '---',
      '',
      '**NOTA DE PROCEDIMENTO**',
      '',
      'Texto da nota.',
    ].join('\n');

    const withHeader = buildStyledReportHtmlForExport(markdown, {
      removeAnnexReadHeader: false,
    });
    const withoutHeader = buildStyledReportHtmlForExport(markdown, {
      bodyFontPt: 10,
      titleFontPt: 12,
      notesFontPt: 8,
      fontFamily: 'Arial, Helvetica, sans-serif',
      removeAnnexReadHeader: true,
    });

    expect(withHeader).toContain('ANEXO LIDO INTEGRALMENTE');
    expect(withoutHeader).not.toContain('ANEXO LIDO INTEGRALMENTE');
    expect(withoutHeader).toContain('font-family: Arial, Helvetica, sans-serif');
    expect(withoutHeader).toContain('font-size: 10pt');
    expect(withoutHeader).toContain('font-size: 12pt');
    expect(withoutHeader).toContain('font-size: 8pt');
  });

  it('removes ANEXO LIDO header from clipboard text when requested', () => {
    const markdown = [
      'ANEXO LIDO INTEGRALMENTE: SIM. NOME: TESTE | OS: 123',
      '',
      '**TOMOGRAFIA COMPUTADORIZADA DE TORAX**',
      '',
      'Texto principal.',
    ].join('\n');

    const withHeader = markdownToClipboardText(markdown);
    const withoutHeader = markdownToClipboardText(markdown, {
      removeAnnexReadHeader: true,
    });

    expect(withHeader).toContain('ANEXO LIDO INTEGRALMENTE');
    expect(withoutHeader).not.toContain('ANEXO LIDO INTEGRALMENTE');
    expect(withoutHeader).toContain('TOMOGRAFIA COMPUTADORIZADA DE TORAX');
  });

  it('inserts a horizontal rule after NOTA DE PROCEDIMENTO content', () => {
    const markdown = [
      '**TOMOGRAFIA COMPUTADORIZADA DE TORAX**',
      '',
      '**NOTA DE PROCEDIMENTO**',
      '',
      'Texto da nota de procedimento.',
      '',
      '**FIGURA CHAVE**',
      '',
      'Imagem representativa.',
    ].join('\n');

    const normalized = prepareMarkdownForRender(markdown);
    expect(normalized).toMatch(/\*\*NOTA DE PROCEDIMENTO\*\*[\s\S]*Texto da nota de procedimento\.\n\n---\n\n\*\*FIGURA CHAVE\*\*/u);
  });
});

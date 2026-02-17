import { describe, expect, it } from 'vitest';
import { canonicalizeMarkdown } from './canonicalizer';

const TRIANGLE = '\u25BA';

describe('canonicalizeMarkdown', () => {
  it('normalizes spacing, blank lines, duplicates, and blacklist', () => {
    const input = `TC  ABDOME  TOTAL\r\n\r\n\r\nLinha repetida\nLinha repetida\n\n  ÃƒÂ¢Ã¢â‚¬â€œÃ‚Âº  Achado  principal  \n`;
    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain('tomografia computadorizada ABDOME TOTAL');
    expect(result.text).toContain('Linha repetida');
    expect(result.text.match(/Linha repetida/g)?.length).toBe(1);
    expect(result.text).toContain(`${TRIANGLE} Achado principal`);
    expect(result.text).not.toContain('\n\n\n');
  });

  it('moves inline triangle bullet to the line below subtitle', () => {
    const input = `Parede Toracica e Tecidos Moles ${TRIANGLE} Alteracoes pos-operatorias discretas.`;
    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain(`Parede Toracica e Tecidos Moles\n${TRIANGLE} Alteracoes pos-operatorias discretas.`);
  });

  it('reconstructs flattened comparison table with markdown separator row', () => {
    const input = [
      '**COMPARACAO**',
      'Estrutura | Previo (03/12/2025) | Atual (10/02/2026) | Variacao abs | Variacao % Colecao hidropneumatica pleural direita | 10,3 x 3,6 x 8,9 cm | 11,3 x 8,4 x 3,0 cm | <VERIFICAR> | <VERIFICAR>',
    ].join('\n');
    const result = canonicalizeMarkdown(input);

    expect(result.text).toContain('| Estrutura | Previo (03/12/2025) | Atual (10/02/2026) | Variacao abs | Variacao % |');
    expect(result.text).toContain('| --- | --- | --- | --- | --- |');
    expect(result.text).toContain('| Colecao hidropneumatica pleural direita | 10,3 x 3,6 x 8,9 cm | 11,3 x 8,4 x 3,0 cm | <VERIFICAR> | <VERIFICAR> |');
  });

  it('unwraps very long narrative bold lines to normal body text', () => {
    const input = '**Adulto de meia-idade, sexo masculino, com antecedente de neoplasia pulmonar e controle evolutivo pos-operatorio em contexto oncologico.**';
    const result = canonicalizeMarkdown(input);
    expect(result.text.trim()).toBe('Adulto de meia-idade, sexo masculino, com antecedente de neoplasia pulmonar e controle evolutivo pos-operatorio em contexto oncologico.');
  });

  it('demotes accidental long markdown headings into normal text', () => {
    const input = '### Adulto de meia-idade, sexo masculino, com antecedente de neoplasia pulmonar a direita e seguimento pos-operatorio.';
    const result = canonicalizeMarkdown(input);
    expect(result.text.trim()).toBe('Adulto de meia-idade, sexo masculino, com antecedente de neoplasia pulmonar a direita e seguimento pos-operatorio.');
  });

  it('keeps one thematic break and separates subtitle from first triangle bullet', () => {
    const input = [
      'NOME: PACIENTE TESTE',
      '---',
      '---',
      '**TECNICA E PROTOCOLO**',
      '---',
      '**Parenquima Pulmonar**',
      `${TRIANGLE} Transparencia e arquitetura preservadas.`,
    ].join('\n');

    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain('NOME: PACIENTE TESTE\n\n---\n**TECNICA E PROTOCOLO**\n\n---\n\n**Parenquima Pulmonar**\n\n');
    expect(result.text).toContain(`\n\n${TRIANGLE} Transparencia e arquitetura preservadas.`);
    expect(result.text).not.toContain('\n---\n---\n');
  });

  it('splits inline labels and keeps differential rationale in dedicated lines', () => {
    const input = [
      '**Achados incidentais relevantes:** ▪ foco esclerotico em T9.',
      '► **Hipotese 1:** A favor: contexto oncologico.',
      '► **Hipotese 2:** contexto infeccioso menos provavel. ▪ A favor: sinais cronicos da parede.',
    ].join('\n');

    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain('**Achados incidentais relevantes:**\n\n▪ foco esclerotico em T9.');
    expect(result.text).toContain('► **Hipotese 1:**\n\n▪ A favor: contexto oncologico.');
    expect(result.text).toContain('► **Hipotese 2:** contexto infeccioso menos provavel.\n\n▪ A favor: sinais cronicos da parede.');
    expect(result.text).not.toContain('menos provavel. ▪ A favor');
  });

  it('capitalizes opening sentence in INDICACAO CLINICA', () => {
    const input = [
      '**INDICACAO CLINICA**',
      '---',
      'adulto de meia-idade em seguimento oncologico.',
    ].join('\n');

    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain('Adulto de meia-idade em seguimento oncologico.');
  });
});

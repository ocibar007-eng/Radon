import { describe, it, expect } from 'vitest';
import {
  extractExplicitRecommendations,
  extractMostRecentDate,
  extractMostRecentPriorReport,
  buildComparisonContext,
  isEnteroTCFromText,
  normalizeComparisonSummary,
  buildDeterministicComparisonSummary
} from './report-utils';

describe('report-utils', () => {
  it('extracts most recent date from mixed formats', () => {
    const input = [
      'Realizado em 2025-10-28.',
      'Data/Hora: 28/01/2026.',
    ].join('\n');
    expect(extractMostRecentDate(input)).toBe('28/01/2026');
  });

  it('extracts explicit recommendations block', () => {
    const input = [
      'Recomendações:',
      '► Repetir TC de tórax em curto prazo.',
      '► Considerar PET/CT a critério clínico.',
      '',
      'NOTA SOBRE DESCRITORES DE PROBABILIDADE',
    ].join('\n');
    expect(extractExplicitRecommendations(input)).toEqual([
      'Repetir TC de tórax em curto prazo.',
      'Considerar PET/CT a critério clínico.',
    ]);
  });

  it('normalizes comparison summary when missing or denying comparison', () => {
    const summary = 'Não foram disponibilizados exames prévios para comparação.';
    const normalized = normalizeComparisonSummary(summary, '23/02/2022');
    expect(normalized.summary).toBe(
      'Comparado com laudo prévio de 23/02/2022. Resumo limitado por ausência de dados comparativos objetivos.'
    );
    expect(normalized.usedFallback).toBe(true);
  });

  it('builds deterministic comparison summary from shared findings', () => {
    const prior = [
      '## LAUDO PRÉVIO [1]',
      '> NOTA: Realizado em 2022-02-23. Fonte: interno_sabin',
      'IMPRESSÃO: LITÍASE RENAL BILATERAL.',
    ].join('\n');
    const current = 'Achados atuais mostram cálculos renais bilaterais.';
    const priorInfo = extractMostRecentPriorReport(prior);
    const context = buildComparisonContext(priorInfo, 'CT');
    const summary = buildDeterministicComparisonSummary(priorInfo?.text || prior, current, context);
    expect(summary).toContain('SABIN MEDICINA DIAGNÓSTICA');
    expect(summary).toContain('Litíase renal');
  });

  it('detects entero-tc from title or dictation', () => {
    expect(isEnteroTCFromText('ENTERO-TC ABDOME')).toBe(true);
    expect(isEnteroTCFromText('enterografia por TC')).toBe(true);
    expect(isEnteroTCFromText('TC ABDOME', 'achado sem menção específica')).toBe(false);
  });
});

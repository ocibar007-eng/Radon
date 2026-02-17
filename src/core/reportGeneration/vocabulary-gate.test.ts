import { describe, it, expect } from 'vitest';
import type { ReportJSON } from '../../types/report-json';
import { applyVocabularyGate } from './vocabulary-gate';
import { buildDictionaryIndex, type DictionaryEntry } from './agents/dictionary';

const baseReport = (overrides: Partial<ReportJSON> = {}): ReportJSON => ({
  case_id: 'case-001',
  modality: 'CT',
  indication: {
    clinical_history: 'Dor abdominal.',
    exam_reason: 'Investigacao.',
    patient_age_group: 'adulto',
    patient_sex: 'M',
  },
  technique: {
    equipment: 'tomografo',
    protocol: 'abdome',
    contrast: { used: false },
  },
  findings: [
    {
      organ: 'Figado',
      description: 'Anechoic lesion 5mm.',
    },
  ],
  impression: {
    primary_diagnosis: 'Anechoic lesion',
    recommendations: ['CT follow-up in 6 months'],
  },
  metadata: {
    created_at: '2026-01-01T00:00:00.000Z',
    model_used: 'test',
    prompt_version: 'v0',
    qa_passed: true,
    risk_score: 'S1',
  },
  ...overrides,
});

const dictionaryEntries: DictionaryEntry[] = [
  { term_en: 'anechoic', term_pt: 'anecoico', status: 'ok' },
  { term_en: 'lesion', term_pt: 'lesao', status: 'ok' },
  { term_en: 'ct', term_pt: 'TC', status: 'keep_en' },
  { term_en: 'chip', term_pt: 'chip', status: 'needs_review' },
];

const dictionary = buildDictionaryIndex(dictionaryEntries);

describe('Vocabulary Gate', () => {
  it('replaces ok terms', () => {
    const report = baseReport();
    const result = applyVocabularyGate(report, { enable: true, dictionary, logPath: null });
    expect(result.report.findings[0].description).toContain('anecoico');
    expect(result.report.findings[0].description).toContain('lesao');
  });

  it('keeps keep_en terms unchanged', () => {
    const report = baseReport({
      impression: {
        primary_diagnosis: 'CT abdomen',
      },
    });
    const result = applyVocabularyGate(report, { enable: true, dictionary, logPath: null });
    expect(result.report.impression.primary_diagnosis).toBe('CT abdomen');
  });

  it('does not translate needs_review terms and records hit', () => {
    const report = baseReport({
      impression: {
        primary_diagnosis: 'chip present',
      },
    });
    const result = applyVocabularyGate(report, {
      enable: true,
      dictionary,
      logPath: null,
      caseId: 'case-xyz',
      now: () => new Date('2026-01-01T12:00:00.000Z'),
    });

    expect(result.report.impression.primary_diagnosis).toBe('chip present');
    expect(result.diagnostics.needs_review_hits.length).toBe(1);
    expect(result.diagnostics.needs_review_hits[0]).toMatchObject({
      term_en: 'chip',
      field: 'impression.primary_diagnosis',
      case_id: 'case-xyz',
    });
  });

  it('preserves numbers and units', () => {
    const report = baseReport({
      findings: [
        {
          organ: 'Figado',
          description: 'Anechoic lesion 5mm and 3 cm.',
        },
      ],
    });
    const result = applyVocabularyGate(report, { enable: true, dictionary, logPath: null });
    expect(result.report.findings[0].description).toContain('5mm');
    expect(result.report.findings[0].description).toContain('3 cm');
  });

  it('never alters evidence_recommendations text', () => {
    const report = baseReport({
      evidence_recommendations: [
        {
          finding_type: 'nodule',
          text: 'Anechoic lesion 5mm',
          conditional: false,
        },
      ],
    });
    const result = applyVocabularyGate(report, { enable: true, dictionary, logPath: null });
    expect(result.report.evidence_recommendations?.[0]?.text).toBe('Anechoic lesion 5mm');
  });
});

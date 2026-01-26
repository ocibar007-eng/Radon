import { describe, it, expect } from 'vitest';
import { runDeterministicQA } from './deterministic';
import type { ReportJSON } from '../../../types/report-json';

function buildReport(): ReportJSON {
  return {
    case_id: 'case-qa-001',
    modality: 'US',
    indication: {
      clinical_history: 'Dor abdominal',
      exam_reason: 'Investigação',
      patient_age_group: 'adulto',
      patient_sex: 'F',
    },
    technique: {
      equipment: 'US',
      protocol: 'Abdome total',
      contrast: {
        used: false,
      },
    },
    findings: [
      {
        organ: 'Fígado',
        description: 'Sem alterações significativas.',
      },
    ],
    impression: {
      primary_diagnosis: 'Sem achados agudos.',
    },
    metadata: {
      created_at: '2025-01-20T00:00:00Z',
      model_used: 'test',
      prompt_version: 'v1',
      qa_passed: true,
      risk_score: 'S3',
    },
  };
}

describe('Deterministic QA', () => {
  it('flags banlist violations', () => {
    const report = buildReport();
    const result = runDeterministicQA(report, 'Conforme áudio, tudo normal.');
    expect(result.passed).toBe(false);
    expect(result.banlist.passed).toBe(false);
    expect(result.issues.some(issue => issue.includes('Banlist'))).toBe(true);
  });

  it('flags missing structure fields', () => {
    const report = buildReport();
    report.impression.primary_diagnosis = '';
    const result = runDeterministicQA(report, 'Texto normal.');
    expect(result.structure.passed).toBe(false);
    expect(result.structure.missing_sections).toContain('impression.primary_diagnosis');
  });
});

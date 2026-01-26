import { describe, it, expect } from 'vitest';
import { classifyRisk } from './risk';
import type { ReportJSON } from '../../../types/report-json';
import type { QAResult } from '../../../types/qa-result';

const baseReport: ReportJSON = {
  case_id: 'case-001',
  modality: 'CT',
  indication: {
    clinical_history: 'Dor abdominal.',
    exam_reason: 'Investigacao.',
    patient_age_group: 'adulto',
    patient_sex: 'M',
  },
  technique: {
    equipment: 'tomografo multislice (64 canais)',
    protocol: 'abdome total',
    contrast: { used: false },
  },
  findings: [],
  impression: {
    primary_diagnosis: 'Sem alteracoes.',
  },
  metadata: {
    created_at: new Date().toISOString(),
    model_used: 'test',
    prompt_version: 'v8.7.9',
    qa_passed: false,
    risk_score: 'S3',
  },
};

const qaPass: QAResult = {
  passed: true,
  banlist: { passed: true, violations: [] },
  blacklist: { corrected: '', corrections: [] },
  structure: { passed: true, missing_sections: [] },
  issues: [],
};

const qaFail: QAResult = {
  passed: false,
  banlist: { passed: false, violations: [{ phrase: 'conforme áudio', index: 1 }] },
  blacklist: { corrected: '', corrections: [] },
  structure: { passed: false, missing_sections: ['impression.primary_diagnosis'] },
  issues: ['Banlist: "conforme audio"'],
};

describe('classifyRisk', () => {
  it('returns S1 when QA fails', () => {
    const result = classifyRisk(baseReport, qaFail, {
      latency_ms: 2000,
      auto_fix_applied: false,
      missing_markers: 0,
    });
    expect(result.level).toBe('S1');
  });

  it('returns S2 when auto-fix applied', () => {
    const result = classifyRisk(baseReport, qaPass, {
      latency_ms: 2000,
      auto_fix_applied: true,
      missing_markers: 0,
    });
    expect(result.level).toBe('S2');
  });

  it('returns S3 when all gates pass', () => {
    const result = classifyRisk(baseReport, qaPass, {
      latency_ms: 2000,
      auto_fix_applied: false,
      missing_markers: 0,
    });
    expect(result.level).toBe('S3');
  });
});

import { describe, it, expect } from 'vitest';
import type { CaseBundle } from '../../types';
import type { ClinicalOutput, TechnicalOutput, FindingsOutput } from './agents/types';
import type { ComputeResult } from '../../types/compute-request';
import { buildReport } from './orchestrator';

describe('orchestrator buildReport', () => {
  it('assembles a report and attaches compute results', () => {
    const bundle: CaseBundle = {
      case_id: 'case-001',
      case_metadata: {
        fields: { Exame: 'TC ABDOME TOTAL' },
        raw_markdown: '',
      },
      clinical_context: { raw_markdown: '' },
      dictation_raw: '',
      exam_data: { raw_markdown: '', notes: '' },
      prior_reports: { raw_markdown: '' },
      attachments_summary: null,
      source: { format: 'json', path: 'tests' },
      raw_input_markdown: '',
    };

    const clinical: ClinicalOutput = {
      clinical_history: 'Dor abdominal.',
      exam_reason: 'Investigacao.',
      patient_age_group: 'adulto',
      patient_sex: 'M',
    };

    const technical: TechnicalOutput = {
      equipment: 'tomografo multislice (64 canais)',
      protocol: 'abdome total',
      contrast: { used: false },
    };

    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Figado',
          description: 'Sem alteracoes significativas.',
        },
      ],
    };

    const computeResults: ComputeResult[] = [
      {
        ref_id: 'finding-001',
        formula: 'VASC-0001',
        result: 0.72,
      },
    ];

    const report = buildReport(bundle, clinical, technical, findings, computeResults);
    expect(report.modality).toBe('CT');
    expect(report.compute_results?.['finding-001']?.result).toBe(0.72);
  });
});

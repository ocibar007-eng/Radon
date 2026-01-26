import { describe, it, expect } from 'vitest';
import {
  FormulaFunctionNameMap,
  FormulaIdSchema,
  FormulaInputSchemaMap,
} from '../generated/formula-registry';
import {
  attachComputeResults,
  mapRequestsToCalculator,
  normalizeCalculatorResults,
  validateComputeRequests,
} from './calculator-client';
import type { ComputeResult, ComputeRequest } from '../types/compute-request';
import type { ReportJSON } from '../types/report-json';

function buildBaseReport(): ReportJSON {
  return {
    case_id: 'case-001',
    modality: 'CT',
    indication: {
      clinical_history: 'Dor abdominal',
      exam_reason: 'Investigação de dor',
      patient_age_group: 'adulto',
      patient_sex: 'M',
    },
    technique: {
      equipment: 'CT',
      protocol: 'Abdome sem contraste',
      contrast: {
        used: false,
      },
    },
    findings: [
      {
        organ: 'Rim',
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

describe('Formula registry', () => {
  it('rejects unknown formula ids', () => {
    const result = FormulaIdSchema.safeParse('INVALID-999');
    expect(result.success).toBe(false);
  });

  it('rejects inputs missing required fields', () => {
    const schema = FormulaInputSchemaMap['VASC-0001'];
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('Calculator client wiring', () => {
  it('attaches compute results by ref_id', () => {
    const report = buildBaseReport();
    const results: ComputeResult[] = [
      {
        ref_id: 'finding-001',
        formula: 'VASC-0001',
        result: 0.72,
      },
    ];

    const updated = attachComputeResults(report, results);
    expect(updated.compute_results?.['finding-001']?.result).toBe(0.72);
  });

  it('validates and attaches a mocked compute flow', () => {
    const report = buildBaseReport();
    const requests: ComputeRequest[] = [
      {
        formula: 'VASC-0001',
        ref_id: 'finding-002',
        inputs: {
          psv: 1.2,
          edv: 0.3,
        },
      },
    ];

    const validated = validateComputeRequests(requests);
    expect(validated).toHaveLength(1);

    const mockedResults: ComputeResult[] = [
      {
        ref_id: 'finding-002',
        formula: 'VASC-0001',
        result: 0.75,
      },
    ];

    const updated = attachComputeResults(report, mockedResults);
    expect(updated.compute_results?.['finding-002']?.result).toBe(0.75);
  });

  it('maps formula ids to calculator function names', () => {
    const requests: ComputeRequest[] = [
      {
        formula: 'VASC-0001',
        ref_id: 'finding-003',
        inputs: {
          psv: 1.1,
          edv: 0.4,
        },
      },
    ];

    const { requests: mapped, refIdFormulaMap } = mapRequestsToCalculator(requests);
    const functionName = FormulaFunctionNameMap['VASC-0001'];
    expect(functionName).toBeTruthy();
    expect(mapped[0].formula).toBe(functionName);
    expect(refIdFormulaMap['finding-003']).toBe('VASC-0001');
  });

  it('normalizes calculator results back to formula ids', () => {
    const functionName = FormulaFunctionNameMap['VASC-0001'] || 'VASC-0001';
    const rawResults = [
      {
        ref_id: 'finding-004',
        formula: functionName,
        result: 0.81,
      },
    ];

    const normalized = normalizeCalculatorResults(rawResults, {
      'finding-004': 'VASC-0001',
    });
    expect(normalized[0].formula).toBe('VASC-0001');
  });

  it('throws when formula is not mapped to a calculator function', () => {
    const requests: ComputeRequest[] = [
      {
        formula: 'ABD-0011',
        ref_id: 'finding-005',
        inputs: {},
      },
    ];

    expect(() => mapRequestsToCalculator(requests)).toThrow(
      'Formula(s) not wired in calculator service'
    );
  });
});

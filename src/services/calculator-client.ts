import {
  FormulaFunctionNameMap,
  FormulaIdSchema,
  FormulaInputSchemaMap,
} from '../generated/formula-registry';
import type { ComputeRequest, ComputeResult } from '../types/compute-request';
import type { ReportJSON } from '../types/report-json';

const DEFAULT_CALC_URL = 'http://localhost:8081';
const CALC_URL = process.env.CALCULATOR_URL || process.env.VITE_CALC_URL || DEFAULT_CALC_URL;

export type CalculatorComputeRequest = Omit<ComputeRequest, 'formula'> & { formula: string };

export function validateComputeRequests(requests: ComputeRequest[]): ComputeRequest[] {
  const errors: string[] = [];
  const validated: ComputeRequest[] = [];

  for (const req of requests) {
    const formulaCheck = FormulaIdSchema.safeParse(req.formula);
    if (!formulaCheck.success) {
      errors.push(`Formula invalid: ${req.formula}`);
      continue;
    }

    const inputSchema = FormulaInputSchemaMap[req.formula];
    const inputCheck = inputSchema.safeParse(req.inputs);
    if (!inputCheck.success) {
      errors.push(`Inputs invalid for ${req.formula}`);
      continue;
    }

    validated.push(req);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid compute requests: ${errors.join('; ')}`);
  }

  return validated;
}

export function mapRequestsToCalculator(requests: ComputeRequest[]): {
  requests: CalculatorComputeRequest[];
  refIdFormulaMap: Record<string, string>;
} {
  const missing: string[] = [];
  const mapped: CalculatorComputeRequest[] = [];
  const refIdFormulaMap: Record<string, string> = {};

  for (const req of requests) {
    const functionName = FormulaFunctionNameMap[req.formula];
    if (!functionName) {
      missing.push(req.formula);
      continue;
    }

    refIdFormulaMap[req.ref_id] = req.formula;
    mapped.push({
      ...req,
      formula: functionName,
    });
  }

  if (missing.length > 0) {
    throw new Error('Formula(s) not wired in calculator service');
  }

  return { requests: mapped, refIdFormulaMap };
}

export function normalizeCalculatorResults(
  results: ComputeResult[],
  refIdFormulaMap: Record<string, string>
): ComputeResult[] {
  return results.map((result) => ({
    ...result,
    formula: refIdFormulaMap[result.ref_id] || result.formula,
  }));
}

export async function computeFormulas(requests: ComputeRequest[]): Promise<ComputeResult[]> {
  const validated = validateComputeRequests(requests);
  const { requests: mapped, refIdFormulaMap } = mapRequestsToCalculator(validated);

  const response = await fetch(`${CALC_URL}/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: mapped }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Calculator error: ${response.status} ${errorText}`);
  }

  const rawResults = (await response.json()) as ComputeResult[];
  return normalizeCalculatorResults(rawResults, refIdFormulaMap);
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${CALC_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function attachComputeResults(report: ReportJSON, results: ComputeResult[]): ReportJSON {
  const compute_results = {
    ...(report.compute_results || {}),
  };

  for (const result of results) {
    compute_results[result.ref_id] = result;
  }

  return {
    ...report,
    compute_results,
  };
}

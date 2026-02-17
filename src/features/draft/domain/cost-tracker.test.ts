import { describe, expect, it } from 'vitest';
import {
  calculateReportCost,
  getModelFamily,
  projectMonthlyBurnBRL,
} from './cost-tracker';

describe('cost-tracker', () => {
  it('uses sonnet pricing when model contains sonnet', () => {
    const cost = calculateReportCost(
      { input: 100000, output: 10000, cacheRead: 0, cacheWrite: 0 },
      'claude-sonnet-4-5',
    );
    // Sonnet: (0.1 * 3) + (0.01 * 15) = 0.45
    expect(cost.totalUSD).toBeCloseTo(0.45, 6);
  });

  it('projects monthly burn using month-to-date total', () => {
    const projection = projectMonthlyBurnBRL(
      60, // USD month-to-date
      new Date('2026-02-15T12:00:00Z'),
      1000,
    );
    expect(projection.projectedBRL).toBeGreaterThan(0);
    expect(projection.pctBudget).toBeGreaterThan(0);
  });

  it('detects model family', () => {
    expect(getModelFamily('claude-opus-4-6')).toBe('opus');
    expect(getModelFamily('claude-sonnet-4-5')).toBe('sonnet');
    expect(getModelFamily('claude-haiku-4-5')).toBe('haiku');
    expect(getModelFamily('gpt-5.2-2025-12-11')).toBe('gpt');
  });
});

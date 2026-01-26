import { describe, it, expect } from 'vitest';
import { applyBlacklist } from './blacklist';

describe('Blacklist', () => {
  it('applies corrections and reports counts', () => {
    const result = applyBlacklist('TC sem alterações.');
    expect(result.corrected).toContain('tomografia computadorizada');
    expect(result.corrected).toContain('sem alterações significativas');
    expect(result.corrections.length).toBeGreaterThan(0);
  });
});

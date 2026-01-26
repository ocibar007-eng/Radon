import { describe, it, expect } from 'vitest';
import { canonicalizeMarkdown } from './canonicalizer';

describe('canonicalizeMarkdown', () => {
  it('normalizes spacing, blank lines, duplicates, and blacklist', () => {
    const input = "TC  ABDOME  TOTAL\r\n\r\n\r\nLinha repetida\nLinha repetida\n\n  ►  Achado  principal  \n";
    const result = canonicalizeMarkdown(input);
    expect(result.text).toContain('tomografia computadorizada ABDOME TOTAL');
    expect(result.text).toContain('Linha repetida');
    expect(result.text.match(/Linha repetida/g)?.length).toBe(1);
    expect(result.text).toContain('► Achado principal');
    expect(result.text).not.toContain('\n\n\n');
  });
});

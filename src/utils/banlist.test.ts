import { describe, it, expect } from 'vitest';
import { checkBanlist } from './banlist';

describe('Banlist', () => {
  it('detects banned phrases', () => {
    const result = checkBanlist('Conforme áudio, exame sem alterações.');
    expect(result.passed).toBe(false);
    expect(result.violations[0]?.phrase).toBe('conforme áudio');
  });

  it('passes when no banned phrases are present', () => {
    const result = checkBanlist('Exame sem achados relevantes.');
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

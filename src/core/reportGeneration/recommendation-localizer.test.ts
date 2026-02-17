import { describe, it, expect } from 'vitest';
import { localizeRecommendationsToPt } from './recommendation-localizer';

describe('localizeRecommendationsToPt', () => {
  it('returns original recommendations when already in PT-BR', async () => {
    const input = ['Recomenda-se correlação clínica e seguimento conforme diretrizes institucionais.'];
    const result = await localizeRecommendationsToPt(input);
    expect(result).toEqual(input);
  });
});

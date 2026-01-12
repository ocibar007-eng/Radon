
import { describe, it, expect } from 'vitest';
import { safeJsonParse } from './json';
import { z } from 'zod';

describe('Utils: JSON Parser Seguro', () => {
  const Schema = z.object({ key: z.string() });
  const fallback = { key: 'fallback' };

  it('deve limpar blocos de código markdown ```json', () => {
    const llmOutput = "Aqui está o JSON:\n```json\n{ \"key\": \"value\" }\n```";
    const result = safeJsonParse(llmOutput, fallback);
    expect(result).toEqual({ key: "value" });
  });

  it('deve limpar blocos de código markdown sem a tag json', () => {
    const llmOutput = "```\n{ \"key\": \"value\" }\n```";
    const result = safeJsonParse(llmOutput, fallback);
    expect(result).toEqual({ key: "value" });
  });

  it('deve usar o fallback se o JSON for inválido', () => {
    const brokenJson = "{ key: value }"; // JSON inválido (sem aspas)
    const result = safeJsonParse(brokenJson, fallback);
    expect(result).toEqual(fallback);
  });

  it('deve validar com Zod e retornar dados se válido', () => {
    const json = '{ "key": "valid_string" }';
    const result = safeJsonParse(json, fallback, Schema);
    expect(result).toEqual({ key: "valid_string" });
  });

  it('deve retornar fallback se Zod falhar (Schema mismatch)', () => {
    const json = '{ "key": 123 }'; // Esperava string, recebeu number
    const result = safeJsonParse(json, fallback, Schema);
    expect(result).toEqual(fallback);
  });
});

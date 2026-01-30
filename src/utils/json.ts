
import { ZodType } from 'zod';

/**
 * Remove blocos de código Markdown (```json ... ```)
 */
function cleanMarkdownJson(text: string): string {
  if (!text) return '{}';

  // Tenta encontrar bloco json explicito ```json ... ``` ou apenas ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Se não achar bloco, retorna texto original (trim)
  return text.trim();
}

function extractJsonPayload(text: string): string | null {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstBrace === -1 && firstBracket === -1) return null;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = text.lastIndexOf('}');
  } else {
    start = firstBracket;
    end = text.lastIndexOf(']');
  }

  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1).trim();
}

function extractBalancedJson(text: string): string | null {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return null;

  let start = -1;
  let stack: string[] = [];
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else {
    start = firstBracket;
  }
  if (start === -1) return null;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === '}' || ch === ']') {
      const last = stack.pop();
      if (!last) continue;
      if ((last === '{' && ch !== '}') || (last === '[' && ch !== ']')) {
        continue;
      }
      if (stack.length === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

/**
 * Tenta fazer parse do JSON e validar com Schema Zod.
 * Retorna o fallback em caso de falha grave, ou dados parciais se o Zod conseguir recuperar defaults.
 * 
 * Mudança: Usamos ZodType<T, any, any> em vez de ZodSchema<T> para permitir que o 
 * Input do schema (JSON solto/any) seja diferente do Output T (Interface estrita).
 */
export function safeJsonParse<T>(text: string, fallback: T, schema?: ZodType<T, any, any>): T {
  try {
    const cleaned = cleanMarkdownJson(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      const balanced = extractBalancedJson(cleaned);
      if (balanced) {
        parsed = JSON.parse(balanced);
      } else {
      const extracted = extractJsonPayload(cleaned);
      if (!extracted || extracted === cleaned) {
        throw parseError;
      }
      parsed = JSON.parse(extracted);
      }
    }

    // CORREÇÃO: Se a IA retornou um array quando esperávamos um objeto, tenta achar o primeiro item válido
    if (Array.isArray(parsed) && parsed.length > 0 && schema) {
      console.warn('[JSON] IA retornou array ao invés de object, procurando item válido');
      const candidate = parsed.find((item) => schema.safeParse(item).success);
      parsed = candidate ?? parsed[0];
    }

    if (schema) {
      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      } else {
        console.warn("Falha de validação de Schema (Zod):", (result as any).error);
        // Em um cenário real, poderíamos tentar recuperar dados parciais aqui
        // Por enquanto, retornamos o fallback para evitar crash
        return fallback;
      }
    }

    return parsed as T;
  } catch (error) {
    console.warn("Falha ao fazer parse do JSON do LLM:", error);
    console.debug("Texto recebido:", text);
    return fallback;
  }
}

import {
  FormulaInputSchemaMap,
  FormulaMetaMap,
  SubareaSynonymsMap,
  type FormulaId,
  type FormulaMeta,
} from '../../generated/formula-registry';

export type SearchLang = 'pt' | 'en' | 'any';

export interface FormulaSearchResult {
  id: FormulaId;
  meta: FormulaMeta;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function collectSubareaSynonyms(code?: string, lang: SearchLang = 'any'): string[] {
  if (!code) return [];
  const section = SubareaSynonymsMap[code];
  if (!section) return [];

  const terms: string[] = [];
  if (lang === 'pt' || lang === 'any') {
    terms.push(...section.pt, ...section.hooks_pt);
  }
  if (lang === 'en' || lang === 'any') {
    terms.push(...section.en, ...section.hooks_en);
  }
  return terms;
}

function buildHaystack(meta: FormulaMeta, lang: SearchLang): string[] {
  const terms = [meta.displayName, ...meta.synonyms, ...meta.searchTerms, ...meta.tags];
  if (meta.category) terms.push(meta.category);
  if (meta.subcategory) terms.push(meta.subcategory);
  if (meta.categoryCode) {
    terms.push(...collectSubareaSynonyms(meta.categoryCode, lang));
  }
  if (meta.subareaCode) {
    terms.push(...collectSubareaSynonyms(meta.subareaCode, lang));
  }
  return terms.filter(Boolean);
}

export function searchFormula(query: string, lang: SearchLang = 'any'): FormulaSearchResult[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const results: FormulaSearchResult[] = [];

  for (const [id, meta] of Object.entries(FormulaMetaMap) as [FormulaId, FormulaMeta][]) {
    const haystack = buildHaystack(meta, lang)
      .map(value => normalizeText(value))
      .filter(Boolean);

    if (haystack.some(value => value.includes(normalizedQuery))) {
      results.push({ id, meta });
    }
  }

  return results;
}

export function listBySubarea(subareaTag: string): FormulaSearchResult[] {
  const normalized = subareaTag.trim().toUpperCase();
  return (Object.entries(FormulaMetaMap) as [FormulaId, FormulaMeta][])
    .filter(([, meta]) => meta.subareaCode === normalized || meta.categoryCode === normalized)
    .map(([id, meta]) => ({ id, meta }));
}

export function getQAWarnings(formulaId: FormulaId, inputs: unknown): string[] {
  const meta = FormulaMetaMap[formulaId];
  const warnings = [...meta.qaChecks];

  const schema = FormulaInputSchemaMap[formulaId];
  const parsed = schema.safeParse(inputs);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => {
      const path = issue.path.join('.') || 'inputs';
      return `${path}: ${issue.message}`;
    });
    warnings.push(...issues);
  }

  return warnings;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';

interface CompendiumItem {
  ItemID: string;
  Categoria?: string;
  Subcategoria?: string;
  Nome?: string;
  Sinonimos?: string;
  search_terms?: string[];
  evidence_notes?: string;
  Status?: string;
  tags?: string[];
}

interface CalcInput {
  name: string;
  type?: string;
  unit?: string;
  required?: string | boolean;
  valid_range?: string;
  notes?: string;
}

interface CalcBlock {
  ItemID: string;
  FunctionName?: string;
  inputs?: CalcInput[];
  qa_checks?: string[];
  evidence?: {
    primary_source?: string;
    radiopaedia_link?: string;
    notes?: string;
  };
  output?: {
    raw?: string[];
  };
}

interface SynonymsSection {
  label: string;
  pt: string[];
  en: string[];
  hooks_pt: string[];
  hooks_en: string[];
  extra: string[];
}

type SynonymsMap = Record<string, SynonymsSection>;

interface FormulaInputMeta {
  key: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  validRange?: string;
  notes?: string;
}

interface FormulaMeta {
  displayName: string;
  category?: string;
  subcategory?: string;
  categoryCode?: string;
  subareaCode?: string;
  functionName?: string;
  tags: string[];
  synonyms: string[];
  searchTerms: string[];
  qaChecks: string[];
  evidence: {
    primary_source?: string;
    radiopaedia_link?: string;
    notes?: string;
    evidence_notes?: string;
  };
  inputs?: FormulaInputMeta[];
  outputUnits?: string[];
  todos?: string[];
}

const dataDir = path.join(process.cwd(), 'data', 'compendium');
const outputPath = path.join(process.cwd(), 'src', 'generated', 'formula-registry.ts');

function normalizeInputKey(name: string): string {
  const base = name.split('(')[0].trim();
  const cleaned = base
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')
    .toLowerCase();
  return cleaned || 'value';
}

function splitSynonyms(raw?: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(';')
    .flatMap(part => part.split(','))
    .map(part => part.trim())
    .filter(Boolean);
  return parts;
}

function parseRange(range?: string): { min?: number; max?: number } {
  if (!range) return {};
  const cleanRange = range.replace(/–|—/g, '-');
  const dashMatch = cleanRange.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (dashMatch) {
    const a = Number(dashMatch[1]);
    const b = Number(dashMatch[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const matches = cleanRange.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return {};
  const numbers = matches.map(Number);
  if (numbers.length >= 2) {
    const [a, b] = numbers;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const value = numbers[0];
  if (range.includes('>') || range.includes('≥')) {
    return { min: value };
  }
  if (range.includes('<') || range.includes('≤')) {
    return { max: value };
  }
  return {};
}

function toBoolean(value?: string | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toString().toLowerCase() === 'true';
}

function parseOutputUnits(raw?: string[]): string[] {
  if (!raw) return [];
  const units: string[] = [];
  for (const line of raw) {
    const match = line.match(/^unit:\s*(.+)$/i);
    if (match) {
      const unit = match[1].replace(/^"|"$/g, '').trim();
      if (unit) units.push(unit);
    }
  }
  return units;
}

function buildInputMeta(calcBlock?: CalcBlock): { inputs?: FormulaInputMeta[]; todos: string[] } {
  const todos: string[] = [];
  if (!calcBlock || !calcBlock.inputs || calcBlock.inputs.length === 0) {
    todos.push('inputs_missing');
    return { todos };
  }

  const inputs: FormulaInputMeta[] = [];
  const usedKeys = new Map<string, number>();

  for (const input of calcBlock.inputs) {
    const label = input.name?.trim() || 'value';
    let key = normalizeInputKey(label);
    if (usedKeys.has(key)) {
      const count = (usedKeys.get(key) || 1) + 1;
      usedKeys.set(key, count);
      key = `${key}_${count}`;
      todos.push(`duplicate_input_key:${label}`);
    } else {
      usedKeys.set(key, 1);
    }

    const type = (input.type || 'number').toLowerCase();
    const required = toBoolean(input.required ?? true);
    const validRange = input.valid_range?.trim();

    inputs.push({
      key,
      label,
      type,
      unit: input.unit?.trim(),
      required,
      validRange,
      notes: input.notes?.trim(),
    });
  }

  return { inputs, todos };
}

function buildInputSchemaCode(inputs?: FormulaInputMeta[]): string {
  if (!inputs || inputs.length === 0) {
    return 'z.record(z.any())';
  }

  const sorted = [...inputs].sort((a, b) => a.key.localeCompare(b.key));
  const lines = sorted.map(input => {
    let schema = 'z.any()';
    if (input.type.includes('int')) {
      schema = 'z.number().int()';
    } else if (input.type.includes('number') || input.type.includes('float')) {
      schema = 'z.number()';
    } else if (input.type.includes('string')) {
      schema = 'z.string()';
    } else if (input.type.includes('bool')) {
      schema = 'z.boolean()';
    }

    const range = parseRange(input.validRange);
    if (typeof range.min === 'number') {
      schema += `.min(${range.min})`;
    }
    if (typeof range.max === 'number') {
      schema += `.max(${range.max})`;
    }

    if (!input.required) {
      schema += '.optional()';
    }

    return `  ${JSON.stringify(input.key)}: ${schema},`;
  });

  return `z.object({\n${lines.join('\n')}\n}).passthrough()`;
}

function parseCode(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^([A-Z]\d+)/);
  if (match) return match[1];
  return value.split(' ')[0]?.trim();
}

async function main() {
  const [compRaw, blocksRaw, synonymsRaw] = await Promise.all([
    fs.readFile(path.join(dataDir, 'compendio.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'calc_blocks.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'synonyms.json'), 'utf8'),
  ]);

  const compendium: CompendiumItem[] = JSON.parse(compRaw);
  const calcBlocks: Record<string, CalcBlock> = JSON.parse(blocksRaw);
  const synonyms: SynonymsMap = JSON.parse(synonymsRaw);

  const formulaItems = compendium.filter(item => item.Status === 'OK');
  const formulaIds = formulaItems.map(item => item.ItemID).sort();

  const inputSchemaEntries: string[] = [];
  const functionNameEntries: string[] = [];
  const reverseFunctionNameMap = new Map<string, string>();
  const functionNameCollisions = new Map<string, string[]>();
  const metaEntries: Record<string, FormulaMeta> = {};

  for (const item of formulaItems) {
    const id = item.ItemID;
    const calcBlock = calcBlocks[id];
    const { inputs, todos } = buildInputMeta(calcBlock);
    const inputSchemaCode = buildInputSchemaCode(inputs);

    inputSchemaEntries.push(`  ${JSON.stringify(id)}: ${inputSchemaCode},`);

    const categoryCode = parseCode(item.Categoria);
    const subareaCode = parseCode(item.Subcategoria);

    const metaTodos = [...todos];
    if (!calcBlock) {
      metaTodos.push('calc_block_missing');
    }

    const functionName = calcBlock?.FunctionName?.trim() || null;
    if (functionName) {
      const existing = reverseFunctionNameMap.get(functionName);
      if (existing && existing !== id) {
        const entries = functionNameCollisions.get(functionName) || [existing];
        if (!entries.includes(id)) {
          entries.push(id);
        }
        functionNameCollisions.set(functionName, entries);
      } else {
        reverseFunctionNameMap.set(functionName, id);
      }
    }

    functionNameEntries.push(`  ${JSON.stringify(id)}: ${functionName ? JSON.stringify(functionName) : 'null'},`);

    const outputUnits = parseOutputUnits(calcBlock?.output?.raw);

    metaEntries[id] = {
      displayName: item.Nome || id,
      category: item.Categoria,
      subcategory: item.Subcategoria,
      categoryCode,
      subareaCode,
      functionName: calcBlock?.FunctionName,
      tags: item.tags || [],
      synonyms: splitSynonyms(item.Sinonimos),
      searchTerms: item.search_terms || [],
      qaChecks: calcBlock?.qa_checks || [],
      evidence: {
        primary_source: calcBlock?.evidence?.primary_source,
        radiopaedia_link: calcBlock?.evidence?.radiopaedia_link,
        notes: calcBlock?.evidence?.notes,
        evidence_notes: item.evidence_notes,
      },
      inputs,
      outputUnits: outputUnits.length ? outputUnits : undefined,
      todos: metaTodos.length ? metaTodos : undefined,
    };
  }

  const metaJson = JSON.stringify(metaEntries, null, 2);
  const synonymsJson = JSON.stringify(synonyms, null, 2);
  const functionNameMapEntries = [...reverseFunctionNameMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fn, id]) => `  ${JSON.stringify(fn)}: ${JSON.stringify(id)},`);
  const collisionEntries = [...functionNameCollisions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fn, ids]) => `  ${JSON.stringify(fn)}: ${JSON.stringify(ids.sort())},`);

  const content = `/* eslint-disable */\n/* This file is auto-generated by scripts/generate_formula_registry.ts */\n\nimport { z } from 'zod';\n\nexport const FORMULA_IDS = ${JSON.stringify(formulaIds, null, 2)} as const;\n\nexport const FormulaIdSchema = z.enum(FORMULA_IDS);\n\nexport type FormulaId = z.infer<typeof FormulaIdSchema>;\n\nexport interface FormulaInputMeta {\n  key: string;\n  label: string;\n  type: string;\n  unit?: string;\n  required: boolean;\n  validRange?: string;\n  notes?: string;\n}\n\nexport interface FormulaMeta {\n  displayName: string;\n  category?: string;\n  subcategory?: string;\n  categoryCode?: string;\n  subareaCode?: string;\n  functionName?: string;\n  tags: string[];\n  synonyms: string[];\n  searchTerms: string[];\n  qaChecks: string[];\n  evidence: {\n    primary_source?: string;\n    radiopaedia_link?: string;\n    notes?: string;\n    evidence_notes?: string;\n  };\n  inputs?: FormulaInputMeta[];\n  outputUnits?: string[];\n  todos?: string[];\n}\n\nexport interface SubareaSynonyms {\n  label: string;\n  pt: string[];\n  en: string[];\n  hooks_pt: string[];\n  hooks_en: string[];\n  extra: string[];\n}\n\nexport const SubareaSynonymsMap = ${synonymsJson} as const satisfies Record<string, SubareaSynonyms>;\n\nexport const FormulaFunctionNameMap = {\n${functionNameEntries.join("\n")}\n} as const satisfies Record<FormulaId, string | null>;\n\nexport const FunctionNameToFormulaIdMap = {\n${functionNameMapEntries.join("\n")}\n} as const satisfies Record<string, FormulaId>;\n\nexport const FunctionNameCollisionMap = {\n${collisionEntries.join("\n")}\n} as const satisfies Record<string, FormulaId[]>;\n\nexport const FormulaInputSchemaMap = {\n${inputSchemaEntries.join('\n')}\n} as const satisfies Record<FormulaId, z.ZodTypeAny>;\n\nexport const FormulaMetaMap = ${metaJson} as const satisfies Record<FormulaId, FormulaMeta>;\n\nexport type FormulaInputsById = {\n  [K in FormulaId]: z.infer<(typeof FormulaInputSchemaMap)[K]>;\n};\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, 'utf8');

  console.log(`Generated ${outputPath} with ${formulaIds.length} formulas`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DictionaryStatus = 'ok' | 'keep_en' | 'needs_review';

export type DictionaryEntry = {
  term_en: string;
  term_pt: string;
  status: DictionaryStatus;
  domain?: string;
  source?: string;
  confidence?: number;
  notes?: string;
};

export type DictionaryIndex = Map<string, DictionaryEntry>;

const resolveBaseDir = () => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url));
  }
  return process.cwd();
};

const DEFAULT_DICT_PATH = path.resolve(
  resolveBaseDir(),
  'assets',
  'dictionary_full.json'
);

let cachedIndex: DictionaryIndex | null = null;
let cachedPath: string | null = null;

export function normalizeDictionaryKey(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function candidateDictionaryKeys(term: string): string[] {
  const raw = term.trim();
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (key: string) => {
    if (key && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  };

  const base = normalizeDictionaryKey(raw);
  add(base);

  if (base.includes(' ')) {
    add(base.replace(/ /g, '-'));
    add(base.replace(/ /g, '_'));
  }
  if (raw.includes('-')) {
    add(normalizeDictionaryKey(raw.replace(/-/g, ' ')));
  }
  if (raw.includes('_')) {
    add(normalizeDictionaryKey(raw.replace(/_/g, ' ')));
  }

  if (base.endsWith('s') && base.length > 3) {
    add(base.slice(0, -1));
  } else if (base && !base.endsWith('s')) {
    add(`${base}s`);
  }

  return ordered;
}

export function buildDictionaryIndex(entries: DictionaryEntry[]): DictionaryIndex {
  const index: DictionaryIndex = new Map();
  for (const entry of entries) {
    if (!entry?.term_en) continue;
    const key = normalizeDictionaryKey(entry.term_en);
    if (!key) continue;
    index.set(key, entry);
  }
  return index;
}

export function getDictionaryIndex(dictPath?: string): DictionaryIndex {
  const resolvedPath = dictPath || process.env.RADON_VOCAB_DICT_PATH || DEFAULT_DICT_PATH;
  if (cachedIndex && cachedPath === resolvedPath) {
    return cachedIndex;
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(raw) as DictionaryEntry[];
  if (!Array.isArray(parsed)) {
    throw new Error(`Vocabulary dictionary malformed: expected array, got ${typeof parsed}`);
  }

  cachedIndex = buildDictionaryIndex(parsed);
  cachedPath = resolvedPath;
  return cachedIndex;
}

export function lookupDictionaryEntry(term: string, index: DictionaryIndex): DictionaryEntry | null {
  for (const key of candidateDictionaryKeys(term)) {
    const entry = index.get(key);
    if (entry) return entry;
  }
  return null;
}

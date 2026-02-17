import { applyBlacklist } from '../../utils/blacklist.ts';

export type CanonicalizeResult = {
  text: string;
  corrections: Array<{ original: string; corrected: string; count: number }>;
};

const TRIANGLE_BULLET = '\u25BA';
const SUB_BULLET_RE = /^\s*[▪◦•·]\s+/u;
const TRIANGLE_VARIANTS_GLOBAL_RE = /[\u25BA\u25B8\u25B6\u25BB]/g;
const TRIANGLE_VARIANTS_SINGLE_RE = /[\u25BA\u25B8\u25B6\u25BB]/;
const TRIANGLE_MOJIBAKE_RE = /(?:Ã¢â€“Âº|ÃƒÂ¢Ã¢â‚¬â€œÃ‚Âº|Ã¢â€“Â¸|Ã¢â€“Â¶|Ã¢â€“Â»)/g;
const THEMATIC_BREAK_RE = /^([*_-])\1{2,}$/;

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeTriangleGlyphs(text: string): string {
  const repaired = text.replace(TRIANGLE_MOJIBAKE_RE, TRIANGLE_BULLET);
  return repaired.replace(TRIANGLE_VARIANTS_GLOBAL_RE, TRIANGLE_BULLET);
}

function isThematicBreakLine(value: string): boolean {
  return THEMATIC_BREAK_RE.test(value.trim());
}

function normalizeThematicBreakBlocks(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  const lastNonEmpty = (): string => {
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].trim()) return out[i];
    }
    return '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!isThematicBreakLine(trimmed)) {
      out.push(line);
      continue;
    }

    const prev = out.length > 0 ? out[out.length - 1] : '';
    if (prev.trim() && !isThematicBreakLine(prev)) {
      out.push('');
    }

    if (isThematicBreakLine(lastNonEmpty())) {
      continue;
    }

    out.push('---');

    const next = (lines[i + 1] || '').trim();
    if (next && !isThematicBreakLine(next)) {
      out.push('');
    }
  }

  return out.join('\n');
}

function isSubtitleLikeLine(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\*\*[^*].*\*\*:?[ \t]*$/u.test(trimmed)) return true;
  if (/^#{1,6}\s+\S/u.test(trimmed)) return true;
  return false;
}

function findTriangleIndex(text: string): number {
  const match = text.match(TRIANGLE_VARIANTS_SINGLE_RE);
  return match && typeof match.index === 'number' ? match.index : -1;
}

function splitInlineTriangleBullets(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+$/g, '');
    const indent = line.match(/^\s*/)?.[0] || '';
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith(TRIANGLE_BULLET)) {
      out.push(line);
      continue;
    }

    const bulletIndex = findTriangleIndex(trimmed);
    if (bulletIndex <= 0) {
      out.push(line);
      continue;
    }

    const before = trimmed.slice(0, bulletIndex).trimEnd();
    const after = trimmed.slice(bulletIndex + 1).trimStart();
    if (!before || !after) {
      out.push(line);
      continue;
    }

    if (!/\p{L}/u.test(before)) {
      out.push(line);
      continue;
    }

    out.push(`${indent}${before}`);
    out.push(`${indent}${TRIANGLE_BULLET} ${after}`);
  }

  return out.join('\n');
}

function separateSubtitleFromTriangleBullets(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    const next = lines[i + 1] || '';
    if (!isSubtitleLikeLine(line)) continue;
    if (!next.trim().startsWith(TRIANGLE_BULLET)) continue;

    out.push('');
  }

  return out.join('\n');
}

function splitInlineBoldLabelContent(text: string): string {
  const plainLabelRe = /^(\s*(?:Achados incidentais(?: relevantes)?|Eventos adversos|Diagn[oó]stico principal|Diagn[oó]sticos diferenciais|Rela[cç][aã]o com a indica[cç][aã]o cl[ií]nica|Recomenda[cç][oõ]es):)\s+(.+)$/iu;
  const lines = text.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\s*\*\*[^*]+:\*\*)\s+(.+)$/u);
    if (match) {
      out.push(match[1].trimEnd());
      out.push('');
      out.push(match[2].trimStart());
      continue;
    }

    const plainMatch = line.match(plainLabelRe);
    if (!plainMatch) {
      out.push(line);
      continue;
    }

    out.push(plainMatch[1].trimEnd());
    out.push('');
    out.push(plainMatch[2].trimStart());
  }

  return out.join('\n');
}

function splitInlineDifferentialRationale(text: string): string {
  const markerRe = /(\*{1,3}\s*A favor:\s*\*{1,3}|\*{1,3}\s*Contra\/menos favor[aá]vel:\s*\*{1,3}|A favor:|Contra\/menos favor[aá]vel:)/i;
  const lines = text.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const marker = line.match(markerRe);
    if (!marker || marker.index === undefined || marker.index <= 0) {
      out.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (SUB_BULLET_RE.test(trimmed)) {
      out.push(line);
      continue;
    }

    let prefix = line.slice(0, marker.index).trimEnd();
    let suffix = line.slice(marker.index).trimStart();
    prefix = prefix.replace(/[▪◦•·]\s*$/u, '').trimEnd();

    if (!prefix || !suffix) {
      out.push(line);
      continue;
    }

    if (!SUB_BULLET_RE.test(suffix)) {
      suffix = `▪ ${suffix}`;
    }

    out.push(prefix);
    out.push('');
    out.push(suffix);
  }

  return out.join('\n');
}

function isSubBulletLabelLine(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isSubtitleLikeLine(trimmed)) return true;
  if (/^►\s+\*\*.+:\*\*[ \t]*$/u.test(trimmed)) return true;
  if (/^►\s+.+:[ \t]*$/u.test(trimmed)) return true;
  if (/^[▪◦•·]\s+\*\*.+:\*\*[ \t]*$/u.test(trimmed)) return true;
  return false;
}

function separateLabelsFromSubBullets(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    const next = lines[i + 1] || '';
    if (!isSubBulletLabelLine(line)) continue;
    if (!SUB_BULLET_RE.test(next.trim())) continue;

    out.push('');
  }

  return out.join('\n');
}

function capitalizeIndicationOpening(text: string): string {
  const lines = text.split('\n');
  const isIndicationTitle = (value: string): boolean => {
    const normalized = removeDiacritics(value)
      .replace(/\*/g, '')
      .toLowerCase()
      .trim();
    return normalized === 'indicacao clinica';
  };

  const capitalizeFirstLetter = (value: string): string =>
    value.replace(/^(\s*)([\p{Ll}])/u, (_m, ws: string, ch: string) => `${ws}${ch.toLocaleUpperCase('pt-BR')}`);

  for (let i = 0; i < lines.length; i++) {
    if (!isIndicationTitle(lines[i])) continue;

    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j];
      const trimmed = candidate.trim();
      if (!trimmed || isThematicBreakLine(trimmed)) continue;
      if (trimmed.startsWith(TRIANGLE_BULLET) || SUB_BULLET_RE.test(trimmed)) break;
      lines[j] = capitalizeFirstLetter(candidate);
      return lines.join('\n');
    }
  }

  return lines.join('\n');
}

function unwrapLongBoldBodyLines(text: string): string {
  const lines = text.split('\n');
  const out = lines.map((line) => {
    const match = line.match(/^(\s*)\*\*(.+?)\*\*$/);
    if (!match) return line;

    const indent = match[1];
    const inner = match[2].trim().replace(/\s{2,}/g, ' ');
    if (inner.includes('|')) {
      return `${indent}${inner}`;
    }
    if (inner.length < 70) return line;

    if (inner.length <= 150 && !/[.,;]/.test(inner)) {
      return line;
    }

    return `${indent}${inner}`;
  });

  return out.join('\n');
}

function demoteLongHashHeadings(text: string): string {
  const lines = text.split('\n');
  const out = lines.map((line) => {
    const match = line.match(/^(\s*)#{1,6}\s+(.+)$/);
    if (!match) return line;

    const indent = match[1];
    const headingText = match[2].trim().replace(/\s{2,}/g, ' ');
    if (headingText.length < 80 && !/[.,;]/.test(headingText)) {
      return line;
    }

    return `${indent}${headingText}`;
  });
  return out.join('\n');
}

function parseInlineComparisonTable(line: string): string[] | null {
  const parts = line
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 8) return null;

  const headers = parts.slice(0, 5);
  const rowData = parts.slice(5);

  const pctHeaderIdx = headers.findIndex((header) =>
    removeDiacritics(header).toLowerCase().startsWith('variacao %')
  );

  if (pctHeaderIdx >= 0) {
    const original = headers[pctHeaderIdx];
    const pctPos = original.indexOf('%');
    if (pctPos >= 0) {
      const left = original.slice(0, pctPos + 1).trim();
      const right = original.slice(pctPos + 1).trim();
      headers[pctHeaderIdx] = left || 'Variacao %';
      if (right) {
        rowData.unshift(right);
      }
    }
  }

  while (headers.length < 5) {
    headers.push(`Coluna ${headers.length + 1}`);
  }

  if (rowData.length < 5) return null;

  const rows: string[] = [];
  for (let i = 0; i < rowData.length; i += 5) {
    const row = rowData.slice(i, i + 5);
    if (row.length < 5) break;
    rows.push(`| ${row.join(' | ')} |`);
  }

  if (rows.length === 0) return null;

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows,
  ];
}

function normalizeComparisonTableBlocks(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const trimmed = current.trim();

    if (!/^Estrutura\s*\|/i.test(trimmed)) {
      out.push(current);
      continue;
    }

    const next = (lines[i + 1] || '').trim();
    if (/^\|\s*:?-{3,}/.test(next)) {
      out.push(current);
      continue;
    }

    let combined = trimmed;
    let j = i + 1;
    while (j < lines.length) {
      const candidate = (lines[j] || '').trim();
      if (!candidate) break;
      if (
        candidate.startsWith(TRIANGLE_BULLET)
        || candidate.startsWith('##')
        || candidate.startsWith('**')
        || candidate === '---'
        || candidate.startsWith('- ')
      ) {
        break;
      }

      combined += ` | ${candidate}`;
      j += 1;

      if ((combined.match(/\|/g) || []).length >= 8) break;
    }

    const parsedTable = parseInlineComparisonTable(combined);
    if (!parsedTable) {
      out.push(current);
      continue;
    }

    if (out.length > 0 && out[out.length - 1] !== '') {
      out.push('');
    }
    out.push(...parsedTable);
    out.push('');
    i = j - 1;
  }

  return out.join('\n');
}

function normalizeLine(line: string): string {
  const leading = line.match(/^\s*/)?.[0] || '';
  const trimmed = line.trim();
  if (!trimmed) return '';
  const compacted = trimmed.replace(/\s{2,}/g, ' ');
  return `${leading}${compacted}`;
}

export function canonicalizeMarkdown(text: string): CanonicalizeResult {
  if (!text) return { text: '', corrections: [] };

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const normalizedFixes = [
    [/conforessonÃƒÂ¢ncia magnÃƒÂ©ticae/gi, 'conforme'],
    [/foressonÃƒÂ¢ncia magnÃƒÂ©ticaa/gi, 'forma'],
    [/noressonÃƒÂ¢ncia magnÃƒÂ©ticaais/gi, 'normais'],
    [/alaressonÃƒÂ¢ncia magnÃƒÂ©ticae/gi, 'alarme'],
    [/veressonÃƒÂ¢ncia magnÃƒÂ©ticaiforessonÃƒÂ¢ncia magnÃƒÂ©ticae/gi, 'vermiforme'],
    [/deforessonÃƒÂ¢ncia magnÃƒÂ©ticaidade/gi, 'deformidade'],
  ] as const;

  let normalizedText = normalizeTriangleGlyphs(normalized);
  for (const [pattern, replacement] of normalizedFixes) {
    normalizedText = normalizedText.replace(pattern, replacement);
  }

  normalizedText = splitInlineBoldLabelContent(normalizedText);
  normalizedText = splitInlineDifferentialRationale(normalizedText);
  normalizedText = normalizeComparisonTableBlocks(normalizedText);
  normalizedText = splitInlineTriangleBullets(normalizedText);
  normalizedText = separateSubtitleFromTriangleBullets(normalizedText);
  normalizedText = separateLabelsFromSubBullets(normalizedText);
  normalizedText = normalizeThematicBreakBlocks(normalizedText);
  normalizedText = capitalizeIndicationOpening(normalizedText);
  normalizedText = unwrapLongBoldBodyLines(normalizedText);
  normalizedText = demoteLongHashHeadings(normalizedText);

  const rawLines = normalizedText.split('\n');
  const cleanedLines: string[] = [];
  let lastNonEmpty = '';
  let lastWasEmpty = false;

  for (const raw of rawLines) {
    const trimmedLine = raw.replace(/[ \t]+$/g, '');
    const line = normalizeLine(trimmedLine);

    if (line.length === 0) {
      if (lastWasEmpty) continue;
      cleanedLines.push('');
      lastWasEmpty = true;
      continue;
    }

    if (line === lastNonEmpty && !isThematicBreakLine(line)) {
      continue;
    }

    cleanedLines.push(line);
    lastNonEmpty = line;
    lastWasEmpty = false;
  }

  let result = cleanedLines.join('\n').trim();
  const blacklist = applyBlacklist(result);
  result = blacklist.corrected.trim();

  const finalText = result.length ? `${result}\n` : '';
  return { text: finalText, corrections: blacklist.corrections };
}

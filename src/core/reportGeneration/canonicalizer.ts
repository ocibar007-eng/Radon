import { applyBlacklist } from '../../utils/blacklist';

export type CanonicalizeResult = {
  text: string;
  corrections: Array<{ original: string; corrected: string; count: number }>;
};

function normalizeLine(line: string): string {
  const leadingMatch = line.match(/^\s*/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const trimmed = line.trim();
  if (!trimmed) return '';
  const compacted = trimmed.replace(/\s{2,}/g, ' ');
  return `${leading}${compacted}`;
}

export function canonicalizeMarkdown(text: string): CanonicalizeResult {
  if (!text) return { text: '', corrections: [] };

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const normalizedFixes = [
    [/conforessonância magnéticae/gi, 'conforme'],
    [/foressonância magnéticaa/gi, 'forma'],
    [/noressonância magnéticaais/gi, 'normais'],
    [/alaressonância magnéticae/gi, 'alarme'],
    [/veressonância magnéticaiforessonância magnéticae/gi, 'vermiforme'],
    [/deforessonância magnéticaidade/gi, 'deformidade'],
  ] as const;

  let normalizedText = normalized;
  for (const [pattern, replacement] of normalizedFixes) {
    normalizedText = normalizedText.replace(pattern, replacement);
  }
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

    if (line === lastNonEmpty) {
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

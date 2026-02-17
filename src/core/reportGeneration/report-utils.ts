function normalizeHeader(value: string): string {
  return value
    .replace(/^\*\*/, '')
    .replace(/\*\*$/, '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function isEnteroTCFromText(...texts: Array<string | undefined | null>): boolean {
  const combined = normalizeForSearch(texts.filter(Boolean).join(' '));
  if (!combined) return false;
  if (combined.includes('enterografia')) return true;
  if (combined.includes('entero-tc') || combined.includes('entero tc')) return true;
  if (combined.includes('tc entero')) return true;
  if (combined.includes('entero') && (combined.includes('tc') || combined.includes('tomografia'))) {
    return true;
  }
  return false;
}

function isRecommendationHeader(line: string): boolean {
  const normalized = normalizeHeader(line);
  return normalized.startsWith('recomendac');
}
const BULLET_RE = /^\s*[►▶•\-*▪]\s*(.+)$/;
const HEADING_RE = /^\s*#{1,6}\s+/;
const STOP_RE = /^\s*(ASSINATURA|NOTA SOBRE|IMAGENS CHAVE|ACHADOS INCIDENTAIS|EVENTOS ADVERSOS|IMPRESSION|IMPRESSAO|COMPARACAO|COMPARAÇÃO)\b/i;

function compactText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractExplicitRecommendations(markdown: string): string[] {
  if (!markdown) return [];
  const lines = markdown.replace(/\r/g, '').split('\n');
  const results: string[] = [];
  let inBlock = false;

  const pushRecommendation = (value: string) => {
    const cleaned = compactText(value);
    if (!cleaned) return;
    results.push(cleaned);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inBlock) {
      if (isRecommendationHeader(line)) {
        inBlock = true;
        const colonIndex = line.indexOf(':');
        const inline = colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : '';
        if (inline) {
          pushRecommendation(inline);
        }
      }
      continue;
    }

    if (!line) {
      inBlock = false;
      continue;
    }

    if (HEADING_RE.test(line) || STOP_RE.test(line)) {
      inBlock = false;
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      pushRecommendation(bulletMatch[1]);
      continue;
    }

    if (results.length > 0) {
      results[results.length - 1] = compactText(`${results[results.length - 1]} ${line}`);
    } else {
      pushRecommendation(line);
    }
  }

  return Array.from(new Set(results));
}

const ISO_DATE_RE = /\b(20\d{2})[./-](\d{2})[./-](\d{2})\b/g;
const BR_DATE_RE = /\b(\d{2})[./-](\d{2})[./-](20\d{2})\b/g;

function toUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function extractMostRecentDate(markdown: string): string | undefined {
  if (!markdown) return undefined;

  const dates: Date[] = [];
  let match: RegExpExecArray | null;

  while ((match = ISO_DATE_RE.exec(markdown)) !== null) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = toUtcDate(year, month, day);
    if (date) dates.push(date);
  }

  while ((match = BR_DATE_RE.exec(markdown)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = toUtcDate(year, month, day);
    if (date) dates.push(date);
  }

  if (dates.length === 0) return undefined;
  dates.sort((a, b) => b.getTime() - a.getTime());
  return formatDate(dates[0]);
}

const INVALID_COMPARISON_RE = /não foram disponibilizados|nao foram disponibilizados/i;

export function buildComparisonFallback(date?: string): string {
  const safeDate = date && date.trim().length > 0 ? date.trim() : '';
  if (!safeDate) {
    return 'Comparado com laudo prévio. Resumo limitado por ausência de dados comparativos objetivos.';
  }
  return `Comparado com laudo prévio de ${safeDate}. Resumo limitado por ausência de dados comparativos objetivos.`;
}

export function normalizeComparisonSummary(
  summary: string | undefined,
  date?: string
): { summary: string; usedFallback: boolean } {
  if (!summary || !summary.trim()) {
    return { summary: buildComparisonFallback(date), usedFallback: true };
  }
  if (INVALID_COMPARISON_RE.test(summary)) {
    return { summary: buildComparisonFallback(date), usedFallback: true };
  }
  return { summary: summary.trim(), usedFallback: false };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasPositiveMention(text: string, pattern: RegExp): boolean {
  const normalized = normalizeText(text);
  const regex = new RegExp(pattern.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const start = Math.max(0, match.index - 15);
    const window = normalized.slice(start, match.index);
    if (!/(sem|ausencia|ausente)/i.test(window)) {
      return true;
    }
  }
  return false;
}

function hasNegativeMention(text: string, pattern: RegExp): boolean {
  const normalized = normalizeText(text);
  const regex = new RegExp(pattern.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const start = Math.max(0, match.index - 20);
    const window = normalized.slice(start, match.index);
    if (/(sem|ausencia|ausente|nao ha|não ha|nao ha evidencias|não há evidências)/i.test(window)) {
      return true;
    }
  }
  return false;
}

const LITHIASIS_RE = /(litia\w*|nefrolit|urolit|calculos?(?:\s+renais?|\s+nos?\s+rins?|\s+em\s+rins?|\s+bilaterais))/i;
const HYDRONEPHROSIS_RE = /(hidronefros|dilatac\w*.*sistema coletor|pielocalic|pelvicalic)/i;
const CYST_RE = /(cistos?\s+renais?|cisto\w*\s+renal|bosniak)/i;
const WALL_THICKENING_RE = /(espessamento parietal|parede\s+espessada|espessamento da parede)/i;
const HYPER_ENHANCE_RE = /(hiper[- ]?realce parietal|realce parietal acentuado|hiperrealce parietal)/i;
const STRATIFIED_RE = /(realce estratificado|sinal do alvo)/i;
const VASA_RECTA_RE = /(vasa recta|sinal do pente)/i;
const MESENTERIC_FAT_RE = /(gordura mesenter\w*|densifica\w* da gordura mesenter\w*|densidade da gordura mesenter\w*)/i;
const STENOSIS_RE = /(estenose|estreitamento luminal|estenose intestinal)/i;
const FISTULA_RE = /(fistul\w*|trajeto fistuloso)/i;
const ABSCESS_RE = /(abscesso|colec[aã]o|colecao|coleção)/i;
const OBSTRUCTION_RE = /(obstruc\w*|suboclus\w*|oclus\w* intestinal)/i;
const PERFORATION_RE = /(perfura\w*|pneumoperitoneo)/i;

const LITHIASIS_COUNT_WORDS: Array<{ label: string; value: number; match: RegExp }> = [
  { label: 'único', value: 1, match: /\b(unico|único|uma unica|um unico)\b/i },
  { label: 'poucos', value: 3, match: /\b(poucos|escassos)\b/i },
  { label: 'múltiplos', value: 6, match: /\b(multiplos|múltiplos)\b/i },
  { label: 'dezenas', value: 20, match: /\b(dezenas)\b/i },
  { label: 'inúmeros', value: 30, match: /\b(inumeros|inúmeros)\b/i },
];

type LithiasisData = {
  present: boolean;
  negative: boolean;
  bilateral: boolean;
  count?: number;
  countLabel?: string;
  sizeMm?: number;
};

type StenosisData = {
  present: boolean;
  negative: boolean;
  lengthCm?: number;
  upstreamDilationCm?: number;
};

type BinaryFindingData = {
  present: boolean;
  negative: boolean;
};

function parseNumber(value: string): number {
  return Number.parseFloat(value.replace(',', '.'));
}

function toMm(value: number, unit: string): number {
  return unit.toLowerCase() === 'cm' ? value * 10 : value;
}

function extractMaxMeasurementNear(
  text: string,
  contextRe: RegExp,
  maxDistance: number = 120
): number | undefined {
  const normalized = normalizeText(text);
  const contextPattern = contextRe.source;
  const regex = new RegExp(`${contextPattern}.{0,${maxDistance}}?(\\d+(?:[.,]\\d+)?)\\s*(mm|cm)`, 'gi');
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const value = parseNumber(match[1]);
    const unit = match[2];
    if (!Number.isNaN(value)) {
      values.push(toMm(value, unit));
    }
  }
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function extractLithiasisData(text: string): LithiasisData {
  const normalized = normalizeText(text);
  const present = hasPositiveMention(text, LITHIASIS_RE);
  const negative = hasNegativeMention(text, LITHIASIS_RE);
  const bilateral = /\bbilateral\b|\bambos os rins\b|\bambos\b/i.test(normalized);

  let count: number | undefined;
  let countLabel: string | undefined;
  const sentences = text.split(/\n+/);
  let contextActive = false;
  let contextLines = 0;
  for (const sentence of sentences) {
    const normalizedSentence = normalizeText(sentence);
    const hasContext = LITHIASIS_RE.test(normalizedSentence);
    const hasCalculusWord = /calculos?/.test(normalizedSentence);
    if (hasContext) {
      contextActive = true;
      contextLines = 0;
    }
    if (!hasContext && !contextActive) {
      continue;
    }
    if (!hasContext && contextActive && !hasCalculusWord) {
      contextLines += 1;
      if (contextLines > 2) {
        contextActive = false;
      }
      continue;
    }
    const countMatches = sentence.matchAll(/(\d{1,3})\s*(?:c[áa]lcul(?:o|os)?|calculos?)\b/gi);
    for (const match of countMatches) {
      const value = Number.parseInt(match[1], 10);
      if (!Number.isNaN(value)) {
        count = Math.max(count || 0, value);
        countLabel = undefined;
      }
    }
    const perSideMatches = sentence.matchAll(/(\d{1,3})\s*de\s*cada\s*lado/gi);
    for (const match of perSideMatches) {
      const value = Number.parseInt(match[1], 10);
      if (!Number.isNaN(value)) {
        count = Math.max(count || 0, value);
        countLabel = undefined;
      }
    }
    for (const word of LITHIASIS_COUNT_WORDS) {
      if (word.match.test(sentence)) {
        if (count === undefined) {
          count = word.value;
          countLabel = word.label;
        }
      }
    }

    contextLines += 1;
  }

  const sizeMm = extractMaxMeasurementNear(text, LITHIASIS_RE);

  return {
    present,
    negative,
    bilateral,
    count,
    countLabel,
    sizeMm,
  };
}

function extractBinaryFinding(text: string, pattern: RegExp): BinaryFindingData {
  const normalized = normalizeText(text);
  return {
    present: hasPositiveMention(normalized, pattern),
    negative: hasNegativeMention(normalized, pattern),
  };
}

function extractWallThickness(text: string): number | undefined {
  return extractMaxMeasurementNear(text, WALL_THICKENING_RE);
}

function extractStenosisData(text: string): StenosisData {
  const present = hasPositiveMention(text, STENOSIS_RE);
  const negative = hasNegativeMention(text, STENOSIS_RE);
  const length = extractMaxMeasurementNear(text, STENOSIS_RE);
  const dilationMatch = text.match(/dilatac\w*[^\\d]{0,15}(\\d+(?:[.,]\\d+)?)\\s*(cm|mm)/i);
  let upstreamDilationCm: number | undefined;
  if (dilationMatch) {
    const value = parseNumber(dilationMatch[1]);
    const unit = dilationMatch[2];
    if (!Number.isNaN(value)) {
      upstreamDilationCm = toMm(value, unit) / 10;
    }
  }
  return {
    present,
    negative,
    lengthCm: length !== undefined ? length / 10 : undefined,
    upstreamDilationCm,
  };
}

function compareValues(
  prior?: number,
  current?: number,
  thresholds: { ratio: number; absolute: number } = { ratio: 0.2, absolute: 1 }
): 'increase' | 'decrease' | 'stable' | 'unknown' {
  if (prior === undefined || current === undefined) return 'unknown';
  const diff = current - prior;
  const tolerance = Math.max(thresholds.absolute, Math.abs(prior) * thresholds.ratio);
  if (Math.abs(diff) <= tolerance) return 'stable';
  return diff > 0 ? 'increase' : 'decrease';
}

function formatNumber(value: number, unit: string): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  return `${formatted} ${unit}`;
}

function formatPercent(value: number): string {
  const formatted = value.toFixed(1).replace('.', ',');
  return `${value >= 0 ? '+' : ''}${formatted}%`;
}

function ensurePeriod(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildLithiasisComparison(prior: LithiasisData, current: LithiasisData): string | undefined {
  if (!prior.present && !current.present && !prior.negative && !current.negative) {
    return undefined;
  }

  if (prior.present && current.negative) {
    return 'Litíase renal previamente descrita não evidenciada no exame atual';
  }
  if (prior.negative && current.present) {
    return 'Litíase renal no exame atual, não descrita no laudo prévio';
  }
  if (!prior.present && current.present) {
    return 'Litíase renal no exame atual, sem descrição prévia disponível';
  }
  if (!current.present && prior.present) {
    return 'Litíase renal previamente descrita não evidenciada no exame atual';
  }

  if (prior.present && current.present) {
    const countChange = compareValues(prior.count, current.count, { ratio: 0.2, absolute: 2 });
    const sizeChange = compareValues(prior.sizeMm, current.sizeMm, { ratio: 0.2, absolute: 1 });

    const base = `Litíase renal${current.bilateral || prior.bilateral ? ' bilateral' : ''}`;
    const parts: string[] = [];

    if (countChange !== 'unknown') {
      if (countChange === 'stable') {
        parts.push('carga litiásica estável');
      } else if (countChange === 'increase') {
        parts.push('aumento da carga litiásica');
      } else {
        parts.push('redução da carga litiásica');
      }
    }

    if (sizeChange !== 'unknown') {
      if (sizeChange === 'stable') {
        parts.push('tamanho máximo dos cálculos estável');
      } else if (sizeChange === 'increase') {
        parts.push('aumento do tamanho máximo dos cálculos');
      } else {
        parts.push('redução do tamanho máximo dos cálculos');
      }
    }

    const describeCount = (count?: number, label?: string): string | undefined => {
      if (label) return `${label} de cálculos`;
      if (count !== undefined) return `${count} cálculos`;
      return undefined;
    };
    const priorCountDesc = describeCount(prior.count, prior.countLabel);
    const currentCountDesc = describeCount(current.count, current.countLabel);
    const countDetail =
      priorCountDesc && currentCountDesc
        ? ` (de ${priorCountDesc} para ${currentCountDesc})`
        : '';
    const sizeDetail =
      prior.sizeMm !== undefined && current.sizeMm !== undefined
        ? ` (de ${formatNumber(prior.sizeMm, 'mm')} para ${formatNumber(current.sizeMm, 'mm')})`
        : '';

    const details = [countDetail, sizeDetail].filter(Boolean).join(' ');

    if (parts.length > 0) {
      return `${base} com ${parts.join(' e ')}${details}`;
    }
    return `${base} sem dados objetivos suficientes para definir variação quantitativa`;
  }

  return undefined;
}

function buildWallThicknessComparison(priorText: string, currentText: string): string | undefined {
  const priorThickness = extractWallThickness(priorText);
  const currentThickness = extractWallThickness(currentText);
  const priorBinary = extractBinaryFinding(priorText, WALL_THICKENING_RE);
  const currentBinary = extractBinaryFinding(currentText, WALL_THICKENING_RE);

  if (priorThickness !== undefined && currentThickness !== undefined) {
    const change = compareValues(priorThickness, currentThickness, { ratio: 0.2, absolute: 1 });
    const phrase =
      change === 'stable'
        ? 'estável'
        : change === 'increase'
          ? 'aumento'
          : change === 'decrease'
            ? 'redução'
            : 'variação indeterminada';
    return `Espessamento parietal com ${phrase} (de ${formatNumber(priorThickness, 'mm')} para ${formatNumber(currentThickness, 'mm')}).`;
  }

  if (priorBinary.present && currentBinary.present) {
    return 'Espessamento parietal presente, sem dados objetivos para definir variação.';
  }
  return buildBinaryComparison('Espessamento parietal', priorBinary, currentBinary);
}

function buildStenosisComparison(priorText: string, currentText: string): string | undefined {
  const prior = extractStenosisData(priorText);
  const current = extractStenosisData(currentText);
  if (prior.lengthCm !== undefined && current.lengthCm !== undefined) {
    const change = compareValues(prior.lengthCm, current.lengthCm, { ratio: 0.2, absolute: 0.5 });
    const phrase =
      change === 'stable'
        ? 'estável'
        : change === 'increase'
          ? 'aumento'
          : change === 'decrease'
            ? 'redução'
            : 'variação indeterminada';
    return `Estenose intestinal com ${phrase} do comprimento (de ${formatNumber(prior.lengthCm, 'cm')} para ${formatNumber(current.lengthCm, 'cm')}).`;
  }

  if (prior.present && current.present) {
    return 'Estenose intestinal presente, sem dados objetivos para definir variação.';
  }

  return buildBinaryComparison('Estenose intestinal', { present: prior.present, negative: prior.negative }, { present: current.present, negative: current.negative });
}

function buildBinaryComparison(
  label: string,
  prior: BinaryFindingData,
  current: BinaryFindingData
): string | undefined {
  if (!prior.present && !current.present && !prior.negative && !current.negative) {
    return undefined;
  }
  if (prior.present && current.negative) {
    return `${label} previamente descrita não evidenciada no exame atual`;
  }
  if (prior.negative && current.present) {
    return `${label} no exame atual, não descrita no laudo prévio`;
  }
  if (prior.present && current.present) {
    return `${label} estável`;
  }
  if (prior.negative && current.negative) {
    return `Ausência de ${label.toLowerCase()}, estável`;
  }
  return undefined;
}

type SldValues = {
  basal?: number;
  nadir?: number;
  atual?: number;
  unlabeled?: number;
};

function extractSldValues(text: string): SldValues {
  const normalized = normalizeForSearch(text);
  const values: SldValues = {};
  const patterns: Array<{ key: keyof SldValues; re: RegExp }> = [
    { key: 'basal', re: /(sld|soma dos diamet\w*)[^0-9]{0,10}(basal|baseline)[^0-9]{0,10}(\d+(?:[.,]\d+)?)\s*(mm|cm)/gi },
    { key: 'nadir', re: /(sld|soma dos diamet\w*)[^0-9]{0,10}(nadir)[^0-9]{0,10}(\d+(?:[.,]\d+)?)\s*(mm|cm)/gi },
    { key: 'atual', re: /(sld|soma dos diamet\w*)[^0-9]{0,10}(atual|corrente|presente)[^0-9]{0,10}(\d+(?:[.,]\d+)?)\s*(mm|cm)/gi },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.re.exec(normalized)) !== null) {
      const value = parseNumber(match[3]);
      const unit = match[4];
      if (!Number.isNaN(value)) {
        values[pattern.key] = toMm(value, unit);
      }
    }
  }

  if (values.basal === undefined && values.nadir === undefined && values.atual === undefined) {
    const unlabeledMatch = normalized.match(/(sld|soma dos diamet\w*)[^0-9]{0,10}(\d+(?:[.,]\d+)?)\s*(mm|cm)/i);
    if (unlabeledMatch) {
      const value = parseNumber(unlabeledMatch[2]);
      const unit = unlabeledMatch[3];
      if (!Number.isNaN(value)) {
        values.unlabeled = toMm(value, unit);
      }
    }
  }

  return values;
}

function buildOncologicComparison(priorText: string, currentText: string): string | undefined {
  const combined = normalizeForSearch(`${priorText}\n${currentText}`);
  const criteriaMatch = combined.match(/\b(recist|mrecist|irecist|choi|lugano)\b/i);
  const criteriaLabel = criteriaMatch ? criteriaMatch[1].toUpperCase() : 'SLD';

  const prior = extractSldValues(priorText);
  const current = extractSldValues(currentText);

  const basal = current.basal ?? prior.basal;
  const nadir = current.nadir ?? prior.nadir;
  const atual = current.atual ?? current.unlabeled ?? prior.atual;

  if (basal !== undefined && nadir !== undefined && atual !== undefined) {
    const variation = ((atual - nadir) / nadir) * 100;
    return `Comparação quantitativa (${criteriaLabel}): SLD Basal ${formatNumber(basal, 'mm')}; SLD Nadir ${formatNumber(nadir, 'mm')}; SLD Atual ${formatNumber(atual, 'mm')}; Variação percentual (Atual vs Nadir): ${formatPercent(variation)}`;
  }

  if (basal !== undefined && atual !== undefined) {
    const variation = ((atual - basal) / basal) * 100;
    return `Comparação quantitativa (${criteriaLabel}): SLD Basal ${formatNumber(basal, 'mm')}; SLD Atual ${formatNumber(atual, 'mm')}; Variação percentual (Atual vs Basal): ${formatPercent(variation)}`;
  }

  if (prior.unlabeled !== undefined && current.unlabeled !== undefined) {
    const variation = ((current.unlabeled - prior.unlabeled) / prior.unlabeled) * 100;
    return `Comparação quantitativa (${criteriaLabel}): SLD no exame anterior ${formatNumber(prior.unlabeled, 'mm')}; SLD Atual ${formatNumber(current.unlabeled, 'mm')}; Variação percentual: ${formatPercent(variation)}`;
  }

  return undefined;
}

function extractExplicitComparativeStatements(text: string): string[] {
  const normalized = normalizeForSearch(text);
  const keywords = [
    'estavel', 'estabilidade', 'aumento', 'aumentou', 'aumentada', 'aumentado',
    'reducao', 'reduziu', 'reduzida', 'reduzido', 'diminuiu', 'diminuicao',
    'melhora', 'piora', 'progressao', 'regressao', 'resolucao', 'involucao',
    'em relacao ao exame', 'em relacao ao estudo', 'em comparacao ao exame',
    'em comparacao ao estudo', 'comparado', 'comparacao', 'evolucao',
  ];

  const sentences = text
    .replace(/\r/g, '')
    .split(/[\n]+|[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: string[] = [];
  sentences.forEach((sentence, index) => {
    const normalizedSentence = normalizeForSearch(sentence);
    const hasKeyword = keywords.some((k) => normalizedSentence.includes(k));
    if (hasKeyword) {
      results.push(ensurePeriod(sentence));
      return;
    }
    if (index === 0 && /comparad|relacao|evoluc/i.test(normalizedSentence)) {
      results.push(ensurePeriod(sentence));
    }
  });

  return Array.from(new Set(results));
}

function joinSentences(sentences: string[]): string {
  return sentences.map(ensurePeriod).filter(Boolean).join(' ');
}

type PriorReportInfo = {
  text: string;
  date?: string;
  modality?: string;
  sameService: boolean;
  imagesAvailable: boolean;
  imagesLimited: boolean;
  institution?: string;
};

function detectPriorModality(text: string): string | undefined {
  const normalized = normalizeForSearch(text);
  if (/ultrassonografia|usg/.test(normalized)) return 'USG';
  if (/ressonancia|\brm\b/.test(normalized)) return 'RM';
  if (/tomografia|\btc\b|urotomografia/.test(normalized)) return 'TC';
  if (/radiografia|\brx\b/.test(normalized)) return 'RX';
  return undefined;
}

function isSameServiceSabin(text: string): boolean {
  const normalized = normalizeForSearch(text);
  if (normalized.includes('interno_sabin') || normalized.includes('interno sabin')) {
    return true;
  }
  return /(sabin|sabim|sabyn)/i.test(normalized);
}

function detectImagesLimited(text: string): boolean {
  const normalized = normalizeForSearch(text);
  return /filme|impresso|radiografico|qualidade limitada/.test(normalized);
}

function detectImagesAvailable(text: string): boolean {
  const normalized = normalizeForSearch(text);
  return /imagens? (foram )?disponibilizadas|imagens? disponiveis|imagens? fornecidas/.test(normalized);
}

function splitPriorReportEntries(text: string): string[] {
  const matches = Array.from(text.matchAll(/##\s*LAUDO PR[ÉE]VIO[^\n]*\n/gi));
  if (matches.length === 0) {
    return text.trim() ? [text] : [];
  }
  const entries: string[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    entries.push(text.slice(start, end).trim());
  }
  return entries.filter(Boolean);
}

function parseDateValue(date?: string): number {
  if (!date) return -Infinity;
  const match = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return -Infinity;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return -Infinity;
  return new Date(Date.UTC(year, month - 1, day)).getTime();
}

export function extractMostRecentPriorReport(text: string): PriorReportInfo | undefined {
  const entries = splitPriorReportEntries(text);
  if (entries.length === 0) return undefined;

  const parsed = entries.map((entry) => {
    const date = extractMostRecentDate(entry);
    const sameService = isSameServiceSabin(entry);
    const imagesLimited = detectImagesLimited(entry);
    const imagesAvailable = sameService || detectImagesAvailable(entry);
    const institutionMatch =
      entry.match(/Unidade:\s*([^\n]+)/i)
      || entry.match(/Institui[cç][aã]o:\s*([^\n]+)/i)
      || entry.match(/Local\/Servi[cç]o:\s*([^\n]+)/i);
    const institution = sameService
      ? 'SABIN MEDICINA DIAGNÓSTICA'
      : institutionMatch?.[1]?.trim();
    return {
      text: entry,
      date,
      modality: detectPriorModality(entry),
      sameService,
      imagesAvailable,
      imagesLimited,
      institution,
    } satisfies PriorReportInfo;
  });

  parsed.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  return parsed[0];
}

type ComparisonContext = {
  mode: string;
  priorDate?: string;
  priorModality?: string;
  currentModality?: string;
  institution?: string;
  imagesAvailable: boolean;
  imagesLimited: boolean;
  sameService: boolean;
};

export function buildComparisonContext(
  priorInfo: PriorReportInfo | undefined,
  currentModality?: string
): ComparisonContext {
  if (!priorInfo) {
    return {
      mode: 'none',
      imagesAvailable: false,
      imagesLimited: false,
      sameService: false,
    };
  }

  let mode = 'external_report_only';
  if (priorInfo.imagesLimited) {
    mode = 'external_images_limited';
  } else if (priorInfo.imagesAvailable && priorInfo.sameService) {
    mode = 'same_service_images';
  } else if (priorInfo.imagesAvailable) {
    mode = 'other';
  }

  return {
    mode,
    priorDate: priorInfo.date,
    priorModality: priorInfo.modality,
    currentModality,
    institution: priorInfo.institution,
    imagesAvailable: priorInfo.imagesAvailable,
    imagesLimited: priorInfo.imagesLimited,
    sameService: priorInfo.sameService,
  };
}

function buildComparisonFindings(priorText: string, currentText: string): string[] {
  const findings: string[] = [];

  const lithiasis = buildLithiasisComparison(
    extractLithiasisData(priorText),
    extractLithiasisData(currentText)
  );
  if (lithiasis) findings.push(lithiasis);

  const hydronephrosis = buildBinaryComparison(
    'Hidronefrose',
    extractBinaryFinding(priorText, HYDRONEPHROSIS_RE),
    extractBinaryFinding(currentText, HYDRONEPHROSIS_RE)
  );
  if (hydronephrosis) findings.push(hydronephrosis);

  const cysts = buildBinaryComparison(
    'Cistos renais',
    extractBinaryFinding(priorText, CYST_RE),
    extractBinaryFinding(currentText, CYST_RE)
  );
  if (cysts) findings.push(cysts);

  const wallThickness = buildWallThicknessComparison(priorText, currentText);
  if (wallThickness) findings.push(wallThickness);

  const hyperEnhance = buildBinaryComparison(
    'Hiper-realce parietal',
    extractBinaryFinding(priorText, HYPER_ENHANCE_RE),
    extractBinaryFinding(currentText, HYPER_ENHANCE_RE)
  );
  if (hyperEnhance) findings.push(hyperEnhance);

  const stratified = buildBinaryComparison(
    'Realce estratificado (sinal do alvo)',
    extractBinaryFinding(priorText, STRATIFIED_RE),
    extractBinaryFinding(currentText, STRATIFIED_RE)
  );
  if (stratified) findings.push(stratified);

  const vasaRecta = buildBinaryComparison(
    'Engurgitamento dos vasa recta (sinal do pente)',
    extractBinaryFinding(priorText, VASA_RECTA_RE),
    extractBinaryFinding(currentText, VASA_RECTA_RE)
  );
  if (vasaRecta) findings.push(vasaRecta);

  const mesentericFat = buildBinaryComparison(
    'Densificação da gordura mesenterial',
    extractBinaryFinding(priorText, MESENTERIC_FAT_RE),
    extractBinaryFinding(currentText, MESENTERIC_FAT_RE)
  );
  if (mesentericFat) findings.push(mesentericFat);

  const stenosis = buildStenosisComparison(priorText, currentText);
  if (stenosis) findings.push(stenosis);

  const fistula = buildBinaryComparison(
    'Fístula',
    extractBinaryFinding(priorText, FISTULA_RE),
    extractBinaryFinding(currentText, FISTULA_RE)
  );
  if (fistula) findings.push(fistula);

  const abscess = buildBinaryComparison(
    'Abscesso ou coleção',
    extractBinaryFinding(priorText, ABSCESS_RE),
    extractBinaryFinding(currentText, ABSCESS_RE)
  );
  if (abscess) findings.push(abscess);

  const obstruction = buildBinaryComparison(
    'Obstrução intestinal',
    extractBinaryFinding(priorText, OBSTRUCTION_RE),
    extractBinaryFinding(currentText, OBSTRUCTION_RE)
  );
  if (obstruction) findings.push(obstruction);

  const perforation = buildBinaryComparison(
    'Sinais de perfuração',
    extractBinaryFinding(priorText, PERFORATION_RE),
    extractBinaryFinding(currentText, PERFORATION_RE)
  );
  if (perforation) findings.push(perforation);

  const oncologic = buildOncologicComparison(priorText, currentText);
  if (oncologic) findings.push(oncologic);

  const explicitStatements = extractExplicitComparativeStatements(currentText)
    .filter((sentence) => !/litia|hidronefros|cisto/i.test(normalizeForSearch(sentence)));
  findings.push(...explicitStatements);

  return findings;
}

function describeModality(modality?: string): string | undefined {
  if (!modality) return undefined;
  switch (modality) {
    case 'TC':
      return 'TC';
    case 'RM':
      return 'RM';
    case 'USG':
      return 'USG';
    case 'RX':
      return 'radiografia';
    default:
      return modality;
  }
}

function buildModalityDifferenceNote(priorModality?: string, currentModality?: string): string | undefined {
  if (!priorModality || !currentModality || priorModality === currentModality) return undefined;
  const priorName = describeModality(priorModality) || priorModality;
  const currentName = describeModality(currentModality) || currentModality;
  return `Destaca-se que ${currentName} e ${priorName} são modalidades com princípios físicos e capacidades de caracterização distintas.`;
}

export function buildDeterministicComparisonSummary(
  priorText: string,
  currentText: string,
  context: ComparisonContext
): string {
  if (!priorText.trim()) {
    return 'Não foram disponibilizados exames prévios para comparação.';
  }

  const date = context.priorDate;
  const datePhrase = date ? `de ${date}` : 'com data não informada';
  const priorModality = describeModality(context.priorModality);
  const currentModality = describeModality(context.currentModality);
  const findings = buildComparisonFindings(priorText, currentText);
  const findingsText = joinSentences(findings);
  const lines: string[] = [];

  if (context.mode === 'same_service_images') {
    const institution = context.institution || 'SABIN MEDICINA DIAGNÓSTICA';
    lines.push(
      `Exame comparado com ${priorModality || 'exame'} anterior ${datePhrase}, realizado nesta instituição (${institution}).`
    );
    if (findingsText) {
      lines.push(`Observa-se: ${findingsText}`);
    } else {
      lines.push('Resumo limitado por ausência de dados comparativos objetivos.');
    }
    return lines.join(' ');
  }

  if (context.mode === 'external_images_limited') {
    const institutionPhrase = context.institution ? ` em ${context.institution}` : '';
    lines.push(`Para comparação, foram disponibilizadas imagens impressas e/ou laudo de ${priorModality || 'exame'} ${datePhrase}${institutionPhrase}.`);
    lines.push('A comparação com o estudo anterior foi realizada com base nas imagens fornecidas em formato impresso.');
    const modalityNote = buildModalityDifferenceNote(context.priorModality, context.currentModality);
    if (modalityNote) lines.push(modalityNote);
    lines.push('Ressalta-se que a análise de imagens em filme possui limitações em relação à visualização digital e a precisão das mensurações pode ser inferior.');
    if (findingsText) {
      lines.push(`Com base na análise das imagens fornecidas, ${findingsText}`);
    } else {
      lines.push('Resumo limitado por ausência de dados comparativos objetivos.');
    }
    return lines.join(' ');
  }

  if (context.mode === 'other' && context.priorModality === 'USG' && context.imagesAvailable) {
    lines.push(`Exame comparado com estudo ultrassonográfico ${datePhrase}, cujas imagens e laudo foram disponibilizados.`);
    const modalityNote = buildModalityDifferenceNote(context.priorModality, context.currentModality);
    if (modalityNote) lines.push(modalityNote);
    if (findingsText) {
      lines.push(`No presente estudo, observa-se: ${findingsText}`);
    } else {
      lines.push('Resumo limitado por ausência de dados comparativos objetivos.');
    }
    lines.push('A comparação direta e a avaliação evolutiva precisa são inerentemente limitadas pelas diferenças entre as modalidades.');
    return lines.join(' ');
  }

  const institutionPhrase = context.institution ? ` em ${context.institution}` : '';
  lines.push(`Para comparação, foi disponibilizado o laudo de ${priorModality || 'exame'} ${datePhrase}${institutionPhrase}. As imagens do referido exame não foram fornecidas para análise direta.`);
  lines.push(`A avaliação comparativa com o estudo anterior ${datePhrase} é baseada exclusivamente na descrição contida em seu respectivo laudo.`);
  const modalityNote = buildModalityDifferenceNote(context.priorModality, context.currentModality);
  if (modalityNote) lines.push(modalityNote);
  lines.push('Não foi possível realizar uma revisão direta das imagens do exame anterior para confirmação de achados, mensurações ou avaliação de aspectos técnicos que possam influenciar a comparação.');
  if (findingsText) {
    lines.push(`Com base nas descrições dos laudos, ${findingsText} Ressalta-se que esta inferência é indireta e limitada.`);
  } else {
    lines.push('Resumo limitado por ausência de dados comparativos objetivos.');
  }
  lines.push('A ausência das imagens anteriores impede a análise comparativa de eventuais diferenças sutis e a correlação precisa de achados múltiplos ou complexos. A responsabilidade pela interpretação do exame anterior recai sobre o profissional que o laudou originalmente.');

  return lines.join(' ');
}

import fs from 'node:fs';
import path from 'node:path';
import type { ReportJSON } from '../../types/report-json';
import {
  getDictionaryIndex,
  lookupDictionaryEntry,
  type DictionaryEntry,
  type DictionaryIndex,
} from './agents/dictionary';

export type VocabularyGateNeedReview = {
  term_en: string;
  field: string;
  case_id: string;
  timestamp: string;
};

export type VocabularyGateDiagnostics = {
  enabled: boolean;
  replacements: number;
  needs_review_hits: VocabularyGateNeedReview[];
};

export type VocabularyGateOptions = {
  enable?: boolean;
  dictionary?: DictionaryIndex;
  logPath?: string | null;
  caseId?: string;
  now?: () => Date;
  record?: (entry: VocabularyGateNeedReview) => void;
  fields?: {
    findings?: boolean;
    impression_primary_diagnosis?: boolean;
    impression_recommendations?: boolean;
    impression_differentials?: boolean;
    impression_indication_relation?: boolean;
    impression_incidental_findings?: boolean;
    impression_adverse_events?: boolean;
    impression_criteria_assessment?: boolean;
    comparison_summary?: boolean;
  };
};

const DEFAULT_LOG_PATH = path.resolve(process.cwd(), 'data', 'vocabulary_gate_needs_review.jsonl');
const WHITESPACE_RE = /(\s+)/;
const DIGIT_RE = /\d/;
const UNIT_TOKENS = new Set([
  'mm', 'cm', 'm', 'km',
  '%',
  'kg', 'g', 'mg',
  'ml', 'l', 'cc',
  'hz', 'khz', 'mhz', 'ghz',
  'kv', 'ma', 'ms', 's',
]);

function isGateEnabled(override?: boolean): boolean {
  if (override !== undefined) return override;
  const raw = process.env.RADON_VOCAB_GATE;
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function splitToken(token: string): { prefix: string; core: string; suffix: string } {
  const prefixMatch = token.match(/^[^\p{L}\p{N}]+/u);
  const suffixMatch = token.match(/[^\p{L}\p{N}]+$/u);
  let core = token;
  let prefix = '';
  let suffix = '';

  if (prefixMatch?.[0]) {
    prefix = prefixMatch[0];
    core = core.slice(prefix.length);
  }
  if (suffixMatch?.[0]) {
    suffix = suffixMatch[0];
    core = core.slice(0, core.length - suffix.length);
  }

  return { prefix, core, suffix };
}

function shouldSkipToken(core: string): boolean {
  if (!core) return true;
  if (DIGIT_RE.test(core)) return true;
  const normalized = core.toLowerCase();
  if (UNIT_TOKENS.has(normalized)) return true;
  return false;
}

function rewriteText(
  text: string,
  field: string,
  dictionary: DictionaryIndex,
  recordNeedsReview: (termEn: string, fieldPath: string) => void
): { text: string; replacements: number; changed: boolean } {
  const parts = text.split(WHITESPACE_RE);
  let replacements = 0;
  let changed = false;
  const rewritten = parts.map((part) => {
    if (!part) return part;
    if (WHITESPACE_RE.test(part)) return part;

    const { prefix, core, suffix } = splitToken(part);
    if (!core || shouldSkipToken(core)) return part;

    const entry = lookupDictionaryEntry(core, dictionary);
    if (!entry) return part;

    let termOut = core;

    if (entry.status === 'ok') {
      const candidate = entry.term_pt?.trim();
      if (candidate && candidate.toLowerCase() !== core.toLowerCase()) {
        termOut = candidate;
      }
    } else if (entry.status === 'needs_review') {
      recordNeedsReview(core, field);
    }

    const rebuilt = `${prefix}${termOut}${suffix}`;
    if (rebuilt !== part) {
      changed = true;
    }
    if (entry.status === 'ok' && termOut !== core) {
      replacements += 1;
    }

    return rebuilt;
  });

  return { text: rewritten.join(''), replacements, changed };
}

function rewriteTextArray(
  values: string[] | undefined,
  fieldPath: string,
  dictionary: DictionaryIndex,
  recordNeedsReview: (termEn: string, fieldPath: string) => void
): { values?: string[]; replacements: number; changed: boolean } {
  if (!Array.isArray(values)) {
    return { values, replacements: 0, changed: false };
  }
  let replacements = 0;
  let changed = false;
  const rewritten = values.map((value, index) => {
    const result = rewriteText(value, `${fieldPath}[${index}]`, dictionary, recordNeedsReview);
    replacements += result.replacements;
    if (result.changed) {
      changed = true;
      return result.text;
    }
    return value;
  });
  return { values: rewritten, replacements, changed };
}

function appendNeedsReviewHits(entries: VocabularyGateNeedReview[], logPath: string): void {
  if (entries.length === 0) return;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const payload = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
    fs.appendFileSync(logPath, payload, 'utf-8');
  } catch (error) {
    console.warn('[VocabularyGate] Failed to write needs_review log:', error);
  }
}

export function applyVocabularyGate(
  report: ReportJSON,
  options: VocabularyGateOptions = {}
): { report: ReportJSON; diagnostics: VocabularyGateDiagnostics } {
  const enabled = isGateEnabled(options.enable);
  const diagnostics: VocabularyGateDiagnostics = {
    enabled,
    replacements: 0,
    needs_review_hits: [],
  };

  if (!enabled) {
    return { report, diagnostics };
  }

  const dictionary = options.dictionary || getDictionaryIndex();
  const now = options.now || (() => new Date());
  const caseId = options.caseId || report.case_id;
  const fields = {
    findings: options.fields?.findings ?? true,
    impression_primary_diagnosis: options.fields?.impression_primary_diagnosis ?? true,
    impression_recommendations: options.fields?.impression_recommendations ?? true,
    impression_differentials: options.fields?.impression_differentials ?? true,
    impression_indication_relation: options.fields?.impression_indication_relation ?? true,
    impression_incidental_findings: options.fields?.impression_incidental_findings ?? true,
    impression_adverse_events: options.fields?.impression_adverse_events ?? true,
    impression_criteria_assessment: options.fields?.impression_criteria_assessment ?? true,
    comparison_summary: options.fields?.comparison_summary ?? true,
  };

  const recordNeedsReview = (termEn: string, fieldPath: string) => {
    const entry: VocabularyGateNeedReview = {
      term_en: termEn,
      field: fieldPath,
      case_id: caseId,
      timestamp: now().toISOString(),
    };
    diagnostics.needs_review_hits.push(entry);
    if (options.record) {
      options.record(entry);
    }
  };

  let updatedReport = report;

  if (fields.findings && report.findings?.length) {
    let findingsChanged = false;
    const updatedFindings = report.findings.map((finding, index) => {
      const result = rewriteText(
        finding.description,
        `findings[${index}].description`,
        dictionary,
        recordNeedsReview
      );
      diagnostics.replacements += result.replacements;
      if (result.changed) {
        findingsChanged = true;
        return { ...finding, description: result.text };
      }
      return finding;
    });

    if (findingsChanged) {
      updatedReport = { ...updatedReport, findings: updatedFindings };
    }
  }

  if (fields.impression_primary_diagnosis && report.impression?.primary_diagnosis) {
    const result = rewriteText(
      report.impression.primary_diagnosis,
      'impression.primary_diagnosis',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          primary_diagnosis: result.text,
        },
      };
    }
  }

  if (fields.impression_recommendations && Array.isArray(report.impression?.recommendations)) {
    let recsChanged = false;
    const updatedRecs = report.impression.recommendations.map((rec, index) => {
      const result = rewriteText(
        rec,
        `impression.recommendations[${index}]`,
        dictionary,
        recordNeedsReview
      );
      diagnostics.replacements += result.replacements;
      if (result.changed) {
        recsChanged = true;
        return result.text;
      }
      return rec;
    });

    if (recsChanged) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          recommendations: updatedRecs,
        },
      };
    }
  }

  if (fields.impression_differentials) {
    const result = rewriteTextArray(
      report.impression?.differentials,
      'impression.differentials',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          differentials: result.values,
        },
      };
    }
  }

  if (fields.impression_indication_relation) {
    const result = rewriteTextArray(
      report.impression?.indication_relation,
      'impression.indication_relation',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          indication_relation: result.values,
        },
      };
    }
  }

  if (fields.impression_incidental_findings) {
    const result = rewriteTextArray(
      report.impression?.incidental_findings,
      'impression.incidental_findings',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          incidental_findings: result.values,
        },
      };
    }
  }

  if (fields.impression_adverse_events) {
    const result = rewriteTextArray(
      report.impression?.adverse_events,
      'impression.adverse_events',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          adverse_events: result.values,
        },
      };
    }
  }

  if (fields.impression_criteria_assessment) {
    const result = rewriteTextArray(
      report.impression?.criteria_assessment,
      'impression.criteria_assessment',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        impression: {
          ...updatedReport.impression,
          criteria_assessment: result.values,
        },
      };
    }
  }

  if (fields.comparison_summary && report.comparison?.summary) {
    const result = rewriteText(
      report.comparison.summary,
      'comparison.summary',
      dictionary,
      recordNeedsReview
    );
    diagnostics.replacements += result.replacements;
    if (result.changed) {
      updatedReport = {
        ...updatedReport,
        comparison: {
          ...updatedReport.comparison,
          summary: result.text,
        },
      };
    }
  }

  const logPath = options.logPath === undefined
    ? (process.env.RADON_VOCAB_GATE_LOG_PATH ?? DEFAULT_LOG_PATH)
    : options.logPath;
  if (logPath) {
    appendNeedsReviewHits(diagnostics.needs_review_hits, logPath);
  }

  return { report: updatedReport, diagnostics };
}

export type { DictionaryEntry };

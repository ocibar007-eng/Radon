import type { Finding } from '../../types/report-json';

const PROBABILITY_DESCRIPTORS = [
  'compatível',
  'consistente',
  'sugestivo',
  'suspeito',
  'inespecífico',
  'indeterminado',
  'pouco provável',
  'improvável',
  'possibilidade',
  'diferencial',
  'hipótese',
];

const EVIDENCE_STEMS = [
  'neopl', 'tumor', 'carcin', 'cancer', 'metastas',
  'trombo', 'emboli', 'apendic', 'colecist', 'pancreatit',
  'diverticul', 'abscess', 'infart', 'aneurism', 'estenos',
  'obstruc', 'perfura', 'hemorrag', 'nodul', 'massa', 'lesa',
];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasDescriptor(text: string): boolean {
  const normalized = normalizeText(text);
  return PROBABILITY_DESCRIPTORS.some((d) => normalized.includes(normalizeText(d)));
}

function hasEvidenceStem(text: string, stems: string[]): boolean {
  const normalized = normalizeText(text);
  return stems.some((stem) => normalized.includes(stem));
}

function buildFindingsCorpus(findings: Finding[]): string {
  return findings.map((f) => f.description || '').join(' ');
}

function softenStatement(statement: string): string {
  const trimmed = statement.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  if (hasDescriptor(trimmed)) return trimmed;
  return `Possibilidade de ${trimmed} (inespecífico; sem achado objetivo nos achados).`;
}

export function applyImpressionProbabilityGuards(
  findings: Finding[],
  impression: { primary_diagnosis: string; differentials?: string[]; recommendations?: string[] }
): { primary_diagnosis: string; differentials?: string[]; recommendations?: string[] } {
  const corpus = buildFindingsCorpus(findings);
  const corpusHasEvidence = hasEvidenceStem(corpus, EVIDENCE_STEMS);

  let primary = impression.primary_diagnosis || '';
  if (hasEvidenceStem(primary, EVIDENCE_STEMS) && !corpusHasEvidence) {
    primary = softenStatement(primary);
  }

  return {
    ...impression,
    primary_diagnosis: primary,
  };
}

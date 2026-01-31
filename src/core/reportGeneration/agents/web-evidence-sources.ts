/**
 * Web evidence allowlist + source validation
 */

// ============================================================================
// ALLOWLIST DE FONTES (NÃO-VAGABUNDAS)
// ============================================================================

export const PRIMARY_SOURCES = {
  // Sociedades / Guidelines (prioridade máxima)
  acr: ['acr.org', 'acsearch.acr.org'],
  rsna: ['rsna.org', 'pubs.rsna.org', 'radiology.rsna.org'],
  sar: ['abdominalradiology.org'],
  cbr: ['cbr.org.br'],
  nccn: ['nccn.org'],
  esr: ['esr.org', 'esur.org', 'eusobi.org'],
  bir: ['bir.org.uk'],
  nice: ['nice.org.uk'],
  fleischner: ['fleischner.org'], // quando disponível via journal
  government: ['.gov', '.nhs.uk'],
};

export const JOURNAL_SOURCES = {
  // Journals peer-reviewed (usar com cautela para guidelines)
  ajr: ['ajronline.org'],
  jacr: ['jacr.org', 'sciencedirect.com/journal/journal-of-the-american-college-of-radiology'],
  pubmed: ['pubmed.ncbi.nlm.nih.gov'],
  nejm: ['nejm.org'],
  bmj: ['bmj.com', 'thorax.bmj.com'],
};

export const SECONDARY_SOURCES = {
  // Secundários (somente background; não pode ser única fonte de números)
  radiopaedia: ['radiopaedia.org'],
  radiologyassistant: ['radiologyassistant.nl'],
};

export const BLOCKLIST = [
  'blog',
  'forum',
  'reddit',
  'quora',
  'healthline',
  'webmd',
  'medlineplus',
  'mayoclinic.org', // não é fonte primária para guidelines radiológicos
];

// ============================================================================
// SOURCE VALIDATION
// ============================================================================

export function isSourceAllowed(url: string): 'primary' | 'journal' | 'secondary' | 'blocked' {
  const lowerUrl = url.toLowerCase();

  // Check blocklist first
  if (BLOCKLIST.some(blocked => lowerUrl.includes(blocked))) {
    return 'blocked';
  }

  // Check primary sources
  for (const domains of Object.values(PRIMARY_SOURCES)) {
    if (domains.some(domain => lowerUrl.includes(domain))) {
      return 'primary';
    }
  }

  // Check journal sources
  for (const domains of Object.values(JOURNAL_SOURCES)) {
    if (domains.some(domain => lowerUrl.includes(domain))) {
      return 'journal';
    }
  }

  // Check secondary sources
  for (const domains of Object.values(SECONDARY_SOURCES)) {
    if (domains.some(domain => lowerUrl.includes(domain))) {
      return 'secondary';
    }
  }

  return 'blocked';
}

export function getAllowlistDomains(): string[] {
  const domains = [
    ...Object.values(PRIMARY_SOURCES).flat(),
    ...Object.values(JOURNAL_SOURCES).flat(),
    ...Object.values(SECONDARY_SOURCES).flat(),
  ];

  return Array.from(new Set(domains));
}

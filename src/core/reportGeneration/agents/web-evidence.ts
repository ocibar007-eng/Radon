/**
 * Web Evidence Agent
 *
 * Busca evidências externas quando a biblioteca interna falha.
 * NUNCA injeta no laudo - apenas gera consult_assist e library_ingestion_candidates.
 *
 * REGRA FUNDAMENTAL:
 * - Evidência web → SOMENTE para consult_assist e curadoria
 * - NUNCA números sem fonte explícita
 * - Allowlist forte de fontes permitidas
 */

import type { ConsultAssistEntry, ConsultAssistSource, LibraryIngestionCandidate } from '../../../types/report-json';

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
// TYPES
// ============================================================================

export interface WebSearchParams {
  finding_type: string;
  finding_description: string;
  size_mm?: number;
  morphology?: string;
  patient_age?: number;
  risk_category?: string;
}

export interface WebEvidenceResult {
  consult_assist?: ConsultAssistEntry;
  library_candidate?: LibraryIngestionCandidate;
}

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

// ============================================================================
// WEB SEARCH (PLACEHOLDER - integrar com WebSearch real)
// ============================================================================

export async function searchWebEvidence(
  params: WebSearchParams
): Promise<WebEvidenceResult | null> {

  console.log(`   🌐 [WebEvidence] Searching for: ${params.finding_type}`);

  // FEATURE FLAG CHECK
  if (!process.env.RADON_WEB_EVIDENCE) {
    console.log(`   ⏭️  [WebEvidence] Disabled (RADON_WEB_EVIDENCE not set)`);
    return null;
  }

  try {
    // Build search query
    const query = buildSearchQuery(params);

    // TODO: Integrar com WebSearch tool real do Claude
    // Por enquanto, retornar placeholder para estrutura
    console.log(`   🔍 [WebEvidence] Query: "${query}"`);
    console.log(`   ⚠️  [WebEvidence] Web search not yet integrated - returning null`);

    // Quando integrar, fazer:
    // 1. WebSearch com query
    // 2. Filtrar por allowlist
    // 3. Extrair evidências
    // 4. Validar números (só incluir se explícitos na fonte)
    // 5. Gerar consult_assist e/ou library_candidate

    return null;
  } catch (error) {
    console.error(`   ❌ [WebEvidence] Search error:`, error);
    return null;
  }
}

function buildSearchQuery(params: WebSearchParams): string {
  const parts: string[] = [];

  // Finding type
  parts.push(params.finding_type.replace('_', ' '));

  // Add morphology if present
  if (params.morphology) {
    parts.push(params.morphology);
  }

  // Add "guideline" or "management" keywords
  parts.push('guideline OR management OR follow-up');

  // Add size bracket if present (helps find relevant guidelines)
  if (params.size_mm !== undefined) {
    if (params.size_mm <= 4) parts.push('small');
    else if (params.size_mm <= 8) parts.push('medium');
    else parts.push('large');
  }

  // Prefer recent (2026)
  parts.push('2024 OR 2025 OR 2026');

  return parts.join(' ');
}

// ============================================================================
// EVIDENCE EXTRACTION (PLACEHOLDER)
// ============================================================================

/**
 * Extrai evidências de resultado de busca web
 *
 * REGRAS CRÍTICAS:
 * - Números só aparecem se estiverem EXPLÍCITOS na fonte
 * - Cada número deve ter citação junto
 * - Se só fonte secundária: não incluir números
 */
export function extractEvidenceFromWebResult(
  searchResult: any,
  params: WebSearchParams
): WebEvidenceResult | null {

  // TODO: Implementar extração real quando integrar WebSearch

  // Estrutura esperada:
  // 1. Validar URL com isSourceAllowed()
  // 2. Se blocked: rejeitar
  // 3. Se secondary e único: não incluir números, apenas resumo qualitativo
  // 4. Se primary/journal: pode incluir números SE estiverem no texto
  // 5. Gerar consult_assist com:
  //    - summary (2-5 linhas)
  //    - suggested_actions (bullets curtos, números com citação)
  //    - sources (completo: org, title, year, url, doi, accessed_at)
  //    - conflicts_or_caveats
  // 6. Gerar library_candidate com:
  //    - candidate_recommendation_text (neutro, curto)
  //    - applicability_rules (requires, brackets)
  //    - citations
  //    - review_required: true

  return null;
}

// ============================================================================
// MANUAL EVIDENCE CREATION (para casos conhecidos)
// ============================================================================

/**
 * Cria evidências manualmente para casos bem conhecidos (ex.: Fleischner para nódulos)
 * Isso serve como fallback seguro quando web search falha
 */
export function getKnownEvidenceForFindingType(
  finding_type: string,
  size_mm?: number
): ConsultAssistEntry | null {

  // Fleischner 2017 para nódulos pulmonares
  if (finding_type === 'pulmonary_nodule' || finding_type === 'pulmonary_nodule_solid') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'Diretrizes Fleischner para nódulos pulmonares',
      summary: 'A Fleischner Society publicou diretrizes para manejo de nódulos pulmonares incidentais. As recomendações variam conforme tamanho, morfologia e risco do paciente.',
      suggested_actions: [
        'Consultar tabela completa da Fleischner Society 2017 para intervalo de seguimento específico',
        'Considerar perfil de risco do paciente (baixo vs alto risco)',
        'Avaliar morfologia (sólido vs subsólido) para protocolo adequado'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'Fleischner Society',
        title: 'Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images',
        year: '2017',
        url: 'https://pubs.rsna.org/doi/10.1148/radiol.2017161659',
        doi: '10.1148/radiol.2017161659',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Diretrizes aplicam-se a nódulos INCIDENTAIS (não em screening ou contexto oncológico)',
        'Atualização de 2017 substitui versão anterior de 2005'
      ],
      numeric_safety: {
        numbers_included: false,
        rule: 'Números específicos omitidos. Médico deve consultar tabela original da Fleischner para valores exatos.'
      }
    };
  }

  // Bosniak para cistos renais
  if (finding_type === 'renal_cyst') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'Classificação de Bosniak para cistos renais',
      summary: 'A classificação de Bosniak estratifica cistos renais quanto ao risco de malignidade. Versão 2019 atualizada incorpora achados de RM.',
      suggested_actions: [
        'Aplicar critérios de Bosniak v2019 para classificação',
        'Bosniak I e II: benignos, sem seguimento necessário',
        'Bosniak IIF: seguimento recomendado',
        'Bosniak III e IV: considerar intervenção cirúrgica'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'Radiology (RSNA)',
        title: 'Bosniak Classification of Cystic Renal Masses, Version 2019',
        year: '2019',
        url: 'https://pubs.rsna.org/doi/10.1148/radiol.2019182646',
        doi: '10.1148/radiol.2019182646',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Versão 2019 substitui classificação original',
        'Critérios específicos diferem entre TC e RM'
      ],
      numeric_safety: {
        numbers_included: false,
        rule: 'Classificação categórica (I-IV) sem números de seguimento incluídos. Consultar artigo original para intervalos.'
      }
    };
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  searchWebEvidence,
  extractEvidenceFromWebResult,
  getKnownEvidenceForFindingType,
  isSourceAllowed
};

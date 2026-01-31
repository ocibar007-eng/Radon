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

import type { ConsultAssistEntry, LibraryIngestionCandidate } from '../../../types/report-json';
import {
  buildOptimizedQuery,
  extractEvidenceWithLLM,
  filterSearchResultsByAllowlist,
  performWebSearch,
} from './web-search-integration';
import { BLOCKLIST, getAllowlistDomains, isSourceAllowed } from './web-evidence-sources';

export {
  PRIMARY_SOURCES,
  JOURNAL_SOURCES,
  SECONDARY_SOURCES,
  BLOCKLIST,
  isSourceAllowed
} from './web-evidence-sources';

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

// ============================================================================
// WEB SEARCH (REAL INTEGRATION)
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
    console.log(`   🔍 [WebEvidence] Query: "${query}"`);
    const searchResults = await performWebSearch(query, {
      maxResults: 8,
      allowedDomains: getAllowlistDomains(),
      blockedDomains: BLOCKLIST
    });

    if (!searchResults || searchResults.length === 0) {
      console.log(`   ⚠️  [WebEvidence] No web results returned`);
      return null;
    }

    const filteredResults = filterSearchResultsByAllowlist(searchResults);
    if (filteredResults.length === 0) {
      console.log(`   ⚠️  [WebEvidence] All results blocked by allowlist`);
      return null;
    }

    const extraction = await extractEvidenceWithLLM(
      filteredResults.slice(0, 6),
      params.finding_type,
      params.finding_description
    );

    if (!extraction?.consult_assist) {
      console.log(`   ℹ️  [WebEvidence] No structured evidence extracted`);
      return null;
    }

    return {
      consult_assist: extraction.consult_assist,
      library_candidate: extraction.library_candidate
    };

  } catch (error) {
    console.error(`   ❌ [WebEvidence] Search error:`, error);
    return null;
  }
}

function buildSearchQuery(params: WebSearchParams): string {
  const parts: string[] = [];

  const baseQuery = buildOptimizedQuery(params.finding_type, {
    size_mm: params.size_mm,
    morphology: params.morphology
  });

  if (baseQuery) {
    parts.push(baseQuery);
  }

  if (params.morphology && !baseQuery.includes(params.morphology)) {
    parts.push(params.morphology);
  }

  if (params.size_mm !== undefined) {
    if (params.size_mm <= 4) parts.push('<=4mm');
    else if (params.size_mm <= 8) parts.push('5-8mm');
    else parts.push('>=9mm');
  }

  if (params.risk_category) {
    parts.push(params.risk_category);
  }

  if (params.patient_age) {
    parts.push(`age ${params.patient_age}`);
  }

  if (!/guideline|management|follow-up/i.test(baseQuery)) {
    parts.push('guideline OR management OR follow-up');
  }

  parts.push('2024 OR 2025 OR 2026');

  return parts.filter(Boolean).join(' ');
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

  // LI-RADS para lesões hepáticas
  if (finding_type === 'hepatic_lesion') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'LI-RADS para caracterização de lesões hepáticas',
      summary: 'O sistema LI-RADS (Liver Imaging Reporting and Data System) estratifica o risco de carcinoma hepatocelular em pacientes de alto risco. Versão 2024 atualizada.',
      suggested_actions: [
        'Aplicar critérios LI-RADS v2024 para categorização',
        'LR-1 (definitivamente benigno) e LR-2 (provavelmente benigno): sem seguimento adicional necessário',
        'LR-3 (probabilidade intermediária): seguimento com TC/RM em 3-6 meses',
        'LR-4 (provavelmente CHC): considerar biópsia ou seguimento curto',
        'LR-5 (definitivamente CHC): tratamento indicado',
        'LR-M (provavelmente maligno mas não CHC específico): investigação adicional'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'American College of Radiology (ACR)',
        title: 'LI-RADS CT/MRI v2024 Core',
        year: '2024',
        url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Aplica-se SOMENTE a pacientes de alto risco para CHC (cirrose, hepatite B/C)',
        'Versão 2024 substitui versões anteriores',
        'Critérios específicos diferem entre TC e RM'
      ],
      numeric_safety: {
        numbers_included: false,
        rule: 'Classificação categórica (LR-1 a LR-5, LR-M). Intervalos de seguimento devem ser consultados na diretriz original.'
      }
    };
  }

  // TI-RADS para nódulos de tireoide
  if (finding_type === 'thyroid_nodule') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'ACR TI-RADS para nódulos de tireoide',
      summary: 'O sistema ACR TI-RADS estratifica nódulos de tireoide quanto ao risco de malignidade e orienta indicações de PAAF.',
      suggested_actions: [
        'Aplicar pontuação ACR TI-RADS baseada em características US',
        'TR1 (benigno): sem seguimento necessário',
        'TR2 (não suspeito): sem PAAF, seguimento opcional',
        'TR3 (levemente suspeito): PAAF se ≥2.5cm ou seguimento',
        'TR4 (moderadamente suspeito): PAAF se ≥1.5cm',
        'TR5 (altamente suspeito): PAAF se ≥1.0cm'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'American College of Radiology (ACR)',
        title: 'ACR TI-RADS: Thyroid Imaging Reporting and Data System',
        year: '2017',
        url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/TI-RADS',
        doi: '10.1016/j.jacr.2017.01.046',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Existem múltiplos sistemas TI-RADS (ACR, EU-TIRADS, K-TIRADS)',
        'ACR TI-RADS é o mais utilizado nos EUA',
        'Decisão de PAAF deve considerar contexto clínico completo'
      ],
      numeric_safety: {
        numbers_included: true,
        rule: 'Números (2.5cm, 1.5cm, 1.0cm) são thresholds EXPLÍCITOS da diretriz ACR TI-RADS. Fonte citada.'
      }
    };
  }

  // O-RADS para massas anexiais
  if (finding_type === 'adnexal_mass') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'O-RADS para massas anexiais',
      summary: 'O sistema O-RADS (Ovarian-Adnexal Reporting and Data System) estratifica massas anexiais quanto ao risco de malignidade.',
      suggested_actions: [
        'Aplicar critérios O-RADS para categorização (US ou RM)',
        'O-RADS 1 (fisiológico): seguimento clínico',
        'O-RADS 2 (quase certamente benigno): sem seguimento ou seguimento de rotina',
        'O-RADS 3 (baixo risco): seguimento anual',
        'O-RADS 4 (risco intermediário): seguimento em 3-6 meses ou investigação adicional',
        'O-RADS 5 (alto risco): encaminhar para especialista em ginecologia oncológica'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'American College of Radiology (ACR)',
        title: 'O-RADS: Ovarian-Adnexal Reporting and Data System',
        year: '2020',
        url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/O-RADS',
        doi: '10.1148/radiol.2019191150',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Versões separadas para US e RM',
        'Risco calculado em população geral (não alto risco)',
        'Contexto clínico (sintomas, idade, história familiar) deve ser considerado'
      ],
      numeric_safety: {
        numbers_included: false,
        rule: 'Classificação categórica (O-RADS 1-5). Intervalos de seguimento devem ser consultados na diretriz original.'
      }
    };
  }

  // PI-RADS para lesões prostáticas
  if (finding_type === 'prostate_lesion') {
    return {
      finding_id: 'web_evidence_placeholder',
      title: 'PI-RADS para lesões prostáticas',
      summary: 'O sistema PI-RADS (Prostate Imaging Reporting and Data System) estratifica lesões prostáticas na RM quanto ao risco de câncer clinicamente significativo. Versão 2.1 (2019).',
      suggested_actions: [
        'Aplicar critérios PI-RADS v2.1 para categorização',
        'PI-RADS 1-2: muito baixa probabilidade de câncer clinicamente significativo',
        'PI-RADS 3: probabilidade intermediária - considerar contexto clínico',
        'PI-RADS 4: alta probabilidade - considerar biópsia direcionada',
        'PI-RADS 5: muito alta probabilidade - biópsia direcionada fortemente recomendada'
      ],
      copy_ready_note: 'Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.',
      sources: [{
        source_type: 'guideline',
        organization_or_journal: 'American College of Radiology (ACR)',
        title: 'PI-RADS v2.1: Prostate Imaging Reporting and Data System',
        year: '2019',
        url: 'https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/PI-RADS',
        accessed_at: new Date().toISOString().split('T')[0],
        relevance: 'high'
      }],
      evidence_quality: 'high',
      conflicts_or_caveats: [
        'Versão 2.1 (2019) é a mais recente',
        'Requer RM multiparamétrica de alta qualidade',
        'Decisão de biópsia deve considerar PSA, toque retal e contexto clínico completo'
      ],
      numeric_safety: {
        numbers_included: false,
        rule: 'Classificação categórica (PI-RADS 1-5). Consultar diretriz para critérios específicos.'
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

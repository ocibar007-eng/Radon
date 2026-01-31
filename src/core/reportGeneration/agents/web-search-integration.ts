/**
 * Web Search Integration with LLM-based Evidence Extraction
 *
 * Este módulo fornece integração real com APIs de busca web
 * e extração inteligente de evidências usando LLM.
 *
 * SEGURANÇA:
 * - Somente domínios allowlisted
 * - Validação de números contra fonte original
 * - Qualidade de evidência classificada
 * - Sempre gera consult_assist, nunca vai direto para laudo
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ConsultAssistEntry, LibraryIngestionCandidate } from '../../../types/report-json';
import { isSourceAllowed } from './web-evidence-sources';

// ============================================================================
// TYPES
// ============================================================================

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface EvidenceExtractionResult {
  consult_assist?: ConsultAssistEntry;
  library_candidate?: LibraryIngestionCandidate;
  confidence: 'high' | 'moderate' | 'low';
}

type SearchProvider = 'serpapi' | 'bing' | 'google_cse' | 'brave';

const ALLOWED_SOURCE_TYPES = new Set(['guideline', 'journal', 'society', 'government', 'secondary']);

function resolveSearchProvider(): {
  provider: SearchProvider;
  apiKey: string;
  endpoint?: string;
  cx?: string;
} | null {
  const explicit = (process.env.SEARCH_API_PROVIDER || '').toLowerCase().trim();
  const sharedKey = process.env.SEARCH_API_KEY || '';
  const serpKey = process.env.SERPAPI_API_KEY || '';
  const bingKey = process.env.BING_SEARCH_KEY || '';
  const googleKey = process.env.GOOGLE_CSE_API_KEY || '';
  const braveKey = process.env.BRAVE_SEARCH_API_KEY || '';
  const googleCx = process.env.GOOGLE_CSE_CX || '';

  const fromExplicit = (provider: SearchProvider) => {
    const apiKey = (provider === 'serpapi' ? serpKey
      : provider === 'bing' ? bingKey
      : provider === 'google_cse' ? googleKey
      : provider === 'brave' ? braveKey
      : '') || sharedKey;

    switch (provider) {
      case 'serpapi':
        return apiKey ? { provider, apiKey, endpoint: process.env.SERPAPI_ENDPOINT } : null;
      case 'bing':
        return apiKey ? { provider, apiKey, endpoint: process.env.BING_SEARCH_ENDPOINT } : null;
      case 'google_cse': {
        if (!apiKey || !googleCx) return null;
        return { provider, apiKey, endpoint: process.env.GOOGLE_CSE_ENDPOINT, cx: googleCx };
      }
      case 'brave':
        return apiKey ? { provider, apiKey, endpoint: process.env.BRAVE_SEARCH_ENDPOINT } : null;
      default:
        return null;
    }
  };

  if (explicit) {
    const normalized = explicit === 'google' ? 'google_cse' : (explicit as SearchProvider);
    return fromExplicit(normalized);
  }

  if (googleCx && (googleKey || sharedKey)) {
    return {
      provider: 'google_cse',
      apiKey: googleKey || sharedKey,
      endpoint: process.env.GOOGLE_CSE_ENDPOINT,
      cx: googleCx
    };
  }
  if (serpKey) return { provider: 'serpapi', apiKey: serpKey, endpoint: process.env.SERPAPI_ENDPOINT };
  if (bingKey) return { provider: 'bing', apiKey: bingKey, endpoint: process.env.BING_SEARCH_ENDPOINT };
  if (braveKey) return { provider: 'brave', apiKey: braveKey, endpoint: process.env.BRAVE_SEARCH_ENDPOINT };

  return null;
}

function applyDomainFilters(
  results: WebSearchResult[],
  allowedDomains: string[],
  blockedDomains: string[]
): WebSearchResult[] {
  const allowed = allowedDomains.map(domain => domain.toLowerCase());
  const blocked = blockedDomains.map(domain => domain.toLowerCase());

  return results.filter(result => {
    const url = result.url.toLowerCase();

    if (blocked.some(domain => url.includes(domain))) {
      return false;
    }

    if (allowed.length === 0) return true;

    return allowed.some(domain => url.includes(domain));
  });
}

function normalizeEvidenceQuality(value: unknown): 'high' | 'moderate' | 'low' {
  if (value === 'high' || value === 'moderate' || value === 'low') return value;
  if (value === 'medium') return 'moderate';
  return 'low';
}

function normalizeRelevance(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  if (value === 'moderate') return 'medium';
  return 'medium';
}

function normalizeSourceType(value: unknown, url: string): 'guideline' | 'journal' | 'society' | 'government' | 'secondary' {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (ALLOWED_SOURCE_TYPES.has(normalized)) {
    return normalized as 'guideline' | 'journal' | 'society' | 'government' | 'secondary';
  }

  if (url.includes('.gov') || url.includes('.nhs.uk')) {
    return 'government';
  }

  const sourceType = isSourceAllowed(url);
  if (sourceType === 'journal') return 'journal';
  if (sourceType === 'secondary') return 'secondary';
  return 'guideline';
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

// ============================================================================
// WEB SEARCH API INTEGRATION
// ============================================================================

/**
 * Busca web usando API externa (ex: SerpAPI, Bing, etc.)
 *
 * IMPORTANTE: Esta função é um wrapper que pode ser configurado
 * para diferentes providers de busca.
 */
export async function performWebSearch(
  query: string,
  options: {
    maxResults?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  } = {}
): Promise<WebSearchResult[]> {

  const {
    maxResults = 10,
    allowedDomains = [],
    blockedDomains = []
  } = options;

  if (typeof fetch === 'undefined') {
    console.log(`   ⚠️  [WebSearch] fetch not available in this runtime`);
    return [];
  }

  const providerConfig = resolveSearchProvider();
  if (!providerConfig) {
    console.log(`   ⚠️  [WebSearch] Search provider not configured`);
    console.log(`   💡 [WebSearch] Configure SEARCH_API_PROVIDER + API key env vars`);
    return [];
  }

  const { provider, apiKey, endpoint, cx } = providerConfig;
  let results: WebSearchResult[] = [];

  try {
    switch (provider) {
      case 'serpapi': {
        const url = new URL(endpoint || 'https://serpapi.com/search.json');
        url.searchParams.set('engine', 'google');
        url.searchParams.set('q', query);
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('num', String(maxResults));

        const response = await fetch(url.toString());
        if (!response.ok) {
          console.log(`   ⚠️  [WebSearch] SerpAPI error: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
        results = organic.map((item: any) => ({
          title: item.title || 'Untitled',
          url: item.link || '',
          snippet: item.snippet || (Array.isArray(item.snippet_highlighted_words) ? item.snippet_highlighted_words.join(' ') : ''),
          content: item.rich_snippet || ''
        }));
        break;
      }
      case 'bing': {
        const url = new URL(endpoint || 'https://api.bing.microsoft.com/v7.0/search');
        url.searchParams.set('q', query);
        url.searchParams.set('count', String(maxResults));

        const response = await fetch(url.toString(), {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        });
        if (!response.ok) {
          console.log(`   ⚠️  [WebSearch] Bing error: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const webPages = data.webPages?.value || [];
        results = webPages.map((item: any) => ({
          title: item.name || 'Untitled',
          url: item.url || '',
          snippet: item.snippet || '',
          content: item.snippet || ''
        }));
        break;
      }
      case 'google_cse': {
        const url = new URL(endpoint || 'https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('q', query);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', cx || '');
        url.searchParams.set('num', String(Math.min(maxResults, 10)));

        const response = await fetch(url.toString());
        if (!response.ok) {
          console.log(`   ⚠️  [WebSearch] Google CSE error: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const items = data.items || [];
        results = items.map((item: any) => ({
          title: item.title || 'Untitled',
          url: item.link || '',
          snippet: item.snippet || '',
          content: item.snippet || ''
        }));
        break;
      }
      case 'brave': {
        const url = new URL(endpoint || 'https://api.search.brave.com/res/v1/web/search');
        url.searchParams.set('q', query);
        url.searchParams.set('count', String(Math.min(maxResults, 20)));

        const response = await fetch(url.toString(), {
          headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' }
        });
        if (!response.ok) {
          console.log(`   ⚠️  [WebSearch] Brave error: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const items = data.web?.results || [];
        results = items.map((item: any) => ({
          title: item.title || 'Untitled',
          url: item.url || '',
          snippet: item.description || '',
          content: item.description || ''
        }));
        break;
      }
      default:
        return [];
    }
  } catch (error) {
    console.log(`   ❌ [WebSearch] Provider error:`, error);
    return [];
  }

  const cleaned = results
    .map(result => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      snippet: result.snippet || '',
      content: result.content
    }))
    .filter(result => result.url);

  const filtered = applyDomainFilters(cleaned, allowedDomains, blockedDomains);
  console.log(`   ✅ [WebSearch] Results: ${filtered.length}/${cleaned.length}`);

  return filtered;
}

// ============================================================================
// LLM-BASED EVIDENCE EXTRACTION
// ============================================================================

/**
 * Extrai evidências estruturadas de resultados de busca usando LLM
 *
 * PROMPT ENGINEERING CRÍTICO:
 * - Instrui o LLM a NUNCA inventar números
 * - Exige citação explícita para cada número
 * - Classifica qualidade de evidência
 * - Identifica conflitos entre fontes
 */
export async function extractEvidenceWithLLM(
  searchResults: WebSearchResult[],
  findingType: string,
  findingDescription: string
): Promise<EvidenceExtractionResult | null> {

  if (searchResults.length === 0) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.log(`   ⚠️  [LLM Extraction] API key not configured`);
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construir contexto dos resultados
    const resultsContext = searchResults.map((result, idx) =>
      `[${idx + 1}] ${result.title}\nURL: ${result.url}\nConteúdo: ${result.snippet || result.content || 'N/A'}\n`
    ).join('\n---\n');

    const prompt = `
Você é um assistente médico especializado em radiologia. Analise os resultados de busca abaixo sobre "${findingType}" e extraia evidências para suporte à decisão clínica.

REGRAS CRÍTICAS:
1. NUNCA invente números ou intervalos que não estejam EXPLÍCITOS nos resultados
2. Para cada número citado, você DEVE incluir a fonte exata
3. Se os resultados não contêm informação específica, seja honesto e diga "consultar diretriz original"
4. Classifique a qualidade da evidência: high (guideline oficial), moderate (journal peer-reviewed), low (fonte secundária)
5. Identifique conflitos entre fontes se houver

ACHADO ANALISADO:
- Tipo: ${findingType}
- Descrição: ${findingDescription}

RESULTADOS DE BUSCA:
${resultsContext}

TAREFA:
Retorne um JSON com a seguinte estrutura (use null se não houver evidências suficientes):

{
  "has_evidence": boolean,
  "summary": "string: 2-5 linhas resumindo as evidências encontradas",
  "suggested_actions": ["array de strings: ações sugeridas, COM citação se incluir números"],
  "evidence_quality": "high" | "moderate" | "low",
  "conflicts_or_caveats": ["array de strings: ressalvas importantes"],
  "sources": [
    {
      "source_type": "guideline" | "journal" | "society" | "government" | "secondary",
      "organization_or_journal": "string",
      "title": "string",
      "year": "string",
      "url": "string",
      "doi": "string (opcional)",
      "relevance": "high" | "medium" | "low"
    }
  ],
  "numeric_safety": {
    "numbers_included": boolean,
    "rule": "string: explicação de onde vêm os números ou por que foram omitidos"
  },
  "library_candidate": {
    "should_create": boolean,
    "reason": "string: por que esta evidência deveria ou não entrar na biblioteca",
    "candidate_recommendation_text": "string curta e neutra",
    "requires": ["array de strings: dados necessários (ex: size_mm, risk_category, patient_age)"],
    "size_brackets": ["array de strings: faixas de tamanho se aplicável"],
    "exclusions": ["array de strings: exclusões clínicas se aplicável"]
  }
}

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`   ⚠️  [LLM Extraction] Failed to parse JSON from response`);
      return null;
    }

    const extracted = JSON.parse(jsonMatch[0]);

    if (!extracted || !extracted.has_evidence) {
      return null;
    }

    const summary = typeof extracted.summary === 'string' ? extracted.summary.trim() : '';
    if (!summary) {
      return null;
    }

    const evidenceQuality = normalizeEvidenceQuality(extracted.evidence_quality);
    const today = new Date().toISOString().split('T')[0];

    const sourcesInput = Array.isArray(extracted.sources) ? extracted.sources : [];
    const normalizedSources = sourcesInput
      .map((src: any) => {
        const url = typeof src?.url === 'string' ? src.url.trim() : '';
        if (!url) return null;
        if (isSourceAllowed(url) === 'blocked') return null;

        const org = typeof src.organization_or_journal === 'string' && src.organization_or_journal.trim()
          ? src.organization_or_journal.trim()
          : url.replace(/^https?:\/\//, '').split('/')[0];

        const title = typeof src.title === 'string' && src.title.trim()
          ? src.title.trim()
          : 'Sem título';

        const year = typeof src.year === 'string' && src.year.trim()
          ? src.year.trim()
          : 'unknown';

        const doi = typeof src.doi === 'string' && src.doi.trim() ? src.doi.trim() : undefined;

        return {
          source_type: normalizeSourceType(src.source_type, url),
          organization_or_journal: org,
          title,
          year,
          url,
          doi,
          accessed_at: today,
          relevance: normalizeRelevance(src.relevance)
        };
      })
      .filter(Boolean) as ConsultAssistEntry['sources'];

    if (normalizedSources.length === 0) {
      console.log(`   ⚠️  [LLM Extraction] No valid sources after allowlist`);
      return null;
    }

    const numericSafety = {
      numbers_included: Boolean(extracted.numeric_safety?.numbers_included),
      rule: typeof extracted.numeric_safety?.rule === 'string' && extracted.numeric_safety.rule.trim()
        ? extracted.numeric_safety.rule.trim()
        : 'Números omitidos: consultar diretriz original.'
    };

    const consultAssist: ConsultAssistEntry = {
      finding_id: 'web_search_result',
      title: `Evidências para ${findingType}`,
      summary,
      suggested_actions: normalizeStringArray(extracted.suggested_actions),
      copy_ready_note: 'Conteúdo extraído de busca web. Verificar fontes originais e adaptar ao contexto clínico antes de usar.',
      sources: normalizedSources,
      evidence_quality: evidenceQuality,
      conflicts_or_caveats: normalizeStringArray(extracted.conflicts_or_caveats),
      numeric_safety: numericSafety
    };

    // Construir LibraryIngestionCandidate se recomendado
    let libraryCandidate: LibraryIngestionCandidate | undefined;

    if (extracted.library_candidate?.should_create) {
      const requires = normalizeStringArray(extracted.library_candidate.requires);
      const sizeBrackets = normalizeStringArray(extracted.library_candidate.size_brackets);
      const exclusions = normalizeStringArray(extracted.library_candidate.exclusions);

      libraryCandidate = {
        finding_type: findingType,
        trigger_terms: [findingType, findingDescription].filter(Boolean),
        candidate_recommendation_text: extracted.library_candidate.candidate_recommendation_text || summary,
        applicability_rules: {
          requires,
          ...(sizeBrackets.length > 0 ? { size_brackets: sizeBrackets } : {}),
          ...(exclusions.length > 0 ? { exclusions } : {})
        },
        citations: normalizedSources.map((src) => ({
          organization_or_journal: src.organization_or_journal,
          title: src.title,
          year: src.year,
          url: src.url,
          doi: src.doi,
          accessed_at: src.accessed_at
        })),
        review_required: true,
        confidence_for_ingestion: evidenceQuality === 'high' ? 'high' : evidenceQuality === 'moderate' ? 'medium' : 'low'
      };
    }

    return {
      consult_assist: consultAssist,
      library_candidate: libraryCandidate,
      confidence: evidenceQuality
    };

  } catch (error) {
    console.error(`   ❌ [LLM Extraction] Error:`, error);
    return null;
  }
}

// ============================================================================
// DOMAIN-SPECIFIC SEARCH HELPERS
// ============================================================================

/**
 * Constrói queries otimizadas para diferentes tipos de achados
 */
export function buildOptimizedQuery(
  findingType: string,
  params: {
    size_mm?: number;
    morphology?: string;
    location?: string;
  }
): string {

  const queries: Record<string, string> = {
    pulmonary_nodule: 'fleischner society pulmonary nodule guidelines 2017 management',
    renal_cyst: 'bosniak classification renal cyst 2019 guidelines',
    hepatic_lesion: 'LI-RADS liver lesion hepatocellular carcinoma ACR 2024',
    thyroid_nodule: 'ACR TI-RADS thyroid nodule FNA guidelines 2017',
    adnexal_mass: 'O-RADS ovarian adnexal mass ACR 2020 guidelines',
    prostate_lesion: 'PI-RADS prostate lesion MRI ACR 2019 guidelines',
    breast_lesion: 'BI-RADS breast lesion ACR guidelines mammography ultrasound',
    lung_nodule_screening: 'lung-RADS pulmonary nodule screening ACR guidelines'
  };

  // Use specific query if available
  if (queries[findingType]) {
    return queries[findingType];
  }

  // Generic fallback
  const parts = [
    findingType.replace('_', ' '),
    'radiology guideline',
    'ACR OR RSNA OR Fleischner',
    '2024 OR 2025 OR 2026'
  ];

  if (params.morphology) {
    parts.push(params.morphology);
  }

  if (params.location) {
    parts.push(params.location);
  }

  return parts.join(' ');
}

/**
 * Filtra resultados por domínios permitidos
 */
export function filterSearchResultsByAllowlist(
  results: WebSearchResult[]
): WebSearchResult[] {

  return results.filter(result => {
    const sourceType = isSourceAllowed(result.url);

    if (sourceType === 'blocked') {
      console.log(`   🚫 [Filter] Blocked: ${result.url}`);
      return false;
    }

    if (sourceType === 'secondary') {
      console.log(`   ⚠️  [Filter] Secondary source (low priority): ${result.url}`);
      // Keep secondary sources but mark them
    }

    console.log(`   ✅ [Filter] Allowed (${sourceType}): ${result.url}`);
    return true;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  performWebSearch,
  extractEvidenceWithLLM,
  buildOptimizedQuery,
  filterSearchResultsByAllowlist
};

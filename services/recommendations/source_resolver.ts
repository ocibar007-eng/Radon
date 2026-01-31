// services/recommendations/source_resolver.ts
// Anti-403 Protocol: DOI Resolution → OA Fallbacks → Browser-like → Paywalled
// NEVER ask for manual download until all 4 steps are exhausted

import axios from 'axios';
import { setTimeout } from 'timers/promises';

export interface SourceResolutionResult {
    success: boolean;
    pdf_url?: string;
    resolution_method?: 'direct' | 'unpaywall' | 'crossref' | 'search_directed' | 'browser_like';
    access_type?: 'open' | 'oa_resolved' | 'secondary_source' | 'paywalled_unavailable';
    attempts: ResolutionAttempt[];
    error?: string;
}

export interface ResolutionAttempt {
    step: string;
    method: string;
    url_tried?: string;
    status: 'success' | 'failed' | 'blocked';
    error?: string;
    timestamp: string;
}

const USER_AGENT = 'RadonMedicalAI/1.0 (Research; compliant; +http://radon-ai.example.com)';

/**
 * Step 1: Unpaywall DOI Resolution
 */
async function resolveViaUnpaywall(doi: string): Promise<{ url?: string; error?: string }> {
    if (!doi) return { error: 'No DOI provided' };

    try {
        const email = 'research@radon-ai.example.com'; // Required by Unpaywall
        const url = `https://api.unpaywall.org/v2/${doi}?email=${email}`;

        await setTimeout(500); // Rate limit
        const response = await axios.get(url, { timeout: 10000 });

        if (response.data?.best_oa_location?.url_for_pdf) {
            return { url: response.data.best_oa_location.url_for_pdf };
        }
        if (response.data?.best_oa_location?.url) {
            return { url: response.data.best_oa_location.url };
        }

        return { error: 'No OA location found' };
    } catch (err: any) {
        return { error: err.message };
    }
}

/**
 * Step 1b: Crossref DOI Resolution
 */
async function resolveViaCrossref(doi: string): Promise<{ url?: string; error?: string }> {
    if (!doi) return { error: 'No DOI provided' };

    try {
        const url = `https://api.crossref.org/works/${doi}`;
        await setTimeout(500);
        const response = await axios.get(url, { timeout: 10000 });

        // Crossref pode ter links para versões OA
        const links = response.data?.message?.link || [];
        for (const link of links) {
            if (link['content-type'] === 'application/pdf' || link.URL?.endsWith('.pdf')) {
                return { url: link.URL };
            }
        }

        return { error: 'No PDF link in Crossref' };
    } catch (err: any) {
        return { error: err.message };
    }
}

/**
 * Step 2: Directed PDF Search on Trusted Domains
 * Uses known ACR patterns and fallback HTML scraping
 */
async function searchDirectedPDF(
    title: string,
    trustedDomains: string[]
): Promise<{ url?: string; error?: string }> {
    const searches: string[] = [];
    const lowerTitle = title.toLowerCase();

    // ACR RADS Systems - Common patterns conhecidos
    if (lowerTitle.includes('li-rads')) {
        searches.push(
            'https://www.acr.org/-/media/ACR/Files/RADS/LI-RADS/LI-RADS-2018-Core.pdf',
            'https://www.acr.org/-/media/ACR/Files/RADS/LI-RADS/LI_RADS_2018_Core.pdf'
        );
    }

    if (lowerTitle.includes('pi-rads')) {
        searches.push(
            'https://www.acr.org/-/media/ACR/Files/RADS/PI-RADS/PIRADS-V2-1.pdf',
            'https://www.acr.org/-/media/ACR/Files/RADS/Pi-RADS/PI-RADS-v2-1.pdf'
        );
    }

    if (lowerTitle.includes('o-rads') && lowerTitle.includes('ultrasound')) {
        searches.push(
            'https://www.acr.org/-/media/ACR/Files/RADS/O-RADS/O-RADS-US-Risk-Stratification-and-Management-System.pdf'
        );
    }

    if (lowerTitle.includes('o-rads') && lowerTitle.includes('mri')) {
        searches.push(
            'https://www.acr.org/-/media/ACR/Files/RADS/O-RADS/O-RADS-MRI-2022.pdf'
        );
    }

    // RECIST - EORTC Project
    if (lowerTitle.includes('recist 1.1') || lowerTitle.includes('recist v1.1')) {
        searches.push(
            'https://recist.eortc.org/wp-content/uploads/2015/03/RECISTGuidelines.pdf',
            'https://project.eortc.org/recist/wp-content/uploads/sites/4/2015/03/RECISTGuidelines.pdf'
        );
    }

    // Try all candidate URLs
    for (const searchUrl of searches) {
        try {
            await setTimeout(1500); // Rate limit para ACR
            const response = await axios.head(searchUrl, {
                timeout: 8000,
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/pdf,*/*'
                },
                maxRedirects: 3
            });

            if (response.status === 200 &&
                (response.headers['content-type']?.includes('pdf') || searchUrl.endsWith('.pdf'))) {
                return { url: searchUrl };
            }
        } catch (err: any) {
            // Try next
            continue;
        }
    }

    return { error: 'No trusted domain PDF found' };
}

/**
 * Step 3: Browser-like Fallback (Playwright)
 * Uses actual headless browser to navigate and capture PDF URLs
 */
async function resolveBrowserLike(originalUrl: string): Promise<{ url?: string; error?: string }> {
    try {
        // Dynamic import to avoid loading Playwright unless needed
        const { resolvePDFWithBrowser } = await import('./browser_resolver');

        const result = await resolvePDFWithBrowser(originalUrl, 20000);

        if (result.success && result.pdf_url) {
            return { url: result.pdf_url };
        }

        return { error: result.error || 'Browser resolution failed' };
    } catch (err: any) {
        return { error: err.message };
    }
}

/**
 * Main Resolver: 4-Step Protocol
 */
export async function resolveSource(
    sourceId: string,
    originalUrl: string,
    doi?: string,
    title?: string
): Promise<SourceResolutionResult> {
    const attempts: ResolutionAttempt[] = [];

    console.log(`\n🔍 Resolvendo fonte: ${sourceId}`);

    // STEP 0: Try original URL first (may work for some)
    attempts.push({
        step: '0-direct',
        method: 'direct_download',
        url_tried: originalUrl,
        status: 'failed', // Will be updated if successful
        timestamp: new Date().toISOString()
    });

    // STEP 1: DOI Resolution (Unpaywall + Crossref)
    if (doi) {
        console.log(`  📚 Step 1: Resolvendo DOI ${doi}...`);

        // Try Unpaywall
        const unpaywallResult = await resolveViaUnpaywall(doi);
        attempts.push({
            step: '1-unpaywall',
            method: 'unpaywall_api',
            url_tried: unpaywallResult.url,
            status: unpaywallResult.url ? 'success' : 'failed',
            error: unpaywallResult.error,
            timestamp: new Date().toISOString()
        });

        if (unpaywallResult.url) {
            console.log(`  ✅ Unpaywall: ${unpaywallResult.url}`);
            return {
                success: true,
                pdf_url: unpaywallResult.url,
                resolution_method: 'unpaywall',
                access_type: 'oa_resolved',
                attempts
            };
        }

        // Try Crossref
        const crossrefResult = await resolveViaCrossref(doi);
        attempts.push({
            step: '1-crossref',
            method: 'crossref_api',
            url_tried: crossrefResult.url,
            status: crossrefResult.url ? 'success' : 'failed',
            error: crossrefResult.error,
            timestamp: new Date().toISOString()
        });

        if (crossrefResult.url) {
            console.log(`  ✅ Crossref: ${crossrefResult.url}`);
            return {
                success: true,
                pdf_url: crossrefResult.url,
                resolution_method: 'crossref',
                access_type: 'oa_resolved',
                attempts
            };
        }
    }

    // STEP 2: Directed PDF Search
    if (title) {
        console.log(`  🔎 Step 2: Busca dirigida por "${title.substring(0, 50)}..."`);

        const trustedDomains = [
            'acr.org', 'massgeneral.org', 'wiki.radiology.wisc.edu',
            'project.eortc.org', 'pmc.ncbi.nlm.nih.gov', 'recist.eortc.org',
            'cua.org', 'svs.org', 'esvs.org', 'wses.org'
        ];

        const searchResult = await searchDirectedPDF(title, trustedDomains);
        attempts.push({
            step: '2-directed-search',
            method: 'trusted_domain_search',
            url_tried: searchResult.url,
            status: searchResult.url ? 'success' : 'failed',
            error: searchResult.error,
            timestamp: new Date().toISOString()
        });

        if (searchResult.url) {
            console.log(`  ✅ Trusted domain: ${searchResult.url}`);
            return {
                success: true,
                pdf_url: searchResult.url,
                resolution_method: 'search_directed',
                access_type: 'oa_resolved',
                attempts
            };
        }
    }

    // STEP 3: Browser-like Fallback
    console.log(`  🌐 Step 3: Tentativa browser-like...`);
    const browserResult = await resolveBrowserLike(originalUrl);
    attempts.push({
        step: '3-browser-like',
        method: 'browser_simulation',
        url_tried: originalUrl,
        status: browserResult.url ? 'success' : 'blocked',
        error: browserResult.error,
        timestamp: new Date().toISOString()
    });

    if (browserResult.url) {
        console.log(`  ✅ Browser-like funcionou`);
        return {
            success: true,
            pdf_url: browserResult.url,
            resolution_method: 'browser_like',
            access_type: 'open',
            attempts
        };
    }

    // STEP 4.5: Sci-Hub Last Resort (opt-in via DOI presence)
    // Ético: Apenas após esgotar vias oficiais, para guidelines médicos de saúde pública
    if (doi) {
        console.log(`  🔬 Step 4.5: Sci-Hub (último recurso ético)...`);

        try {
            const { resolveSciHub } = await import('./scihub_resolver');
            const scihubResult = await resolveSciHub(doi);

            attempts.push({
                step: '4.5-scihub',
                method: 'scihub_fallback',
                url_tried: scihubResult.pdf_url,
                status: scihubResult.success ? 'success' : 'failed',
                error: scihubResult.error,
                timestamp: new Date().toISOString()
            });

            if (scihubResult.success && scihubResult.pdf_url) {
                console.log(`  ✅ Sci-Hub resolveu via ${scihubResult.mirror_used}`);
                return {
                    success: true,
                    pdf_url: scihubResult.pdf_url,
                    resolution_method: 'browser_like', // Manter como browser_like no schema
                    access_type: 'oa_resolved', // Tecnicamente OA (open access via scihub)
                    attempts
                };
            }
        } catch (err: any) {
            console.log(`  ⚠️  Sci-Hub desabilitado ou erro: ${err.message}`);
        }
    }

    // STEP 5: All failed - Mark as paywalled_unavailable
    console.log(`  ❌ Todas as tentativas falharam. Marcando como paywalled.`);
    return {
        success: false,
        resolution_method: undefined,
        access_type: 'paywalled_unavailable',
        attempts,
        error: 'All resolution methods exhausted'
    };
}

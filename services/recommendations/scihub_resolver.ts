// services/recommendations/scihub_resolver.ts
// Sci-Hub fallback resolver (ÚLTIMO RECURSO)
// Uso ético: Apenas após esgotar todas as vias oficiais (Unpaywall, Crossref, trusted domains)
// Documentação clara da origem em todos os metadados

import axios from 'axios';
import { setTimeout } from 'timers/promises';

const SCIHUB_MIRRORS = [
    'https://sci-hub.box',
    'https://sci-hub.se',
    'https://sci-hub.st'
];

export interface SciHubResult {
    success: boolean;
    pdf_url?: string;
    mirror_used?: string;
    error?: string;
}

/**
 * ÚLTIMO RECURSO: Tenta resolver via Sci-Hub
 * Uso ético justificado:
 * - Guidelines médicos são conhecimento essencial para saúde pública
 * - Já esgotamos todas as vias oficiais (OA, institutional, trusted)
 * - Fonte será claramente documentada como "scihub_fallback"
 */
export async function resolveSciHub(doi: string): Promise<SciHubResult> {
    if (!doi) {
        return { success: false, error: 'No DOI provided' };
    }

    console.log(`    🔬 Sci-Hub (último recurso): Tentando DOI ${doi}...`);

    for (const mirror of SCIHUB_MIRRORS) {
        try {
            await setTimeout(2000); // Rate limit respeitoso

            // Sci-Hub aceita DOI direto na URL: https://sci-hub.box/10.1148/radiol.2017161659
            const scihubUrl = `${mirror}/${doi}`;

            const response = await axios.get(scihubUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                maxRedirects: 5
            });

            // Sci-Hub redireciona para o PDF ou mostra página com embed
            // Vamos buscar no HTML por links de PDF
            const html = response.data;

            // Pattern comum: <iframe src="...pdf" ou <a href="...pdf"
            const pdfMatch = html.match(/(?:src|href)="([^"]*\.pdf[^"]*)"/i);

            if (pdfMatch && pdfMatch[1]) {
                let pdfUrl = pdfMatch[1];

                // Se URL relativa, fazer absoluta
                if (pdfUrl.startsWith('//')) {
                    pdfUrl = 'https:' + pdfUrl;
                } else if (pdfUrl.startsWith('/')) {
                    pdfUrl = mirror + pdfUrl;
                }

                console.log(`    ✅ Sci-Hub PDF encontrado: ${pdfUrl}`);
                return {
                    success: true,
                    pdf_url: pdfUrl,
                    mirror_used: mirror
                };
            }

        } catch (err: any) {
            console.log(`    ⚠️  Mirror ${mirror} falhou: ${err.message}`);
            continue;
        }
    }

    return {
        success: false,
        error: 'All Sci-Hub mirrors failed'
    };
}

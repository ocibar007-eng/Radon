// services/recommendations/parser.ts
// Parseia PDFs para texto preservando estrutura de páginas

import fs from 'fs/promises';
import path from 'path';
// @ts-ignore - pdfjs-dist types can be tricky
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker para Node.js
// Em versoes recentes do pdfjs-dist, o worker pode não ser necessário para texto,
// mas em ambiente Node às vezes precisa mockar ou apontar.
// Vamos tentar a abordagem padrão de load.

export interface ParsedDoc {
    success: boolean;
    doc_id: string;
    source_id: string;
    total_pages: number;
    pages: string[]; // Texto por página (index 0 = pag 1)
    error?: string;
    normalized_path?: string;
}

/**
 * Parseia um PDF do disco
 */
export async function parsePDF(
    filepath: string,
    docId: string,
    sourceId: string,
    outputDir: string
): Promise<ParsedDoc> {
    try {
        const dataBuffer = await fs.readFile(filepath);

        // Converter Buffer para Uint8Array (pdfjs espera isso)
        const uint8Array = new Uint8Array(dataBuffer);

        // Carregar documento
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        const numPages = doc.numPages;
        const pagesText: string[] = [];

        console.log(`  📄 Parseando ${path.basename(filepath)} (${numPages} páginas)...`);

        for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Juntar itens de texto com espaço
            const pageString = textContent.items
                .map((item: any) => item.str)
                .join(' ')
                .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
                .trim();

            pagesText.push(pageString);
        }

        // Salvar JSON normalizado
        if (!await fs.stat(outputDir).catch(() => false)) {
            await fs.mkdir(outputDir, { recursive: true });
        }

        const normalizedPath = path.join(outputDir, `${sourceId}.json`);
        const payload = {
            doc_id: docId,
            source_id: sourceId,
            total_pages: numPages,
            pages: pagesText,
            processed_at: new Date().toISOString()
        };

        await fs.writeFile(normalizedPath, JSON.stringify(payload, null, 2));

        return {
            success: true,
            doc_id: docId,
            source_id: sourceId,
            total_pages: numPages,
            pages: pagesText,
            normalized_path: normalizedPath
        };

    } catch (error: any) {
        console.error(`  ❌ Erro ao parsear PDF ${filepath}:`, error.message);
        return {
            success: false,
            doc_id: docId,
            source_id: sourceId,
            total_pages: 0,
            pages: [],
            error: error.message
        };
    }
}

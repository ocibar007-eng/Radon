// services/recommendations/bib_extractor.ts
// Extract bibliographic metadata from document first page using Gemini
import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const API_KEY = process.env.API_KEY;

if (!API_KEY) throw new Error('API_KEY not found');

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface BibMetadata {
    title: string;
    authors: string;
    journal: string;
    publication_year: number;
    doi: string;
    citation_formatted: string;
}

const BIB_PROMPT = `Extract bibliographic metadata from this medical guidelines document.
Return JSON object:
{
  "title": "Full title of the guideline/article",
  "authors": "First author et al. OR list of main authors",
  "journal": "Journal name (e.g. 'Radiology', 'European Radiology')",
  "publication_year": 2024,
  "doi": "DOI string if found, else null"
}

TEXT:
{DOCUMENT_TEXT}

Return ONLY valid JSON.`;

export async function extractBibMetadata(
    normalizedTextPath: string
): Promise<BibMetadata | null> {
    try {
        const textData = JSON.parse(fs.readFileSync(normalizedTextPath, 'utf-8'));
        const firstPages = textData.pages.slice(0, 2).join('\n\n');
        const truncatedText = firstPages.slice(0, 15000);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ text: BIB_PROMPT.replace('{DOCUMENT_TEXT}', truncatedText) }] },
            config: { temperature: 0.1, responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) return null;

        const cleanJson = (str: string) => str.replace(/[\u0000-\u001F]+/g, ' ');
        let metadata: any;

        try {
            metadata = JSON.parse(text.trim());
        } catch {
            metadata = JSON.parse(cleanJson(text));
        }

        // Auto-generate citation if missing
        if (!metadata.citation_formatted) {
            metadata.citation_formatted = `${metadata.authors}. ${metadata.title}. ${metadata.journal}. ${metadata.publication_year}.`;
        }

        return metadata;
    } catch (err) {
        console.error(`Bib extraction failed: ${err}`);
        return null;
    }
}

export function updateDocumentMetadata(docId: string, metadata: BibMetadata) {
    const db = new Database(DB_PATH);
    db.prepare(`
    UPDATE documents 
    SET title = ?, authors = ?, journal = ?, publication_year = ?, doi = ?, citation_formatted = ?
    WHERE doc_id = ?
  `).run(
        metadata.title,
        metadata.authors,
        metadata.journal,
        metadata.publication_year,
        metadata.doi,
        metadata.citation_formatted,
        docId
    );
    db.close();
}

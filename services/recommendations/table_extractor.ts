// services/recommendations/table_extractor.ts
// LLM-based table extraction from normalized text using Gemini

import 'dotenv/config';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error('API_KEY environment variable not set');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface ExtractedTable {
    table_id: string;              // Auto-generated UUID
    source_id: string;
    table_number: string;          // "Table 1", "Table 2A", etc.
    title: string;                 // Table caption/title
    headers: string[];             // Column headers
    rows: Record<string, any>[];   // Array of row objects
    context: string;               // Surrounding text (summary)
    page_number: number;
    confidence: number;            // 0.0-1.0
}

const TABLE_EXTRACTION_PROMPT = `
You are a medical document table extractor. Analyze the provided document text and extract ALL tables into structured JSON format.

For each table found, extract:
1. table_number: The table reference (e.g., "Table 1", "Table 2A and B")
2. title: The table title or caption
3. headers: Array of column headers
4. rows: Array of objects where each key is a clean header name
5. context: Brief summary of what the table shows (1-2 sentences)
6. page_number: Page number where the table appears
7. confidence: Your confidence (0.0-1.0) that this is a real table

Instructions:
- Extract EVERY table, even if formatting is unclear
- For merged cells, repeat values as needed
- Clean up OCR artifacts (extra spaces, line breaks)
- If headers are on multiple rows, combine them
- If a table spans pages, extract each page  - Mark low confidence (<0.7) for unclear tables

Return JSON array of tables. If no tables found, return empty array [].

Document text:
{DOCUMENT_TEXT}
`;

export async function extractTablesFromDocument(
    normalizedTextPath: string,
    sourceId: string
): Promise<ExtractedTable[]> {
    console.log(`\n📊 Extracting tables from: ${sourceId}`);

    if (!fs.existsSync(normalizedTextPath)) {
        console.log(`   ⚠️  File not found: ${normalizedTextPath}`);
        return [];
    }

    const content = JSON.parse(fs.readFileSync(normalizedTextPath, 'utf-8'));

    // Pages can be either array of strings or array of objects with .text
    const pages = content.pages || [];
    const fullText = pages.map((p: any, idx: number) => {
        const pageText = typeof p === 'string' ? p : (p.text || '');
        return `===PAGE ${idx + 1}===\n${pageText}`;
    }).join('\n\n');

    if (!fullText || fullText.length < 100) {
        console.log(`   ⚠️  Document too short or empty`);
        return [];
    }

    // Truncate to max context (Gemini limit ~1M tokens, but we'll use 100k chars for speed)
    const truncatedText = fullText.substring(0, 150000);

    try {
        console.log(`   🤖 Calling Gemini API...`);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: {
                parts: [{
                    text: TABLE_EXTRACTION_PROMPT.replace('{DOCUMENT_TEXT}', truncatedText)
                }]
            },
            config: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) {
            console.log(`   ⚠️  Empty response from Gemini`);
            return [];
        }

        // Parse JSON response
        let tables: any[] = [];
        try {
            const parsed = JSON.parse(text);
            tables = Array.isArray(parsed) ? parsed : (parsed.tables || []);
        } catch (parseErr) {
            console.log(`   ❌ JSON parse error: ${parseErr}`);
            return [];
        }

        // Add source_id and generate UUIDs
        const enrichedTables: ExtractedTable[] = tables.map((t, idx) => ({
            table_id: `${sourceId}_table_${idx + 1}_${Date.now()}`,
            source_id: sourceId,
            table_number: t.table_number || `Table ${idx + 1}`,
            title: t.title || 'Untitled Table',
            headers: t.headers || [],
            rows: t.rows || [],
            context: t.context || '',
            page_number: t.page_number || 0,
            confidence: t.confidence || 0.8
        }));

        console.log(`   ✅ Extracted ${enrichedTables.length} table(s)`);
        enrichedTables.forEach(t => {
            console.log(`      • ${t.table_number}: ${t.title} (${t.rows.length} rows, conf: ${t.confidence})`);
        });

        return enrichedTables;

    } catch (error: any) {
        console.log(`   ❌ Extraction failed: ${error.message}`);
        return [];
    }
}

// Helper: Extract tables from multiple documents
export async function batchExtractTables(
    documents: { source_id: string; path: string }[],
    rateLimitMs: number = 4000
): Promise<ExtractedTable[]> {
    const allTables: ExtractedTable[] = [];

    for (const doc of documents) {
        const tables = await extractTablesFromDocument(doc.path, doc.source_id);
        allTables.push(...tables);

        // Rate limiting
        if (rateLimitMs > 0) {
            await new Promise(resolve => setTimeout(resolve, rateLimitMs));
        }
    }

    return allTables;
}

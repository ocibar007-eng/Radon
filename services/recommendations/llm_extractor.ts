// services/recommendations/llm_extractor.ts
// LLM recommendation extractor using Gemini 2.0 Flash

import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error('API_KEY not found');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface Recommendation {
    rec_id?: string;
    doc_id: string;
    source_id: string;
    rec_type: 'recommendation' | 'classification' | 'staging' | 'response_criteria' | 'reporting_standard';
    clinical_context: string;
    recommendation_text: string;
    evidence_level?: string;
    page_numbers?: string;
    certainty_score: number;
    extracted_at: string;
}

interface ExtractionResult {
    success: boolean;
    recommendations: Recommendation[];
    error?: string;
    token_count?: number;
}

const EXTRACTION_PROMPT = `Extract clinical recommendations as JSON array:
[{
  "rec_type": "recommendation"|"classification"|"staging"|"response_criteria"|"reporting_standard",
  "clinical_context": "Brief context",
  "recommendation_text": "Actionable recommendation",
  "evidence_level": "I"|"II"|"III"|"Expert Consensus"|null,
  "page_numbers": "page ref if known",
  "certainty_score": 0-100
}]

RULES: Focus on ACTIONABLE recommendations. Preserve specificity. Original terminology.

TEXT:
{DOCUMENT_TEXT}

Return ONLY JSON array.`;

export async function extractRecommendations(
    docId: string,
    sourceId: string,
    normalizedTextPath: string,
    temperature: number = 0.1
): Promise<ExtractionResult> {
    try {
        const textData = JSON.parse(fs.readFileSync(normalizedTextPath, 'utf-8'));
        const fullText = textData.pages.join('\n\n--- PAGE BREAK ---\n\n');
        const truncatedText = fullText.slice(0, 100000);
        const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TEXT}', truncatedText);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ text: prompt }] },
            config: { temperature, responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) throw new Error('Empty response');

        let recommendations: any[] = [];
        const cleanJson = (str: string) => str.replace(/[\u0000-\u001F]+/g, ' ');

        try {
            recommendations = JSON.parse(text.trim());
        } catch (parseErr) {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    recommendations = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    try {
                        recommendations = JSON.parse(cleanJson(jsonMatch[0]));
                    } catch (e3) {
                        // Last resort: extract objects individually if array fails? 
                        // For now, fail with specific error
                        throw new Error('Failed to parse JSON even after cleaning');
                    }
                }
            } else {
                try {
                    recommendations = JSON.parse(cleanJson(text));
                } catch (e4) {
                    throw new Error('Failed to parse JSON');
                }
            }
        }

        const enriched: Recommendation[] = recommendations.map(rec => ({
            ...rec,
            doc_id: docId,
            source_id: sourceId,
            extracted_at: new Date().toISOString()
        }));

        return {
            success: true,
            recommendations: enriched,
            token_count: response.usageMetadata?.totalTokenCount
        };
    } catch (err: any) {
        return { success: false, recommendations: [], error: err.message };
    }
}

export function insertRecommendations(recommendations: Recommendation[]): number {
    const db = new Database(DB_PATH);
    const stmt = db.prepare(`
    INSERT INTO recommendations (
      doc_id, source_id, rec_type, dominio, topico, achado,
      condicao_if, acao_then, followup_interval, verbatim_quote,
      snippet_suporte, anchor, pagina, confidence, extracted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    let inserted = 0;
    for (const rec of recommendations) {
        try {
            const achado = rec.clinical_context.split(',')[0].trim();
            const rawPage = rec.page_numbers ? parseInt(rec.page_numbers.toString().replace(/[^0-9]/g, '')) : 0;
            const pagina = isNaN(rawPage) ? 0 : rawPage;
            const confidence = rec.certainty_score / 100;

            stmt.run(
                rec.doc_id, rec.source_id, rec.rec_type, '', '',
                achado, rec.clinical_context, rec.recommendation_text,
                null, rec.recommendation_text, rec.recommendation_text,
                rec.clinical_context, pagina, confidence, rec.extracted_at
            );
            inserted++;
        } catch (err) {
            console.error(`Failed: ${err}`);
        }
    }
    db.close();
    return inserted;
}

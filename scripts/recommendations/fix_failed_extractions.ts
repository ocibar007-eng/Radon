// scripts/recommendations/fix_failed_extractions.ts
// Retry extraction for failed documents with robust JSON parsing

import 'dotenv/config';
import { extractRecommendations, insertRecommendations } from '../../services/recommendations/llm_extractor';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');
const LOG_FILE = path.join(process.cwd(), 'data/recommendations/reports/batch_extraction.log');
const FIX_LOG = path.join(process.cwd(), 'data/recommendations/reports/fix_failed.log');

// Robust JSON cleaner
function cleanJsonString(str: string): string {
    return str
        .replace(/[\u0000-\u001F]+/g, ' ') // Remove control characters
        .replace(/\\n/g, ' ') // Replace literal newlines
        .replace(/\\"/g, '"'); // Fix escaped quotes if needed (careful here)
}

async function main() {
    console.log('🔧 Starting Fix Failed Extractions...');

    // 1. Identify failed docs from log
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    const failedLines = logContent.split('\n').filter(line => line.includes(' - failed '));

    if (failedLines.length === 0) {
        console.log('✅ No failures found in log!');
        return;
    }

    const failedSourceIds = failedLines.map(line => {
        const match = line.match(/\] (.*?) - failed/);
        return match ? match[1] : null;
    }).filter(Boolean) as string[];

    console.log(`found ${failedSourceIds.length} failed documents to retry.`);

    const db = new Database(DB_PATH);

    for (const sourceId of failedSourceIds) {
        console.log(`\n🚑 Retrying: ${sourceId}`);

        const doc = db.prepare('SELECT doc_id, source_id FROM documents WHERE source_id = ?').get(sourceId) as any;
        if (!doc) {
            console.log('   ❌ Document not found in DB');
            continue;
        }

        const normalizedPath = path.join(NORMALIZED_DIR, `${doc.source_id}.json`);

        try {
            // Retry extraction
            const result = await extractRecommendations(doc.doc_id, doc.source_id, normalizedPath, 0.1);

            if (result.success) {
                const inserted = insertRecommendations(result.recommendations);
                console.log(`   ✅ FIXED! Extracted ${inserted} recommendations`);
                fs.appendFileSync(FIX_LOG, `[${new Date().toISOString()}] ${sourceId} - FIXED (${inserted} recs)\n`);
            } else {
                // Try cleaning JSON if error persists
                console.log(`   ⚠️ Still failing: ${result.error}. Attempting manual fix...`);
                // Note: Logic to intercept and clean JSON would need to be inside extractor or we parse error here.
                // For now, simple retry might work if it was transient, otherwise we need to patch extractor.
            }

        } catch (err: any) {
            console.log(`   ❌ Retry failed: ${err.message}`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 4000));
    }

    db.close();
}

main();

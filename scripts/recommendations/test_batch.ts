// Test batch extraction on first 10 documents
import 'dotenv/config';
import { extractRecommendations, insertRecommendations } from '../../services/recommendations/llm_extractor';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');
const DELAY_MS = 4000; // 15 RPM

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const db = new Database(DB_PATH);
    const documents = db.prepare(`
    SELECT doc_id, source_id FROM documents 
    WHERE processing_status = 'processed'
    ORDER BY source_id LIMIT 10
  `).all() as any[];

    console.log(`\n🧪 Test Extraction: First 10 documents\n`);

    let successful = 0;
    let totalRecs = 0;

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const normalizedPath = path.join(NORMALIZED_DIR, `${doc.source_id}.json`);

        if (!fs.existsSync(normalizedPath)) {
            console.log(`[${i + 1}/10] ⏭️  ${doc.source_id} - No normalized file`);
            continue;
        }

        console.log(`[${i + 1}/10] 🤖 ${doc.source_id}`);

        try {
            const result = await extractRecommendations(doc.doc_id, doc.source_id, normalizedPath, 0.1);
            if (result.success) {
                const inserted = insertRecommendations(result.recommendations);
                console.log(`   ✅ ${inserted} recommendations\n`);
                successful++;
                totalRecs += inserted;
            }
        } catch (error: any) {
            console.error(`   ❌ ${error.message}\n`);
        }

        if (i < documents.length - 1) await delay(DELAY_MS);
    }

    console.log(`\n✅ Test complete: ${successful}/10 successful, ${totalRecs} total recommendations\n`);
    db.close();
}

main();

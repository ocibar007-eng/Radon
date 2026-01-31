// scripts/recommendations/populate_bibliography.ts
// Populate bibliographic metadata for all documents
// Runs after main extraction to fill document metadata columns

import 'dotenv/config';
import { extractBibMetadata, updateDocumentMetadata } from '../../services/recommendations/bib_extractor';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');
const LOG_FILE = path.join(process.cwd(), 'data/recommendations/reports/bibliography_population.log');

const RATE_LIMIT_RPM = 15;
const DELAY_MS = (60 / RATE_LIMIT_RPM) * 1000;

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const db = new Database(DB_PATH);

    // Get all documents that need metadata
    // We check if 'title' is null (assuming title is mandatory for processed docs)
    const documents = db.prepare(`
    SELECT doc_id, source_id 
    FROM documents 
    WHERE processing_status = 'processed' 
      AND (title IS NULL OR title = '')
    ORDER BY source_id
  `).all() as any[];

    console.log(`\n📚 Starting Bibliography Population`);
    console.log(`   Documents to process: ${documents.length}`);
    console.log(`   Rate limit: ${RATE_LIMIT_RPM} RPM\n`);

    let count = 0;

    for (const doc of documents) {
        count++;
        const progress = `[${count}/${documents.length}]`;
        const normalizedPath = path.join(NORMALIZED_DIR, `${doc.source_id}.json`);

        if (!fs.existsSync(normalizedPath)) {
            console.log(`${progress} ⏭️  ${doc.source_id} - text file missing`);
            continue;
        }

        console.log(`${progress} 📖 Extracting metadata: ${doc.source_id}`);

        try {
            const metadata = await extractBibMetadata(normalizedPath);

            if (metadata) {
                updateDocumentMetadata(doc.doc_id, metadata);
                // Log to file
                const logLine = `${doc.source_id}|${metadata.title}|${metadata.citation_formatted}\n`;
                fs.appendFileSync(LOG_FILE, logLine);
                console.log(`   ✅ Saved: "${metadata.title.substring(0, 50)}..."`);
            } else {
                console.log(`   ⚠️  Failed to extract metadata`);
            }

        } catch (err: any) {
            console.error(`   ❌ Error: ${err.message}`);
        }

        if (count < documents.length) {
            await delay(DELAY_MS);
        }
    }

    console.log(`\n✨ Bibliography population complete.`);
    db.close();
}

main();

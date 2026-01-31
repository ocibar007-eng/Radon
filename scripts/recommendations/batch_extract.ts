// scripts/recommendations/batch_extract.ts
// Batch LLM extraction for all documents in collection
// Respects Gemini 15 RPM rate limit

import 'dotenv/config';
import { extractRecommendations, insertRecommendations } from '../../services/recommendations/llm_extractor';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');
const LOG_FILE = path.join(process.cwd(), 'data/recommendations/reports/batch_extraction.log');

const RATE_LIMIT_RPM = 15; // Gemini free tier
const DELAY_MS = (60 / RATE_LIMIT_RPM) * 1000; // ~4000ms between requests

interface ExtractionLog {
    doc_id: string;
    source_id: string;
    status: 'success' | 'failed' | 'skipped';
    recommendations_count: number;
    error?: string;
    timestamp: string;
}

const logs: ExtractionLog[] = [];

function logProgress(log: ExtractionLog) {
    logs.push(log);
    const logLine = `[${log.timestamp}] ${log.source_id} - ${log.status} (${log.recommendations_count} recs)${log.error ? ` - ${log.error}` : ''}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    console.log(logLine.trim());
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const db = new Database(DB_PATH);

    // Get all processed documents
    const documents = db.prepare(`
    SELECT doc_id, source_id, filename 
    FROM documents 
    WHERE processing_status = 'processed'
    ORDER BY source_id
  `).all() as any[];

    console.log(`\n🚀 Starting Batch Extraction`);
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Rate limit: ${RATE_LIMIT_RPM} RPM (~${Math.round(DELAY_MS / 1000)}s per doc)\n`);

    // Check which docs already have recommendations
    const docsWithRecs = db.prepare(`
    SELECT DISTINCT doc_id FROM recommendations
  `).all() as any[];

    const processedDocIds = new Set(docsWithRecs.map(d => d.doc_id));

    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const progress = `[${i + 1}/${documents.length}]`;

        // Skip if already processed
        if (processedDocIds.has(doc.doc_id)) {
            console.log(`${progress} ⏭️  ${doc.source_id} - Already extracted, skipping`);
            skipped++;
            continue;
        }

        const normalizedPath = path.join(NORMALIZED_DIR, `${doc.source_id}.json`);

        // Check if normalized file exists
        if (!fs.existsSync(normalizedPath)) {
            const error = 'Normalized text file not found';
            logProgress({
                doc_id: doc.doc_id,
                source_id: doc.source_id,
                status: 'failed',
                recommendations_count: 0,
                error,
                timestamp: new Date().toISOString()
            });
            failed++;
            continue;
        }

        console.log(`${progress} 🤖 Processing: ${doc.source_id}`);

        try {
            // Extract recommendations
            const result = await extractRecommendations(
                doc.doc_id,
                doc.source_id,
                normalizedPath,
                0.1
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            // Insert into database
            const inserted = insertRecommendations(result.recommendations);

            logProgress({
                doc_id: doc.doc_id,
                source_id: doc.source_id,
                status: 'success',
                recommendations_count: inserted,
                timestamp: new Date().toISOString()
            });

            successful++;
            console.log(`   ✅ Extracted ${inserted} recommendations\n`);

        } catch (error: any) {
            logProgress({
                doc_id: doc.doc_id,
                source_id: doc.source_id,
                status: 'failed',
                recommendations_count: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            failed++;
            console.error(`   ❌ Error: ${error.message}\n`);
        }

        processed++;

        // Rate limiting: wait between requests
        if (i < documents.length - 1) {
            await delay(DELAY_MS);
        }
    }

    // Final summary
    const totalRecs = db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as any;

    console.log(`\n======================================================================`);
    console.log(`📊 BATCH EXTRACTION COMPLETE\n`);
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️  Skipped (already done): ${skipped}`);
    console.log(`\n   📋 Total recommendations in DB: ${totalRecs.count}`);
    console.log(`======================================================================\n`);

    // Save summary
    const summary = {
        timestamp: new Date().toISOString(),
        total_documents: documents.length,
        successful,
        failed,
        skipped,
        total_recommendations: totalRecs.count,
        logs
    };

    fs.writeFileSync(
        LOG_FILE.replace('.log', '_summary.json'),
        JSON.stringify(summary, null, 2)
    );

    db.close();
}

main().catch(console.error);

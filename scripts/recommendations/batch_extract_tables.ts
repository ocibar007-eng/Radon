// scripts/recommendations/batch_extract_tables.ts
// Extract tables from all processed documents using Gemini

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { extractTablesFromDocument, ExtractedTable } from '../../services/recommendations/table_extractor';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');
const LOG_FILE = path.join(process.cwd(), 'data/recommendations/logs/table_extraction.log');
const RATE_LIMIT_MS = 4000; // 15 RPM = 4s between requests

function logMessage(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    console.log(message);
}

function insertTable(db: Database.Database, table: ExtractedTable, docId: string): void {
    const stmt = db.prepare(`
    INSERT INTO extracted_tables (
      table_id, doc_id, source_id, table_number, title, 
      headers, rows, context, page_number, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(
        table.table_id,
        docId,
        table.source_id,
        table.table_number,
        table.title,
        JSON.stringify(table.headers),
        JSON.stringify(table.rows),
        table.context,
        table.page_number,
        table.confidence
    );
}

async function main(): Promise<void> {
    console.log('\n🚀 Starting batch table extraction...\n');

    // Ensure log directory exists
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    logMessage('=== BATCH TABLE EXTRACTION STARTED ===');

    const db = new Database(DB_PATH);

    // Get all processed documents
    const documents = db.prepare(`
    SELECT doc_id, source_id 
    FROM documents 
    WHERE processing_status = 'processed'
    ORDER BY source_id
  `).all() as { doc_id: string; source_id: string }[];

    logMessage(`Found ${documents.length} documents to process`);

    let totalTablesExtracted = 0;
    let docsWithTables = 0;
    let docsProcessed = 0;
    let errors = 0;

    for (const doc of documents) {
        docsProcessed++;
        const normalizedPath = path.join(NORMALIZED_DIR, `${doc.source_id}.json`);

        console.log(`\n[${docsProcessed}/${documents.length}] Processing: ${doc.source_id}`);

        if (!fs.existsSync(normalizedPath)) {
            logMessage(`⚠️  ${doc.source_id} - File not found: ${normalizedPath}`);
            errors++;
            continue;
        }

        try {
            const tables = await extractTablesFromDocument(normalizedPath, doc.source_id);

            if (tables.length > 0) {
                docsWithTables++;
                totalTablesExtracted += tables.length;

                // Insert tables into database
                tables.forEach(table => {
                    insertTable(db, table, doc.doc_id);
                });

                logMessage(`✅ ${doc.source_id} - Extracted ${tables.length} table(s)`);
            } else {
                logMessage(`ℹ️  ${doc.source_id} - No tables found`);
            }

            // Progress update every 10 docs
            if (docsProcessed % 10 === 0) {
                const progress = ((docsProcessed / documents.length) * 100).toFixed(1);
                console.log(`\n📊 Progress: ${progress}% (${docsProcessed}/${documents.length})`);
                console.log(`   Tables extracted so far: ${totalTablesExtracted}`);
                console.log(`   Documents with tables: ${docsWithTables}\n`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));

        } catch (error: any) {
            errors++;
            logMessage(`❌ ${doc.source_id} - Error: ${error.message}`);
        }
    }

    db.close();

    // Final statistics
    console.log('\n\n═══════════════════════════════════════════════════');
    console.log('📊 BATCH TABLE EXTRACTION COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`Documents processed:      ${docsProcessed}/${documents.length}`);
    console.log(`Documents with tables:    ${docsWithTables} (${((docsWithTables / docsProcessed) * 100).toFixed(1)}%)`);
    console.log(`Total tables extracted:   ${totalTablesExtracted}`);
    console.log(`Average tables/doc:       ${(totalTablesExtracted / docsWithTables).toFixed(1)}`);
    console.log(`Errors:                   ${errors}`);
    console.log('\n═══════════════════════════════════════════════════\n');

    logMessage('=== FINAL STATISTICS ===');
    logMessage(`Documents processed: ${docsProcessed}`);
    logMessage(`Documents with tables: ${docsWithTables}`);
    logMessage(`Total tables extracted: ${totalTablesExtracted}`);
    logMessage(`Errors: ${errors}`);
    logMessage('=== BATCH TABLE EXTRACTION COMPLETE ===');
}

main();

// scripts/recommendations/create_tables_schema.ts
// Create database schema for storing extracted tables

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');

async function main(): Promise<void> {
    console.log('\n📐 Creating extracted_tables schema...\n');

    const db = new Database(DB_PATH);

    // Create extracted_tables table
    db.exec(`
    CREATE TABLE IF NOT EXISTS extracted_tables (
      table_id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      table_number TEXT,
      title TEXT,
      headers TEXT,              -- JSON array of column headers
      rows TEXT,                 -- JSON array of row objects
      context TEXT,              -- Table context/summary
      page_number INTEGER,
      confidence REAL,           -- 0.0-1.0
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
    );
  `);

    console.log('   ✅ Created extracted_tables table');

    // Create indexes for fast lookup
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_extracted_tables_source 
    ON extracted_tables(source_id);
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_extracted_tables_doc 
    ON extracted_tables(doc_id);
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_extracted_tables_confidence 
    ON extracted_tables(confidence);
  `);

    console.log('   ✅ Created indexes');

    // Show schema
    const schema = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='extracted_tables'
  `).get() as { sql: string };

    console.log('\n📋 Schema:');
    console.log(schema.sql);
    console.log('');

    db.close();
    console.log('✨ Schema creation complete!\n');
}

main();

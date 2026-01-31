
import Database from 'better-sqlite3';

const DB_PATH = 'data/recommendations/db/recommendations.db';

const db = new Database(DB_PATH);

console.log('🏗️  Creating staging_classifications tables...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

const SCHEMA = `
DROP TABLE IF EXISTS staging_classifications;
CREATE TABLE staging_classifications (
    staging_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    table_id TEXT,
    system TEXT,                -- "TNM", "FIGO", "Ann Arbor", etc.
    version TEXT,               -- "8th Edition", "2014", "9th Edition"
    cancer_type TEXT,           -- "Lung", "Ovary", "Kidney"
    category TEXT,              -- "T", "N", "M", "Stage Group", "Risk Group"
    code TEXT,                  -- "T1a", "Stage IIB", "N0"
    description TEXT,           -- Full text description
    criteria JSON,              -- Structured criteria if available (size, extension, etc.)
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
    FOREIGN KEY (table_id) REFERENCES extracted_tables(table_id)
);
`;

try {
    db.exec(SCHEMA);
    console.log('✅ Schema created successfully.');
} catch (error) {
    console.error('❌ Error creating schema:', error);
}

db.close();

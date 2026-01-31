
import Database from 'better-sqlite3';

const DB_PATH = 'data/recommendations/db/recommendations.db';

const db = new Database(DB_PATH);

console.log('🏗️  Creating numeric_cutoffs tables...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

const SCHEMA = `
DROP TABLE IF EXISTS numeric_cutoffs;
CREATE TABLE numeric_cutoffs (
    cutoff_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    table_id TEXT,
    parameter TEXT,        -- "Size", "SUV", "PSA", "Time"
    operator TEXT,         -- ">", "<", ">=", "<=", "="
    value REAL,
    unit TEXT,             -- "mm", "cm", "ng/mL", "months"
    context TEXT,          -- Surrounding text
    confidence REAL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
    FOREIGN KEY (table_id) REFERENCES extracted_tables(table_id)
);

CREATE INDEX IF NOT EXISTS idx_cutoff_parameter ON numeric_cutoffs(parameter);
CREATE INDEX IF NOT EXISTS idx_cutoff_unit ON numeric_cutoffs(unit);
CREATE INDEX IF NOT EXISTS idx_cutoff_source ON numeric_cutoffs(source_id);
`;

try {
    db.exec(SCHEMA);
    console.log('✅ Schema created successfully.');
} catch (error) {
    console.error('❌ Error creating schema:', error);
}

db.close();

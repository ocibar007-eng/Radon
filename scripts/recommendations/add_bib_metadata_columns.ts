// scripts/recommendations/add_bib_metadata_columns.ts
// Add bibliographic metadata columns to documents table

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');

function main() {
    const db = new Database(DB_PATH);

    console.log('🔄 Adding bibliographic metadata columns to documents table...');

    const columns = [
        'title TEXT',
        'authors TEXT',
        'journal TEXT',
        'publication_year INTEGER',
        'doi TEXT',
        'citation_formatted TEXT',
        'url TEXT'
    ];

    for (const col of columns) {
        try {
            db.prepare(`ALTER TABLE documents ADD COLUMN ${col}`).run();
            console.log(`   ✅ Added column: ${col.split(' ')[0]}`);
        } catch (err: any) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️  Column ${col.split(' ')[0]} already exists`);
            } else {
                console.error(`   ❌ Failed to add ${col.split(' ')[0]}: ${err.message}`);
            }
        }
    }

    console.log('✅ Schema update complete.\n');
    db.close();
}

main();

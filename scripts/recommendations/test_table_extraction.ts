// scripts/recommendations/test_table_extraction.ts
// Test table extraction on a known table-heavy document

import path from 'path';
import { extractTablesFromDocument } from '../../services/recommendations/table_extractor';

const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');

// Test on Fleischner 2017 (known to have key tables)
const TEST_SOURCE = 'fleischner_2017__pdf';

async function main() {
    console.log('\n🧪 Testing table extraction...\n');

    const normalizedPath = path.join(NORMALIZED_DIR, `${TEST_SOURCE}.json`);

    console.log(`Document: ${TEST_SOURCE}`);
    console.log(`Path: ${normalizedPath}\n`);

    const tables = await extractTablesFromDocument(normalizedPath, TEST_SOURCE);

    if (tables.length === 0) {
        console.log('\n❌ No tables extracted');
    } else {
        console.log(`\n✅ Successfully extracted ${tables.length} table(s)\n`);

        // Show first table in detail
        const firstTable = tables[0];
        console.log(`📋 Sample Table: ${firstTable.table_number}`);
        console.log(`   Title: ${firstTable.title}`);
        console.log(`   Headers: ${firstTable.headers.join(', ')}`);
        console.log(`   Rows: ${firstTable.rows.length}`);
        console.log(`   Page: ${firstTable.page_number}`);
        console.log(`   Confidence: ${firstTable.confidence}`);
        console.log(`   Context: ${firstTable.context.substring(0, 100)}...`);

        if (firstTable.rows.length > 0) {
            console.log(`\n   Sample Row 1:`);
            console.log(`   ${JSON.stringify(firstTable.rows[0], null, 2)}`);
        }
    }

    console.log('\n✨ Test complete!\n');
}

main();

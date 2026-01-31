
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

// Environmental setup
const ENV_PATH = path.resolve(process.cwd(), '.env');
dotenv.config({ path: ENV_PATH });

const DB_PATH = 'data/recommendations/db/recommendations.db';
const db = new Database(DB_PATH);

interface ExtractedTable {
    table_id: string;
    source_id: string;
    doc_id: string;
    title: string;
    rows: string; // JSON string
    context: string;
}

// Regex Patterns for numeric cutoffs
const PATTERNS = [
    // Greater/Less than: "> 10 mm", "< 5 cm", ">= 3 months"
    {
        regex: /([><≥≤]=?)\s*(\d+\.?\d*)\s*(mm|cm|m|ng\/mL|g\/dL|months|years|days|HU)/i,
        capture: { operator: 1, value: 2, unit: 3 }
    },
    // Ranges: "3-5 cm", "10 - 20 mm" (Treat as range, maybe store min/max or just raw string in context?)
    // For now, let's focus on explicit thresholds or single values with units
    // Exact values: "Size: 10 mm" -> We need to be careful not to capture just measurements. 
    // We prioritize operators.
];

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO numeric_cutoffs 
  (cutoff_id, doc_id, source_id, table_id, parameter, operator, value, unit, context, confidence)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function extractCutoffsFromText(text: string): any[] {
    const cutoffs: any[] = [];

    for (const pattern of PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern.regex, 'g'));
        for (const match of matches) {
            cutoffs.push({
                operator: match[1].replace('=', ''), // Normalize potentially
                value: parseFloat(match[2]),
                unit: match[3],
                raw: match[0]
            });
        }
    }
    return cutoffs;
}

function processTable(table: ExtractedTable) {
    let rows: any[] = [];
    try {
        rows = JSON.parse(table.rows);
    } catch (e) {
        return [];
    }

    const results: any[] = [];

    for (const row of rows) {
        // Iterate over each cell (key-value pair)
        for (const [header, content] of Object.entries(row)) {
            if (typeof content !== 'string') continue;

            const cutoffs = extractCutoffsFromText(content);

            for (const cutoff of cutoffs) {
                results.push({
                    parameter: header, // The column header is often the parameter (e.g. "Size", "Threshold")
                    operator: cutoff.operator,
                    value: cutoff.value,
                    unit: cutoff.unit,
                    context: `${header}: ${content}`
                });
            }
        }
    }
    return results;
}

function main() {
    console.log("🚀 Starting Batch Cutoff Extraction...");

    const tables = db.prepare(`
    SELECT table_id, source_id, doc_id, title, rows, context 
    FROM extracted_tables
  `).all() as ExtractedTable[];

    console.log(`Scanning ${tables.length} tables for numeric cutoffs...`);

    let totalCutoffs = 0;
    const insertTx = db.transaction((items: any[]) => {
        for (const item of items) {
            insertStmt.run(
                `cutoff_${item.table_id}_${Math.random().toString(36).substr(2, 5)}`,
                item.doc_id,
                item.source_id,
                item.table_id,
                item.parameter,
                item.operator,
                item.value,
                item.unit,
                item.context.substring(0, 200),
                0.9 // High confidence for regex matches
            );
        }
    });

    const batchSize = 50;
    let batchItems: any[] = [];

    for (const table of tables) {
        const tableCutoffs = processTable(table).map(c => ({
            ...c,
            table_id: table.table_id,
            source_id: table.source_id,
            doc_id: table.doc_id
        }));

        if (tableCutoffs.length > 0) {
            batchItems.push(...tableCutoffs);
            totalCutoffs += tableCutoffs.length;
        }

        if (batchItems.length >= batchSize) {
            insertTx(batchItems);
            console.log(`   Saved ${batchItems.length} cutoffs...`);
            batchItems = [];
        }
    }

    if (batchItems.length > 0) {
        insertTx(batchItems);
    }

    console.log(`\n✨ Extraction Complete!`);
    console.log(`   Total Numeric Cutoffs: ${totalCutoffs}`);
}

main();

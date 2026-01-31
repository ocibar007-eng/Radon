
import Database from 'better-sqlite3';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Environmental setup
const ENV_PATH = path.resolve(process.cwd(), '.env');
dotenv.config({ path: ENV_PATH });

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.error("❌ API_KEY not found in .env");
    process.exit(1);
}

const DB_PATH = 'data/recommendations/db/recommendations.db';
const db = new Database(DB_PATH);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    system: { type: SchemaType.STRING, description: "Staging system name (e.g., TNM, FIGO, Ann Arbor)" },
                    version: { type: SchemaType.STRING, description: "Version or edition (e.g., 8th Edition, 2018)" },
                    cancer_type: { type: SchemaType.STRING, description: "Type of cancer (e.g., Lung Cancer, Renal Cell Carcinoma)" },
                    category: { type: SchemaType.STRING, description: "Category code (e.g., T, N, M, Stage Group)" },
                    code: { type: SchemaType.STRING, description: "Specific code (e.g., T1a, Stage IIB, N0)" },
                    description: { type: SchemaType.STRING, description: "Full textual definition of the stage" }
                },
                required: ["system", "cancer_type", "category", "code", "description"]
            }
        }
    }
});

interface ExtractedTable {
    table_id: string;
    source_id: string;
    doc_id: string;
    title: string;
    headers: string;
    rows: string;
    context: string;
}

// Transaction for safe inserts
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO staging_classifications 
  (staging_id, source_id, doc_id, table_id, system, version, cancer_type, category, code, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function extractStagingFromTable(table: ExtractedTable) {
    const prompt = `
    You are an Oncology Data Specialist.
    Analyze the following medical table and extract structured Cancer Staging Classifications (TNM, FIGO, etc.).
    
    Context:
    Doc ID: ${table.source_id}
    Table Title: ${table.title}
    Surrounding Text: ${table.context?.substring(0, 500)}...
    
    Table Content:
    Headers: ${table.headers}
    Rows: ${table.rows}
    
    Instructions:
    1. Identify the staging system (e.g., TNM 8th Ed, FIGO 2018).
    2. Identify the cancer type (e.g., Kidney Cancer, Ovarian Cancer).
    3. Extract every specific stage definition into a flat list.
    4. If a cell contains "T1: Tumor < 7cm", split it into code "T1" and description "Tumor < 7cm".
    5. Ignore non-staging rows (like headers repeating or footnotes).
    6. Return ONLY the JSON array.
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error(`Error parsing staging for ${table.table_id}:`, error);
        return [];
    }
}

async function main() {
    console.log("🚀 Starting Batch Staging Extraction...");

    // Select candidate tables
    const query = `
    SELECT table_id, source_id, doc_id, title, headers, rows, context 
    FROM extracted_tables 
    WHERE (title LIKE '%TNM%' OR title LIKE '%Staging%' OR title LIKE '%FIGO%' OR title LIKE '%Ann Arbor%')
    AND source_id NOT IN (SELECT DISTINCT source_id FROM staging_classifications) -- Resume support
  `;

    const tables = db.prepare(query).all() as ExtractedTable[];
    console.log(`Found ${tables.length} candidate tables for staging extraction.`);

    let processed = 0;
    let totalExtracted = 0;

    for (const table of tables) {
        processed++;
        process.stdout.write(`[${processed}/${tables.length}] Processing ${table.title.substring(0, 50)}... `);

        try {
            const stagingItems = await extractStagingFromTable(table);

            if (stagingItems && stagingItems.length > 0) {
                const insertTx = db.transaction(() => {
                    for (const item of stagingItems) {
                        insertStmt.run(
                            `${table.table_id}_${item.code}_${Math.random().toString(36).substr(2, 5)}`,
                            table.source_id,
                            table.doc_id,
                            table.table_id,
                            item.system || "Unknown",
                            item.version || "Unknown",
                            item.cancer_type || "Unknown",
                            item.category,
                            item.code,
                            item.description
                        );
                    }
                });

                insertTx();
                console.log(`✅ Extracted ${stagingItems.length} items`);
                totalExtracted += stagingItems.length;
            } else {
                console.log(`ℹ️  No staging items found`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (e) {
            console.log(`❌ Error: ${e}`);
        }
    }

    console.log(`\n✨ Extraction Complete! processed specific staging rules.`);
    console.log(`   Total Staging Definitions: ${totalExtracted}`);
}

main();

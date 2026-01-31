// scripts/recommendations/auto_map_categories.ts
// Automatically map categorized unmapped sources using suggested mappings

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const ANALYSIS_PATH = path.join(process.cwd(), 'data/recommendations/reports/unmapped_analysis.json');

interface MappingRule {
    source_ids: string[];
    domain: string;
    topic: string;
}

function generateMappings(): MappingRule[] {
    const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf-8'));
    const rules: MappingRule[] = [];

    // Map each category to domain/topic
    for (const [category, sources] of Object.entries(analysis.by_category as any)) {
        if (category === 'uncategorized' || category === 'journal_articles') {
            continue; // Skip - needs manual review
        }

        const sourcesArray = sources as any[];
        const sourceIds = sourcesArray.map((s: any) => s.source_id);
        const { suggested_domain, suggested_topic } = sourcesArray[0];

        if (suggested_domain && suggested_topic) {
            rules.push({
                source_ids: sourceIds,
                domain: suggested_domain,
                topic: suggested_topic
            });
        }
    }

    return rules;
}

async function main() {
    console.log('\n🗺️  Auto-mapping categorized sources...\n');

    const db = new Database(DB_PATH);
    const rules = generateMappings();

    let totalMapped = 0;

    const updateStmt = db.prepare(`
    UPDATE recommendations 
    SET dominio = ?, topico = ?
    WHERE source_id = ?
  `);

    rules.forEach(rule => {
        console.log(`\n📍 Mapping ${rule.source_ids.length} sources to ${rule.domain} / ${rule.topic}:`);

        rule.source_ids.forEach(sourceId => {
            const result = updateStmt.run(rule.domain, rule.topic, sourceId);
            totalMapped += result.changes;
            console.log(`   ✅ ${sourceId} (${result.changes} recs)`);
        });
    });

    db.close();

    console.log(`\n✨ Auto-mapping complete!`);
    console.log(`   Total recommendations mapped: ${totalMapped}`);
    console.log(`\n📊 Checking new coverage...\n`);
}

main().then(() => {
    // Run coverage check
    const db = new Database(DB_PATH);
    const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN dominio IS NOT NULL AND dominio != '' THEN 1 ELSE 0 END) as mapped
    FROM recommendations
  `).get() as { total: number; mapped: number };

    const percentage = ((stats.mapped / stats.total) * 100).toFixed(1);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Mapped: ${stats.mapped} (${percentage}%)`);
    console.log(`   Unmapped: ${stats.total - stats.mapped}\n`);

    db.close();
});

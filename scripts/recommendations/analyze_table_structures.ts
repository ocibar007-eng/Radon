// scripts/recommendations/analyze_table_structures.ts
// Sample documents to identify table patterns and structures

import fs from 'fs';
import path from 'path';

const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');

// High-value documents likely to contain tables
const SAMPLE_SOURCES = [
    'fleischner_2017__pdf',
    'LI-RADS-CT-MRI-2018-Core__2_',
    'PI-RADS-v2_1-2019',
    'O-RADS-US-v2020-MRI-v2022',
    'lung_rads_v1_1_2022__pdf',
    'disaverio2020',
    'InjuryScoringTables-3',
    'esgar_consensus_rectal_mri_2016',
    'tanaka2017',
    'TNM-Classification-of-Malignant-Tumours-8th-edition'
];

interface TableCandidate {
    source_id: string;
    page: number;
    likely_table: boolean;
    evidence: string[];
    sample_text: string;
}

function detectTablesInDocument(sourceId: string): TableCandidate[] {
    const filePath = path.join(NORMALIZED_DIR, `${sourceId}.json`);

    if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${sourceId}`);
        return [];
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const candidates: TableCandidate[] = [];

    content.pages?.forEach((page: any, idx: number) => {
        const text = page.text || '';
        const evidence: string[] = [];

        // Table detection heuristics
        if (text.match(/Table\s+\d+/i)) {
            evidence.push('Contains "Table N" header');
        }

        if (text.match(/\t.*\t/)) {
            evidence.push('Contains tab-separated values');
        }

        if (text.match(/\|\s*.*\s*\|/)) {
            evidence.push('Contains pipe-separated columns');
        }

        // Count newlines with consistent structure
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        const tabCounts = lines.map((l: string) => (l.match(/\t/g) || []).length);
        const consistentTabs = tabCounts.filter(c => c > 2).length > 3;

        if (consistentTabs) {
            evidence.push('Consistent multi-column structure (3+ tabs)');
        }

        // Column headers
        if (text.match(/(size|diameter|category|recommendation|follow-up|interval)/i)) {
            evidence.push('Contains typical table headers');
        }

        if (evidence.length >= 2) {
            candidates.push({
                source_id: sourceId,
                page: idx + 1,
                likely_table: true,
                evidence,
                sample_text: text.substring(0, 300)
            });
        }
    });

    return candidates;
}

async function main() {
    console.log('\n📊 Analyzing table structures in sample documents...\n');

    const allCandidates: TableCandidate[] = [];

    SAMPLE_SOURCES.forEach(sourceId => {
        console.log(`\n🔍 Analyzing: ${sourceId}`);
        const candidates = detectTablesInDocument(sourceId);

        if (candidates.length > 0) {
            console.log(`   ✅ Found ${candidates.length} table candidate(s)`);
            candidates.slice(0, 2).forEach(c => {
                console.log(`      Page ${c.page}: ${c.evidence.join(', ')}`);
            });
            allCandidates.push(...candidates);
        } else {
            console.log(`   ℹ️  No obvious tables detected`);
        }
    });

    console.log(`\n\n📈 Summary:`);
    console.log(`   Total candidates: ${allCandidates.length}`);
    console.log(`   Documents with tables: ${new Set(allCandidates.map(c => c.source_id)).size}`);
    console.log(`   Average per document: ${(allCandidates.length / SAMPLE_SOURCES.length).toFixed(1)}`);

    // Save detailed analysis
    const outputPath = path.join(process.cwd(), 'data/recommendations/reports/table_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        sample_sources: SAMPLE_SOURCES,
        total_candidates: allCandidates.length,
        candidates: allCandidates
    }, null, 2));

    console.log(`\n✅ Detailed analysis saved to: ${outputPath}\n`);
}

main();

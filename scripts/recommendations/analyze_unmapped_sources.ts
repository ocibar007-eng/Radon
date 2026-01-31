// scripts/recommendations/analyze_unmapped_sources.ts
// Categorize and analyze unmapped sources to guide manual mapping

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const OUTPUT_PATH = path.join(process.cwd(), 'data/recommendations/reports/unmapped_analysis.json');

interface UnmappedSource {
    source_id: string;
    rec_count: number;
    category: string;
    suggested_domain?: string;
    suggested_topic?: string;
}

function categorizeSource(sourceId: string): { category: string; domain?: string; topic?: string } {
    const lower = sourceId.toLowerCase();

    // ACR Appropriateness Criteria
    if (lower.includes('acr_appropriateness') || lower.includes('acs-')) {
        return {
            category: 'acr_guidelines',
            domain: 'General',
            topic: 'ACR Appropriateness Criteria'
        };
    }

    // ESMO Cancer Guidelines
    if (lower.includes('esmo') || lower.includes('endometrial_cancer') || lower.includes('jco')) {
        return {
            category: 'esmo_oncology',
            domain: 'Oncology',
            topic: 'ESMO Guidelines'
        };
    }

    // TNM Staging
    if (lower.includes('tnm') || lower.includes('staging') || lower.includes('cp-lung')) {
        return {
            category: 'tnm_staging',
            domain: 'Oncology',
            topic: 'TNM Staging'
        };
    }

    // EAU Guidelines (Urology)
    if (lower.includes('eau-') || lower.includes('male_infertility') || lower.includes('cpp_unabridged')) {
        return {
            category: 'eau_urology',
            domain: 'Urology',
            topic: 'EAU Guidelines'
        };
    }

    // ESUR Guidelines (Uroradiology)
    if (lower.includes('esur')) {
        return {
            category: 'esur_uroradiology',
            domain: 'Genitourinary',
            topic: 'ESUR Protocols'
        };
    }

    // Gynecology
    if (lower.includes('endometri') || lower.includes('ovarian') || lower.includes('cervix') ||
        lower.includes('pelvic_pain') || lower.includes('adnexal')) {
        return {
            category: 'gynecology',
            domain: 'Gynecology',
            topic: 'Pelvic & Gynecologic'
        };
    }

    // Vascular
    if (lower.includes('vascular') || lower.includes('thrombosis') || lower.includes('aneurysm') ||
        lower.includes('venous') || lower.includes('tev')) {
        return {
            category: 'vascular',
            domain: 'Vascular',
            topic: 'Vascular Disease'
        };
    }

    // GI/Abdomen
    if (lower.includes('mesenteric') || lower.includes('achalasia') || lower.includes('gallbladder') ||
        lower.includes('bowel') || lower.includes('colorectal')) {
        return {
            category: 'gastroenterology',
            domain: 'Abdominal',
            topic: 'GI & Hepatobiliary'
        };
    }

    // Hepatology
    if (lower.includes('hepatic') || lower.includes('liver') || lower.includes('nafld') ||
        lower.includes('steatosis') || lower.includes('iron')) {
        return {
            category: 'hepatology',
            domain: 'Abdominal',
            topic: 'Liver & Hepatobiliary'
        };
    }

    // Trauma/Emergency
    if (lower.includes('injury') || lower.includes('trauma') || lower.includes('acute') ||
        lower.includes('disaverio') || lower.includes('sartelli')) {
        return {
            category: 'emergency_trauma',
            domain: 'Emergency',
            topic: 'Trauma & Acute Abdomen'
        };
    }

    // RCC (Renal Cell Carcinoma)
    if (lower.includes('rcc-') || lower.includes('renal-mass') || lower.includes('renal_mass')) {
        return {
            category: 'renal_cancer',
            domain: 'Genitourinary',
            topic: 'Renal Mass'
        };
    }

    // Generic journal articles
    if (lower.match(/^\d+_\d+_/) || lower.match(/^10_\d+/) || lower.includes('article')) {
        return {
            category: 'journal_articles',
            domain: 'General',
            topic: 'Miscellaneous'
        };
    }

    return { category: 'uncategorized' };
}

async function main() {
    console.log('\n🔍 Analyzing unmapped sources...\n');

    const db = new Database(DB_PATH);

    const unmappedSources = db.prepare(`
    SELECT source_id, COUNT(*) as rec_count
    FROM recommendations
    WHERE dominio IS NULL OR dominio = ''
    GROUP BY source_id
    ORDER BY rec_count DESC
  `).all() as { source_id: string; rec_count: number }[];

    const analysis: Record<string, UnmappedSource[]> = {};
    const categoryCounts: Record<string, number> = {};

    unmappedSources.forEach(source => {
        const { category, domain, topic } = categorizeSource(source.source_id);

        if (!analysis[category]) {
            analysis[category] = [];
            categoryCounts[category] = 0;
        }

        analysis[category].push({
            source_id: source.source_id,
            rec_count: source.rec_count,
            category,
            suggested_domain: domain,
            suggested_topic: topic
        });

        categoryCounts[category] += source.rec_count;
    });

    // Sort categories by recommendation count
    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1]);

    console.log('📊 Unmapped Sources by Category:\n');
    sortedCategories.forEach(([category, count]) => {
        const sources = analysis[category].length;
        console.log(`   ${category}: ${count} recs from ${sources} sources`);
    });

    console.log(`\n   Total unmapped: ${unmappedSources.length} sources`);
    console.log(`   Total recommendations: ${unmappedSources.reduce((sum, s) => sum + s.rec_count, 0)}`);

    // Write detailed analysis
    const output = {
        summary: {
            total_unmapped_sources: unmappedSources.length,
            total_unmapped_recs: unmappedSources.reduce((sum, s) => sum + s.rec_count, 0),
            categories: categoryCounts
        },
        by_category: analysis,
        top_sources: unmappedSources.slice(0, 50)
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\n✅ Analysis saved to: ${OUTPUT_PATH}`);

    // Print actionable insights
    console.log('\n💡 Actionable Insights:\n');
    sortedCategories.slice(0, 5).forEach(([category, count]) => {
        const sources = analysis[category];
        const topSource = sources[0];
        console.log(`   ${category} (${count} recs):`);
        console.log(`     Top source: ${topSource.source_id} (${topSource.rec_count} recs)`);
        if (topSource.suggested_domain) {
            console.log(`     → Suggested: ${topSource.suggested_domain} / ${topSource.suggested_topic}`);
        }
    });

    db.close();
    console.log('\n✨ Analysis complete!\n');
}

main();

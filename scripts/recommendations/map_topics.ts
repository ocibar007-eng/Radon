// scripts/recommendations/map_topics.ts
// Populate domain/topic in recommendations table based on source_id
// Uses coverage_spec.yaml as source of truth + Heuristics for others

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const COVERAGE_SPEC_PATH = path.join(process.cwd(), 'data/recommendations/sources/coverage_spec_v2.yaml');

interface CoverageSpec {
    coverage_domains: Record<string, DomainSpec>;
}
interface DomainSpec {
    topics: Record<string, TopicSpec>;
}
interface TopicSpec {
    must_have_sources: string[];
}

function main() {
    console.log('🗺️  Mapping topics and domains to recommendations...');

    const db = new Database(DB_PATH);
    const specContent = fs.readFileSync(COVERAGE_SPEC_PATH, 'utf-8');
    const spec = yaml.parse(specContent) as CoverageSpec;

    // Build reverse map: source_id -> { domain, topic }
    const sourceMap = new Map<string, { domain: string, topic: string }>();

    for (const [domainName, domainSpec] of Object.entries(spec.coverage_domains)) {
        for (const [topicName, topicSpec] of Object.entries(domainSpec.topics)) {
            if (topicSpec.must_have_sources) {
                for (const sourceId of topicSpec.must_have_sources) {
                    sourceMap.set(sourceId, { domain: domainName, topic: topicName });
                }
            }
        }
    }

    console.log(`   Found ${sourceMap.size} mapped sources in spec.`);

    // Update recommendations
    const updateStmt = db.prepare(`
    UPDATE recommendations 
    SET dominio = ?, topico = ?
    WHERE source_id = ?
  `);

    let updated = 0;
    let unknown = 0;

    const sources = db.prepare('SELECT DISTINCT source_id FROM recommendations').all() as { source_id: string }[];

    db.transaction(() => {
        for (const { source_id } of sources) {
            let domain = '';
            let topic = '';

            // 1. Try explicit mapping from spec
            const mapping = sourceMap.get(source_id);
            if (mapping) {
                domain = mapping.domain;
                topic = mapping.topic;
            }
            // 2. Try heuristics
            else {
                const lower = source_id.toLowerCase();
                if (lower.includes('lirads') || lower.includes('li-rads')) { domain = 'Abdominal'; topic = 'LI-RADS'; }
                else if (lower.includes('orads') || lower.includes('o-rads')) { domain = 'Gynecology'; topic = 'O-RADS'; }
                else if (lower.includes('pirads') || lower.includes('pi-rads')) { domain = 'Genitourinary'; topic = 'PI-RADS'; }
                else if (lower.includes('lung-rads') || lower.includes('lungrads')) { domain = 'Thoracic'; topic = 'Lung-RADS'; }
                else if (lower.includes('ti-rads') || lower.includes('thyroid')) { domain = 'HeadNeck'; topic = 'TI-RADS'; }
                else if (lower.includes('bosniak')) { domain = 'Genitourinary'; topic = 'Bosniak'; }
                else if (lower.includes('recist')) { domain = 'Oncology'; topic = 'RECIST'; }
                else if (lower.includes('fleischner')) { domain = 'Thoracic'; topic = 'Nodules'; }
                else if (lower.includes('liver')) { domain = 'Abdominal'; topic = 'Liver'; }
                else if (lower.includes('prostate')) { domain = 'Genitourinary'; topic = 'Prostate'; }
                else if (lower.includes('renal') || lower.includes('kidney')) { domain = 'Genitourinary'; topic = 'Renal'; }
                else if (lower.includes('adrenal')) { domain = 'Abdominal'; topic = 'Adrenal'; }
                else if (lower.includes('pancreas') || lower.includes('pancreatic')) { domain = 'Abdominal'; topic = 'Pancreas'; }
                else if (lower.includes('hernia')) { domain = 'Abdominal'; topic = 'Hernia'; }
                else if (lower.includes('trauma')) { domain = 'Emergency'; topic = 'Trauma'; }
                else if (lower.includes('radiology')) { domain = 'General'; topic = 'Radiology'; }
            }

            if (domain && topic) {
                updateStmt.run(domain, topic, source_id);
                updated++;
            } else {
                unknown++;
            }
        }
    })();

    console.log(`✅ Mapped ${updated} sources.`);
    console.log(`⚠️  ${unknown} sources unmapped (generic).`);

    db.close();
}

main();

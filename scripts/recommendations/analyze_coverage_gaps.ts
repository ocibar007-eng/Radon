// scripts/recommendations/analyze_coverage_gaps.ts
// Compare DB sources with Coverage Spec to find unmapped topics

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const SPEC_PATH = path.join(process.cwd(), 'data/recommendations/sources/coverage_spec.yaml');

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
    const db = new Database(DB_PATH, { readonly: true }); // Read-only to avoid lock contention

    // Load Spec
    const spec = yaml.parse(fs.readFileSync(SPEC_PATH, 'utf-8')) as CoverageSpec;
    const mappedSources = new Set<string>();

    for (const [domain, dSpec] of Object.entries(spec.coverage_domains)) {
        for (const [topic, tSpec] of Object.entries(dSpec.topics)) {
            tSpec.must_have_sources?.forEach(s => mappedSources.add(s));
        }
    }

    // Load DB Sources
    const sources = db.prepare('SELECT source_id FROM sources').all() as { source_id: string }[];

    const unmapped = sources.filter(s => !mappedSources.has(s.source_id));

    console.log(`\n📊 Coverage Analysis:`);
    console.log(`   Total DB Sources: ${sources.length}`);
    console.log(`   Mapped in Spec: ${mappedSources.size}`);
    console.log(`   Unmapped/New: ${unmapped.length}\n`);

    if (unmapped.length > 0) {
        console.log('⚠️  Unmapped Sources (will result in blank domain/topic):');
        unmapped.forEach(s => console.log(`   - ${s.source_id}`));
        console.log('\n💡 Suggestion: Update coverage_spec.yaml or map these to existing topics.');
    }

    db.close();
}

main();

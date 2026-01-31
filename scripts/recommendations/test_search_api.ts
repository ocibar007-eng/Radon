// scripts/recommendations/test_search_api.ts
// Test script for recommendation search API

import 'dotenv/config';
import { searchRecommendations, getStats, getAvailableDomains } from '../../api/recommendations/search';

console.log('\n🔍 Testing Recommendation Search API\n');

// 1. Get stats
console.log('📊 Database Statistics:');
const stats = getStats();
console.log(`   Total recommendations: ${stats.total}`);
console.log(`   Mapped: ${stats.mapped} (${((stats.mapped / stats.total) * 100).toFixed(1)}%)`);
console.log(`   Unmapped: ${stats.unmapped}`);
console.log(`\n   By Domain:`);
stats.byDomain.slice(0, 5).forEach(d => {
    console.log(`   - ${d.dominio}: ${d.count}`);
});
console.log(`\n   By Type:`);
stats.byType.slice(0, 5).forEach(t => {
    console.log(`   - ${t.rec_type}: ${t.count}`);
});

// 2. Get available domains
console.log('\n\n🗂️  Available Domains:');
const domains = getAvailableDomains();
console.log(`   ${domains.join(', ')}`);

// 3. Search by domain
console.log('\n\n🔎 Search Test 1: Genitourinary domain');
const result1 = searchRecommendations({ domain: 'Genitourinary', limit: 3 });
console.log(`   Found ${result1.total} recommendations`);
result1.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. [${rec.topico}] ${rec.achado} → ${rec.acao_then.substring(0, 80)}...`);
});

// 4. Search by topic
console.log('\n\n🔎 Search Test 2: PI-RADS topic');
const result2 = searchRecommendations({ topic: 'PI-RADS', limit: 3 });
console.log(`   Found ${result2.total} recommendations`);
result2.recommendations.forEach((rec, i) => {
    const context = rec.condicao_if || rec.achado || 'N/A';
    console.log(`   ${i + 1}. ${context.substring(0, 100)}...`);
});

// 5. Full-text search
console.log('\n\n🔎 Search Test 3: Full-text "nodule" query');
const result3 = searchRecommendations({ query: 'nodule', limit: 5 });
console.log(`   Found ${result3.total} recommendations`);
result3.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. [${rec.source_id}] ${rec.acao_then.substring(0, 80)}...`);
});

// 6. Combined filters
console.log('\n\n🔎 Search Test 4: Abdominal + high confidence (>0.8)');
const result4 = searchRecommendations({ domain: 'Abdominal', min_confidence: 0.8, limit: 3 });
console.log(`   Found ${result4.total} recommendations`);
result4.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. [conf: ${rec.confidence}] ${rec.achado} - ${rec.acao_then.substring(0, 60)}...`);
});

console.log('\n✅ API testing complete!\n');

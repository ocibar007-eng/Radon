/**
 * Test script for Recommendations Query API
 */

import { queryRecommendations, queryPulmonaryNodule } from '../../services/recommendations/query_api';

console.log('🧪 Testing Recommendations Query API\n');
console.log('='.repeat(60));

// Test 1: Pulmonary Nodule (Fleischner)
console.log('\n📋 Test 1: Nódulo pulmonar sólido 8mm, baixo risco\n');

const result1 = queryPulmonaryNodule(8, "solid", "single", "low");

console.log(`Success: ${result1.success}`);
console.log(`Results found: ${result1.results.length}`);
console.log(`Warnings: ${result1.warnings.join(', ') || 'None'}`);
console.log(`Missing inputs: ${result1.missing_inputs.join(', ') || 'None'}`);

if (result1.results.length > 0) {
    const top = result1.results[0];
    console.log(`\nTop result:`);
    console.log(`  Guideline: ${top.guideline_id}`);
    console.log(`  Recommendation: ${top.recommendation_text.substring(0, 150)}...`);
    console.log(`  Citation: ${top.citation}`);
    console.log(`  Match score: ${top.match_score.toFixed(2)}`);
}

// Test 2: Generic query for hepatic lesion
console.log('\n' + '='.repeat(60));
console.log('\n📋 Test 2: Lesão hepática (LI-RADS)\n');

const result2 = queryRecommendations({
    finding_type: "hepatic_lesion",
    size_mm: 20,
    context: "incidental"
});

console.log(`Success: ${result2.success}`);
console.log(`Results found: ${result2.results.length}`);

if (result2.results.length > 0) {
    console.log(`\nTop 3 results:`);
    result2.results.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.guideline_id} (score: ${r.match_score.toFixed(2)})`);
    });
}

// Test 3: Query with missing data (should warn)
console.log('\n' + '='.repeat(60));
console.log('\n📋 Test 3: Query sem informação de risco (deve avisar)\n');

const result3 = queryRecommendations({
    finding_type: "pulmonary_nodule",
    size_mm: 6
    // risk_category missing intentionally
});

console.log(`Warnings: ${result3.warnings.join(', ')}`);
console.log(`Missing inputs: ${result3.missing_inputs.join(', ')}`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ API test complete');

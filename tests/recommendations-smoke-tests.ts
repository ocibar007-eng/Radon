/**
 * Smoke Tests for Recommendations Integration
 * 
 * Validates the acceptance checklist from Manager AI:
 * 1. Anti-hallucination rules
 * 2. Content vs citation separation
 * 3. Clean references
 * 4. Pipeline compatibility
 */

import { runRecommendationsAgent, AgentContext, ReportJSON } from '../src/core/reportGeneration/agents/recommendations';
import { validateRecommendations } from '../src/core/reportGeneration/recommendations-guard';

// ============================================================================
// TEST 1: Case with no recommendation (unknown finding type)
// ============================================================================
async function testNoRecommendation() {
    console.log('\n🧪 TEST 1: Case with no recommendation');
    console.log('='.repeat(60));

    const ctx: AgentContext = {
        patient_age: 45,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Finding that doesn't match any pattern
    const report: any = {
        findings: [
            { label: 'achado genérico não mapeado', organ: 'desconhecido' }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    // Validate
    const hasRecs = (result.recommendations?.length || 0) > 0;
    const hasRefs = (result.references?.length || 0) > 0;

    console.log(`   evidence_recommendations: ${result.recommendations?.length || 0}`);
    console.log(`   references: ${result.references?.length || 0}`);

    // Check: generic text without numbers
    if (hasRecs) {
        const rec = result.recommendations![0];
        const hasNumbers = /\d+\s*(mm|cm|meses?|months?|anos?|years?|%)/i.test(rec.text);
        console.log(`   ✅ Generic text: "${rec.text.substring(0, 80)}..."`);
        console.log(`   ${hasNumbers ? '❌ FAIL: Contains numeric pattern!' : '✅ PASS: No numeric pattern'}`);
    }

    console.log('   ✅ TEST 1 Complete\n');
}

// ============================================================================
// TEST 2: Case with missing_inputs (conditional recommendation)
// ============================================================================
async function testMissingInputs() {
    console.log('\n🧪 TEST 2: Case with missing inputs (conditional)');
    console.log('='.repeat(60));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'unknown', // Missing required input!
        immunosuppressed: false,
        oncologic_context: false
    };

    const report: any = {
        findings: [
            {
                label: 'nódulo pulmonar sólido 8mm',
                organ: 'pulmão',
                size_mm: 8,
                morphology: 'solid'
            }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    console.log(`   evidence_recommendations: ${result.recommendations?.length || 0}`);

    if (result.recommendations?.length) {
        const rec = result.recommendations[0];
        console.log(`   conditional: ${rec.conditional}`);
        console.log(`   text: "${rec.text.substring(0, 100)}..."`);
        console.log(`   ${rec.conditional ? '✅ PASS: Marked as conditional' : '❌ FAIL: Should be conditional!'}`);

        // Check for "risco" mention in conditional text
        const mentionsRisk = rec.text.toLowerCase().includes('risco') || rec.text.toLowerCase().includes('depende');
        console.log(`   ${mentionsRisk ? '✅ PASS: Mentions risk dependency' : '⚠️ Should mention dependency'}`);
    }

    console.log('   ✅ TEST 2 Complete\n');
}

// ============================================================================
// TEST 3: Classic case with numeric recommendation
// ============================================================================
async function testNumericRecommendation() {
    console.log('\n🧪 TEST 3: Classic case with numeric recommendation');
    console.log('='.repeat(60));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    const report: any = {
        findings: [
            {
                label: 'nódulo pulmonar sólido 8mm',
                organ: 'pulmão',
                size_mm: 8,
                morphology: 'solid',
                count: 'single'
            }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    console.log(`   evidence_recommendations: ${result.recommendations?.length || 0}`);
    console.log(`   references: ${result.references?.length || 0}`);

    if (result.recommendations?.length) {
        const rec = result.recommendations[0];
        console.log(`   guideline_id: ${rec.guideline_id}`);
        console.log(`   text: "${rec.text}"`);
        console.log(`   conditional: ${rec.conditional}`);

        // Validate with Guard
        const guardResult = validateRecommendations(result.recommendations, new Map());
        console.log(`   guard.valid: ${guardResult.valid}`);
        console.log(`   guard.violations: ${guardResult.violations.length}`);
    }

    if (result.references?.length) {
        console.log(`   citation: "${result.references[0].citation}"`);
    }

    console.log('   ✅ TEST 3 Complete\n');
}

// ============================================================================
// TEST 4: Multiple findings → same guideline (deduplication)
// ============================================================================
async function testDeduplication() {
    console.log('\n🧪 TEST 4: Multiple findings → same guideline (deduplication)');
    console.log('='.repeat(60));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    const report: any = {
        findings: [
            { label: 'nódulo pulmonar sólido 6mm', size_mm: 6, morphology: 'solid' },
            { label: 'nódulo pulmonar sólido 8mm', size_mm: 8, morphology: 'solid' }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    const recsCount = result.recommendations?.length || 0;
    const refsCount = result.references?.length || 0;

    console.log(`   evidence_recommendations: ${recsCount}`);
    console.log(`   references: ${refsCount}`);

    // Both findings should generate recommendations
    console.log(`   ${recsCount >= 2 ? '✅ PASS: Multiple recommendations' : '⚠️ Expected 2+ recommendations'}`);

    // But references should be deduplicated (same Fleischner guideline)
    console.log(`   ${refsCount === 1 ? '✅ PASS: References deduplicated' : `⚠️ Expected 1 reference, got ${refsCount}`}`);

    console.log('   ✅ TEST 4 Complete\n');
}

// ============================================================================
// TEST 5: Pipeline compatibility (empty recommendations)
// ============================================================================
async function testEmptyRecommendations() {
    console.log('\n🧪 TEST 5: Pipeline compatibility (empty recommendations)');
    console.log('='.repeat(60));

    const ctx: AgentContext = {
        patient_age: 45,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Report with no findings
    const report: any = {
        findings: []
    };

    const result = await runRecommendationsAgent(ctx, report);

    const recsEmpty = !result.recommendations?.length;
    const refsEmpty = !result.references?.length;

    console.log(`   evidence_recommendations empty: ${recsEmpty}`);
    console.log(`   references empty: ${refsEmpty}`);
    console.log(`   ${recsEmpty && refsEmpty ? '✅ PASS: Both empty as expected' : '❌ FAIL: Should be empty'}`);

    // Check that existing report fields are preserved
    const hasFindings = Array.isArray(result.findings);
    console.log(`   findings preserved: ${hasFindings}`);

    console.log('   ✅ TEST 5 Complete\n');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('   RECOMMENDATIONS INTEGRATION SMOKE TESTS');
    console.log('='.repeat(70));

    try {
        await testNoRecommendation();
        await testMissingInputs();
        await testNumericRecommendation();
        await testDeduplication();
        await testEmptyRecommendations();

        console.log('\n' + '='.repeat(70));
        console.log('   ALL SMOKE TESTS COMPLETE');
        console.log('='.repeat(70) + '\n');
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

runAllTests();

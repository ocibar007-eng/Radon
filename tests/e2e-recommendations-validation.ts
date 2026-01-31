/**
 * E2E Validation Tests - Real Case Scenarios
 * 
 * Tests the 3 critical scenarios identified by Manager AI:
 * 1. Case that doesn't match library (no recommendation)
 * 2. Case with missing_inputs (conditional recommendation)
 * 3. Classic case with numeric follow-up
 * 
 * Run: npx tsx tests/e2e-recommendations-validation.ts
 */

import { runRecommendationsAgent, AgentContext, ReportJSON, RecommendationEntry, ReferenceEntry } from '../src/core/reportGeneration/agents/recommendations';
import { validateRecommendations } from '../src/core/reportGeneration/recommendations-guard';

// ============================================================================
// OBSERVABILITY COUNTERS
// ============================================================================
const METRICS = {
    total_queries: 0,
    success_true: 0,
    with_missing_inputs: 0,
    guard_sanitized: 0,
    finding_patterns_used: new Map<string, number>()
};

function recordMetric(pattern: string, success: boolean, hasMissing: boolean, wasSanitized: boolean) {
    METRICS.total_queries++;
    if (success) METRICS.success_true++;
    if (hasMissing) METRICS.with_missing_inputs++;
    if (wasSanitized) METRICS.guard_sanitized++;
    METRICS.finding_patterns_used.set(pattern, (METRICS.finding_patterns_used.get(pattern) || 0) + 1);
}

function printMetrics() {
    console.log('\n📊 OBSERVABILITY METRICS');
    console.log('='.repeat(60));
    console.log(`   Total queries: ${METRICS.total_queries}`);
    console.log(`   Success rate: ${((METRICS.success_true / METRICS.total_queries) * 100).toFixed(1)}%`);
    console.log(`   With missing inputs: ${((METRICS.with_missing_inputs / METRICS.total_queries) * 100).toFixed(1)}%`);
    console.log(`   Guard sanitized: ${((METRICS.guard_sanitized / METRICS.total_queries) * 100).toFixed(1)}%`);
    console.log('\n   Top finding patterns:');
    const sorted = [...METRICS.finding_patterns_used.entries()].sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 10).forEach(([pattern, count], i) => {
        console.log(`   ${i + 1}. ${pattern}: ${count}`);
    });
}

// ============================================================================
// TEST CASE 1: NO RECOMMENDATION (não bate na biblioteca)
// ============================================================================
async function testCase1_NoRecommendation(): Promise<{ passed: boolean; output: string }> {
    console.log('\n' + '='.repeat(70));
    console.log('📋 CASE 1: Achado genérico que NÃO retorna recomendação');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Caso real: descrição genérica de achado normal
    const report: any = {
        case_id: 'TEST-001',
        modality: 'CT',
        findings: [
            {
                organ: 'Fígado',
                description: 'Parênquima hepático de dimensões, contornos e atenuação preservados.',
                label: 'Parênquima hepático de dimensões preservados'
            },
            {
                organ: 'Baço',
                description: 'Baço de dimensões e morfologia normais.',
                label: 'Baço de dimensões normais'
            }
        ],
        indication: {
            clinical_history: 'Dor abdominal inespecífica',
            exam_reason: 'Investigação',
            patient_age_group: 'adulto 55 anos',
            patient_sex: 'M'
        }
    };

    const result = await runRecommendationsAgent(ctx, report);
    recordMetric('generic_normal', false, false, false);

    // VALIDAÇÃO
    const recsWithContent = (result.recommendations || []).filter(r =>
        r.guideline_id && r.text.includes('meses')
    );
    const hasRefs = (result.references || []).length > 0;

    const passed = recsWithContent.length === 0 && !hasRefs;

    console.log(`\n   Recommendations with guidelines: ${recsWithContent.length}`);
    console.log(`   References: ${(result.references || []).length}`);
    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}: Sem recomendação numérica, sem referências`);

    // Golden output
    const output = generateGoldenOutput(result, 'Caso Normal - Sem Recomendações');

    return { passed, output };
}

// ============================================================================
// TEST CASE 2: MISSING INPUTS (recomendação condicional)
// ============================================================================
async function testCase2_MissingInputs(): Promise<{ passed: boolean; output: string }> {
    console.log('\n' + '='.repeat(70));
    console.log('📋 CASE 2: Nódulo pulmonar SEM informação de risco');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 62,
        risk_category: 'unknown', // MISSING!
        immunosuppressed: false,
        oncologic_context: false
    };

    // Caso real: nódulo pulmonar detectado mas sem histórico de tabagismo/risco
    const report: any = {
        case_id: 'TEST-002',
        modality: 'CT',
        findings: [
            {
                organ: 'Pulmão',
                description: 'Nódulo pulmonar sólido em lobo inferior direito, medindo 7mm.',
                label: 'Nódulo pulmonar sólido 7mm',
                size_mm: 7,
                morphology: 'solid',
                count: 'single'
            }
        ],
        indication: {
            clinical_history: 'Check-up de rotina. Paciente sem queixas.',
            exam_reason: 'Avaliação pulmonar',
            patient_age_group: 'adulto 62 anos',
            patient_sex: 'M'
        }
    };

    const result = await runRecommendationsAgent(ctx, report);

    // Verificar se temos recomendação condicional
    const conditionalRecs = (result.recommendations || []).filter(r => r.conditional);
    const hasRiskMention = conditionalRecs.some(r =>
        r.text.toLowerCase().includes('risco') || r.text.toLowerCase().includes('depende')
    );

    recordMetric('pulmonary_nodule', true, true, false);

    const passed = conditionalRecs.length > 0 && hasRiskMention;

    console.log(`\n   Conditional recommendations: ${conditionalRecs.length}`);
    console.log(`   Mentions risk dependency: ${hasRiskMention}`);
    if (conditionalRecs.length > 0) {
        console.log(`   Text: "${conditionalRecs[0].text.substring(0, 100)}..."`);
    }
    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}: Recomendação condicional sem chutar risco`);

    const output = generateGoldenOutput(result, 'Caso Pulmonar - Risco Desconhecido');

    return { passed, output };
}

// ============================================================================
// TEST CASE 3: CLASSIC WITH NUMBERS (recomendação com follow-up numérico)
// ============================================================================
async function testCase3_NumericRecommendation(): Promise<{ passed: boolean; output: string }> {
    console.log('\n' + '='.repeat(70));
    console.log('📋 CASE 3: Nódulo pulmonar 4mm (Happy Path <= 4mm)');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 58,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    const findingSizeMm = 4; // <=== KEY: 4mm match the common Fleischner row

    // Log QueryParams for debugging
    console.log(`\n   📋 QueryParams:`);
    console.log(`      finding_type: pulmonary_nodule`);
    console.log(`      size_mm: ${findingSizeMm}`);
    console.log(`      risk_category: ${ctx.risk_category}`);
    console.log(`      patient_age: ${ctx.patient_age}`);

    // Caso real: nódulo pulmonar incidental em paciente baixo risco
    const report: any = {
        case_id: 'TEST-003',
        modality: 'CT',
        findings: [
            {
                organ: 'Pulmão',
                description: `Nódulo pulmonar sólido em lobo superior esquerdo, medindo ${findingSizeMm}mm, de contornos regulares.`,
                label: `Nódulo pulmonar sólido ${findingSizeMm}mm`,
                size_mm: findingSizeMm,
                morphology: 'solid',
                count: 'single'
            }
        ],
        indication: {
            clinical_history: 'Paciente masculino, 58 anos, não tabagista. TC de rotina pré-operatória.',
            exam_reason: 'Avaliação pulmonar pré-cirúrgica',
            patient_age_group: 'adulto 58 anos',
            patient_sex: 'M'
        }
    };

    const result = await runRecommendationsAgent(ctx, report);

    // Verificar números e referências
    const numericRecs = (result.recommendations || []).filter(r =>
        /\d+\s*(mm|meses?|months?)/i.test(r.text)
    );
    const hasGuidelineRef = numericRecs.some(r => r.guideline_id);
    const hasReferences = (result.references || []).length > 0;

    // Validate with Guard
    const libraryPayloads = (result as any)._libraryPayloads || new Map();
    const guardResult = validateRecommendations(result.recommendations || [], libraryPayloads);

    // VERIFY PAYLOADS EXIST
    if ((result.recommendations || []).length > 0 && libraryPayloads.size === 0) {
        console.warn('      ⚠️ WARNING: Recommendations found but NO payloads tracked for Guard!');
    } else if (libraryPayloads.size > 0) {
        console.log(`      ✅ Guard using ${libraryPayloads.size} real payloads for validation`);
    }

    const wasSanitized = !guardResult.valid;

    recordMetric('pulmonary_nodule', true, false, wasSanitized);

    // Check: numbers should come from library (not invented) AND size must match
    const passed = numericRecs.length > 0 && hasGuidelineRef && hasReferences && guardResult.valid;

    console.log(`\n   Numeric recommendations: ${numericRecs.length}`);
    console.log(`   Has guideline reference: ${hasGuidelineRef}`);
    console.log(`   References in output: ${(result.references || []).length}`);
    console.log(`   Guard valid: ${guardResult.valid}`);
    if (numericRecs.length > 0) {
        console.log(`   Guideline: ${numericRecs[0].guideline_id}`);
        console.log(`   Text: "${numericRecs[0].text}"`);
    }
    if (hasReferences) {
        console.log(`   Citation: "${result.references![0].citation}"`);
    }
    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}: Happy path 4mm matched correctly`);

    const output = generateGoldenOutput(result, 'Caso Pulmonar - 4mm Fleischner');

    return { passed, output };
}

// ============================================================================
// TEST CASE 4: SIZE MISMATCH SAFETY (8mm finding vs potentially wrong recs)
// ============================================================================
async function testCase4_SizeMismatchSafety(): Promise<{ passed: boolean; output: string }> {
    console.log('\n' + '='.repeat(70));
    console.log('📋 CASE 4: Safety Check - Nódulo 8mm (Prevent <=4mm rec)');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 65,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    const findingSizeMm = 8; // 8mm finding

    const report: any = {
        case_id: 'TEST-004',
        modality: 'CT',
        findings: [
            {
                organ: 'Pulmão',
                description: `Nódulo pulmonar sólido medindo ${findingSizeMm}mm.`,
                label: `Nódulo pulmonar sólido ${findingSizeMm}mm`,
                size_mm: findingSizeMm,
                morphology: 'solid',
                count: 'single'
            }
        ],
        indication: {
            clinical_history: 'Check-up.',
            exam_reason: 'Rotina',
            patient_age_group: 'adulto',
            patient_sex: 'F'
        }
    };

    const result = await runRecommendationsAgent(ctx, report);

    // Analyse output
    let dangerousMismatch = false;
    let mismatchDetails = '';

    for (const rec of (result.recommendations || [])) {
        const recText = rec.text.toLowerCase();

        // Critical check: Ensure we NEVER output "<= 4 mm" logic for an 8mm nodule
        const sizeLessEqual = recText.match(/<=?\s*(\d+)\s*mm/);
        if (sizeLessEqual) {
            const maxSize = parseInt(sizeLessEqual[1], 10);
            if (findingSizeMm > maxSize) {
                dangerousMismatch = true;
                mismatchDetails = `Finding ${findingSizeMm}mm > rec max ${maxSize}mm`;
            }
        }
    }

    const hasRecommendations = (result.recommendations || []).length > 0;
    const isConditional = (result.recommendations || []).some(r => r.conditional);

    // Pass conditions:
    // 1. No dangerous mismatch
    // 2. Either no recommendation (safe fallback) OR a correct one (if DB has it)
    const passed = !dangerousMismatch;

    console.log(`\n   Recommendations: ${(result.recommendations || []).length}`);
    console.log(`   Dangerous mismatch: ${dangerousMismatch} ${dangerousMismatch ? `(${mismatchDetails})` : ''}`);
    if (hasRecommendations) {
        console.log(`   Text: "${result.recommendations![0].text}"`);
    }

    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}: Safety check (no size mismatch)`);

    const output = generateGoldenOutput(result, 'Caso Pulmonar - 8mm Safety Check');
    return { passed, output };
}

// ============================================================================
// GOLDEN OUTPUT GENERATOR
// ============================================================================
function generateGoldenOutput(result: any, title: string): string {
    const lines: string[] = [];

    lines.push(`# Golden Output: ${title}`);
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Recommendations section (would be in Impressão)
    lines.push('## IMPRESSÃO');
    lines.push('');
    if (result.evidence_recommendations?.length || result.recommendations?.length) {
        const recs = result.evidence_recommendations || result.recommendations;
        recs.forEach((rec: RecommendationEntry) => {
            const conditional = rec.conditional ? ' *(condicional)*' : '';
            lines.push(`► ${rec.text}${conditional}`);
            lines.push('');
        });
    } else {
        lines.push('► Exame sem alterações significativas.');
        lines.push('');
    }

    // References section
    if (result.references?.length) {
        lines.push('---');
        lines.push('');
        lines.push('## REFERÊNCIAS');
        lines.push('');
        result.references.forEach((ref: ReferenceEntry, i: number) => {
            lines.push(`${i + 1}. ${ref.citation}`);
        });
    }

    return lines.join('\n');
}

// ============================================================================
// PIPELINE INTEGRITY CHECK
// ============================================================================
async function testPipelineIntegrity() {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 PIPELINE INTEGRITY CHECK');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 45,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Report with no matching findings
    const report: any = {
        case_id: 'INTEGRITY-001',
        modality: 'MR',
        findings: [],
        indication: { clinical_history: 'Test', exam_reason: 'Test', patient_age_group: 'adulto', patient_sex: 'M' }
    };

    const result = await runRecommendationsAgent(ctx, report);

    // Check that original fields are preserved
    const integrityChecks = {
        case_id_preserved: result.case_id === 'INTEGRITY-001',
        modality_preserved: result.modality === 'MR',
        findings_array_exists: Array.isArray(result.findings),
        indication_preserved: !!result.indication,
        recommendations_empty: (result.recommendations?.length || 0) === 0,
        references_empty: (result.references?.length || 0) === 0
    };

    const allPassed = Object.values(integrityChecks).every(v => v);

    console.log('\n   Integrity checks:');
    Object.entries(integrityChecks).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    console.log(`\n   ${allPassed ? '✅ PASSED' : '❌ FAILED'}: Pipeline integrity maintained`);

    return allPassed;
}

// ============================================================================
// MAIN
// ============================================================================
async function runE2EValidation() {
    console.log('\n' + '█'.repeat(70));
    console.log('   E2E VALIDATION - RECOMMENDATIONS INTEGRATION');
    console.log('█'.repeat(70));

    const results: { name: string; passed: boolean; output?: string }[] = [];

    try {
        // Test cases
        const case1 = await testCase1_NoRecommendation();
        results.push({ name: 'Case 1: No Recommendation', ...case1 });

        const case2 = await testCase2_MissingInputs();
        results.push({ name: 'Case 2: Missing Inputs', ...case2 });

        const case3 = await testCase3_NumericRecommendation();
        results.push({ name: 'Case 3: Numeric Follow-up (4mm)', ...case3 });

        const case4 = await testCase4_SizeMismatchSafety();
        results.push({ name: 'Case 4: Size Mismatch Safety (8mm)', ...case4 });

        // Pipeline integrity
        const integrityPassed = await testPipelineIntegrity();
        results.push({ name: 'Pipeline Integrity', passed: integrityPassed });

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 SUMMARY');
        console.log('='.repeat(70));

        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;

        results.forEach(r => {
            console.log(`   ${r.passed ? '✅' : '❌'} ${r.name}`);
        });

        console.log(`\n   Result: ${passedCount}/${totalCount} tests passed`);

        // Metrics
        printMetrics();

        // Golden outputs
        console.log('\n' + '='.repeat(70));
        console.log('📝 GOLDEN OUTPUTS');
        console.log('='.repeat(70));

        results.filter(r => r.output).forEach(r => {
            console.log(`\n--- ${r.name} ---`);
            console.log(r.output);
        });

        // Exit code
        process.exit(passedCount === totalCount ? 0 : 1);

    } catch (error) {
        console.error('\n❌ E2E VALIDATION FAILED:', error);
        process.exit(1);
    }
}

runE2EValidation();

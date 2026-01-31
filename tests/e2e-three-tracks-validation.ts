/**
 * E2E Tests for 3-Track Recommendations System
 *
 * Validates:
 * - TRILHA 1: LAUDO (somente biblioteca + aplicável)
 * - TRILHA 2: CONSULTA (web evidence permitida, NÃO entra no laudo)
 * - TRILHA 3: CURADORIA (candidatos para staging)
 *
 * REGRA-MÃE: Recomendação só entra no LAUDO se vier da biblioteca e for aplicável.
 * Web evidence NUNCA entra no laudo.
 */

import { runRecommendationsAgent, type AgentContext } from '../src/core/reportGeneration/agents/recommendations';
import { validateRecommendations } from '../src/core/reportGeneration/recommendations-guard';
import type { ReportJSON } from '../src/types/report-json';

// ============================================================================
// CASO 1: Match Aplicável (biblioteca) → entra no laudo + referência
// ============================================================================
async function testCase1_LibraryMatchApplicable() {
    console.log('\n🧪 CASO 1: Match Aplicável (Biblioteca)');
    console.log('='.repeat(70));
    console.log('Esperado:');
    console.log('  - TRILHA 1 (LAUDO): Recomendação da biblioteca + referência');
    console.log('  - TRILHA 2 (CONSULTA): Vazio ou opcional');
    console.log('  - TRILHA 3 (CURADORIA): Vazio');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    const report: any = {
        case_id: "TEST_PULM_001",
        findings: [
            {
                label: 'Nódulo sólido pulmonar no lobo superior direito medindo 8 mm.',
                organ: 'pulmão',
                size_mm: 8,
                morphology: 'solid',
                count: 'single'
            }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    // === VALIDAÇÃO TRILHA 1: LAUDO ===
    console.log('\n📋 TRILHA 1: LAUDO (evidence_recommendations)');
    console.log(`   Quantidade: ${result.recommendations?.length || 0}`);

    if (result.recommendations && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        console.log(`   ✅ finding_type: ${rec.finding_type}`);
        console.log(`   ✅ conditional: ${rec.conditional}`);
        console.log(`   ✅ guideline_id: ${rec.guideline_id || 'N/A'}`);
        console.log(`   ✅ text: "${rec.text}"`);

        // Validate with Guard
        const libraryPayloads = (result as any)._libraryPayloads || new Map();
        const guardResult = validateRecommendations(result.recommendations, libraryPayloads);

        console.log(`   🛡️  Guard valid: ${guardResult.valid ? '✅' : '❌'}`);
        console.log(`   🛡️  Guard violations: ${guardResult.violations.length}`);

        if (guardResult.violations.length > 0) {
            guardResult.violations.forEach(v => console.log(`      ⚠️  ${v}`));
        }

        // Check: não deve ser condicional se match perfeito
        if (!rec.conditional) {
            console.log('   ✅ PASS: Não condicional (match perfeito)');
        } else {
            console.log('   ⚠️  WARNING: Condicional quando era esperado match perfeito');
        }
    } else {
        console.log('   ❌ FAIL: Esperado pelo menos 1 recomendação');
    }

    console.log('\n📚 REFERÊNCIAS');
    console.log(`   Quantidade: ${result.references?.length || 0}`);
    if (result.references && result.references.length > 0) {
        result.references.forEach((ref, idx) => {
            console.log(`   [${idx + 1}] ${ref.key}: ${ref.citation}`);
        });
        console.log('   ✅ PASS: Referências presentes');
    } else {
        console.log('   ⚠️  WARNING: Esperado referências da biblioteca');
    }

    // === VALIDAÇÃO TRILHA 2: CONSULTA ===
    console.log('\n🩺 TRILHA 2: CONSULTA (consult_assist)');
    console.log(`   Quantidade: ${result.consult_assist?.length || 0}`);

    if (result.consult_assist && result.consult_assist.length > 0) {
        console.log('   ℹ️  Consult assist presente (opcional quando biblioteca tem match)');
        result.consult_assist.forEach((ca, idx) => {
            console.log(`   [${idx + 1}] ${ca.title}`);
            console.log(`       - Sources: ${ca.sources.length}`);
            console.log(`       - Quality: ${ca.evidence_quality}`);
        });
    } else {
        console.log('   ✅ Vazio (esperado quando biblioteca tem match perfeito)');
    }

    // === VALIDAÇÃO TRILHA 3: CURADORIA ===
    console.log('\n📥 TRILHA 3: CURADORIA (library_ingestion_candidates)');
    console.log(`   Quantidade: ${result.library_ingestion_candidates?.length || 0}`);

    if (result.library_ingestion_candidates && result.library_ingestion_candidates.length > 0) {
        console.log('   ℹ️  Candidatos presentes (inesperado quando biblioteca já tem match)');
    } else {
        console.log('   ✅ Vazio (esperado quando biblioteca já tem match)');
    }

    console.log('\n✅ CASO 1 Complete\n');
    return result;
}

// ============================================================================
// CASO 2: Size Mismatch → não aplicável + consult_assist opcional
// ============================================================================
async function testCase2_SizeMismatch() {
    console.log('\n🧪 CASO 2: Size Mismatch (8mm com guideline ≤4mm)');
    console.log('='.repeat(70));
    console.log('Esperado:');
    console.log('  - TRILHA 1 (LAUDO): Texto genérico condicional SEM números');
    console.log('  - TRILHA 2 (CONSULTA): Evidência web com orientação (se flag on)');
    console.log('  - TRILHA 3 (CURADORIA): Opcional');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Simular achado de 8mm que não match com bracket ≤4mm
    const report: any = {
        case_id: "TEST_PULM_MISMATCH",
        findings: [
            {
                label: 'Nódulo sólido pulmonar medindo 8 mm.',
                organ: 'pulmão',
                size_mm: 8,
                morphology: 'solid',
                count: 'single'
            }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    // === VALIDAÇÃO TRILHA 1: LAUDO ===
    console.log('\n📋 TRILHA 1: LAUDO (evidence_recommendations)');
    console.log(`   Quantidade: ${result.recommendations?.length || 0}`);

    if (result.recommendations && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        console.log(`   ✅ text: "${rec.text}"`);
        console.log(`   ✅ conditional: ${rec.conditional}`);

        // Check: deve ser condicional
        if (rec.conditional) {
            console.log('   ✅ PASS: Marcado como condicional');
        } else {
            console.log('   ⚠️  WARNING: Deveria ser condicional por size mismatch');
        }

        // Check: não deve ter números inventados
        const hasNumbers = /\d+\s*(mm|cm|meses?|anos?)/i.test(rec.text);
        if (!hasNumbers || rec.text.includes('diretriz')) {
            console.log('   ✅ PASS: Sem números inventados (ou com citação de diretriz)');
        } else {
            console.log('   ❌ FAIL: Contém números sem fonte!');
        }

        // Check: não deve ter guideline_id (ou se tiver, texto deve ser condicional)
        if (!rec.guideline_id || rec.conditional) {
            console.log('   ✅ PASS: Texto seguro sem aplicação direta de guideline');
        }
    } else {
        console.log('   ℹ️  Nenhuma recomendação (aceitável se biblioteca não tem match)');
    }

    // === VALIDAÇÃO TRILHA 2: CONSULTA ===
    console.log('\n🩺 TRILHA 2: CONSULTA (consult_assist)');
    console.log(`   Quantidade: ${result.consult_assist?.length || 0}`);

    if (result.consult_assist && result.consult_assist.length > 0) {
        const ca = result.consult_assist[0];
        console.log(`   ✅ title: ${ca.title}`);
        console.log(`   ✅ summary: ${ca.summary.substring(0, 80)}...`);
        console.log(`   ✅ sources: ${ca.sources.length}`);
        console.log(`   ✅ evidence_quality: ${ca.evidence_quality}`);
        console.log(`   ✅ conflicts_or_caveats: ${ca.conflicts_or_caveats.length}`);

        // Validate sources allowlist
        ca.sources.forEach(source => {
            console.log(`      - ${source.source_type}: ${source.organization_or_journal} (${source.year})`);
            console.log(`        URL: ${source.url}`);
        });

        console.log('   ✅ PASS: Consult assist gerado para ajudar médico');
    } else {
        if (process.env.RADON_WEB_EVIDENCE) {
            console.log('   ⚠️  WARNING: Esperado consult_assist quando web evidence habilitado');
        } else {
            console.log('   ℹ️  Vazio (RADON_WEB_EVIDENCE não habilitado)');
        }
    }

    // === VALIDAÇÃO TRILHA 3: CURADORIA ===
    console.log('\n📥 TRILHA 3: CURADORIA (library_ingestion_candidates)');
    console.log(`   Quantidade: ${result.library_ingestion_candidates?.length || 0}`);

    if (result.library_ingestion_candidates && result.library_ingestion_candidates.length > 0) {
        console.log('   ℹ️  Candidatos gerados (opcional neste caso)');
    } else {
        console.log('   ℹ️  Vazio');
    }

    console.log('\n✅ CASO 2 Complete\n');
    return result;
}

// ============================================================================
// CASO 3: No Library Hits → texto genérico + web evidence
// ============================================================================
async function testCase3_NoLibraryHits() {
    console.log('\n🧪 CASO 3: No Library Hits (finding type não mapeado)');
    console.log('='.repeat(70));
    console.log('Esperado:');
    console.log('  - TRILHA 1 (LAUDO): Texto genérico seguro SEM números');
    console.log('  - TRILHA 2 (CONSULTA): Web evidence (se relevante e flag on)');
    console.log('  - TRILHA 3 (CURADORIA): Candidatos para enriquecer biblioteca');
    console.log('='.repeat(70));

    const ctx: AgentContext = {
        patient_age: 55,
        risk_category: 'low',
        immunosuppressed: false,
        oncologic_context: false
    };

    // Finding que não tem na biblioteca (ex: achado de tireoide sem Ti-RADS)
    const report: any = {
        case_id: "TEST_NO_LIBRARY",
        findings: [
            {
                label: 'Achado genérico não catalogado na biblioteca interna.',
                organ: 'desconhecido'
            }
        ]
    };

    const result = await runRecommendationsAgent(ctx, report);

    // === VALIDAÇÃO TRILHA 1: LAUDO ===
    console.log('\n📋 TRILHA 1: LAUDO (evidence_recommendations)');
    console.log(`   Quantidade: ${result.recommendations?.length || 0}`);

    if (result.recommendations && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        console.log(`   ✅ text: "${rec.text}"`);

        // Check: deve ser genérico sem números
        const hasNumbers = /\d+\s*(mm|cm|meses?|anos?)/i.test(rec.text);
        if (!hasNumbers) {
            console.log('   ✅ PASS: Texto genérico sem números');
        } else {
            console.log('   ❌ FAIL: Contém números sem fonte da biblioteca!');
        }

        // Check: não deve ter guideline_id
        if (!rec.guideline_id) {
            console.log('   ✅ PASS: Sem guideline_id (sem match na biblioteca)');
        } else {
            console.log('   ⚠️  WARNING: Tem guideline_id quando era esperado no match');
        }
    } else {
        console.log('   ℹ️  Nenhuma recomendação (aceitável quando finding não é mapeado)');
    }

    // === VALIDAÇÃO TRILHA 2: CONSULTA ===
    console.log('\n🩺 TRILHA 2: CONSULTA (consult_assist)');
    console.log(`   Quantidade: ${result.consult_assist?.length || 0}`);

    if (result.consult_assist && result.consult_assist.length > 0) {
        console.log('   ✅ Consult assist gerado via web evidence');
    } else {
        console.log('   ℹ️  Vazio (finding pode não ser clinicamente acionável ou flag off)');
    }

    // === VALIDAÇÃO TRILHA 3: CURADORIA ===
    console.log('\n📥 TRILHA 3: CURADORIA (library_ingestion_candidates)');
    console.log(`   Quantidade: ${result.library_ingestion_candidates?.length || 0}`);

    if (result.library_ingestion_candidates && result.library_ingestion_candidates.length > 0) {
        console.log('   ✅ Candidatos gerados para enriquecer biblioteca');
        result.library_ingestion_candidates.forEach((cand, idx) => {
            console.log(`   [${idx + 1}] ${cand.finding_type}`);
            console.log(`       - Confidence: ${cand.confidence_for_ingestion}`);
            console.log(`       - Review required: ${cand.review_required}`);
        });
    } else {
        console.log('   ℹ️  Vazio (pode não ter encontrado evidência web confiável)');
    }

    console.log('\n✅ CASO 3 Complete\n');
    return result;
}

// ============================================================================
// VALIDAÇÃO FINAL: Outputs JSON
// ============================================================================
function validateOutputStructure(testName: string, result: any) {
    console.log(`\n🔍 Validando estrutura JSON: ${testName}`);
    console.log('='.repeat(70));

    // Check required fields
    const hasRecommendations = Array.isArray(result.recommendations);
    const hasReferences = Array.isArray(result.references);

    console.log(`   recommendations: ${hasRecommendations ? '✅' : '❌'} (array)`);
    console.log(`   references: ${hasReferences ? '✅' : '❌'} (array)`);

    // Check optional 3-track fields
    const hasConsultAssist = result.consult_assist === undefined || Array.isArray(result.consult_assist);
    const hasIngestionCandidates = result.library_ingestion_candidates === undefined || Array.isArray(result.library_ingestion_candidates);

    console.log(`   consult_assist: ${hasConsultAssist ? '✅' : '❌'} (optional array)`);
    console.log(`   library_ingestion_candidates: ${hasIngestionCandidates ? '✅' : '❌'} (optional array)`);

    // Validate each recommendation structure
    if (result.recommendations && result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        const hasRequiredFields =
            typeof rec.finding_type === 'string' &&
            typeof rec.text === 'string' &&
            typeof rec.conditional === 'boolean';

        console.log(`   recommendation[0] structure: ${hasRequiredFields ? '✅' : '❌'}`);
    }

    // Validate consult_assist structure
    if (result.consult_assist && result.consult_assist.length > 0) {
        const ca = result.consult_assist[0];
        const hasRequiredFields =
            typeof ca.finding_id === 'string' &&
            typeof ca.title === 'string' &&
            typeof ca.summary === 'string' &&
            Array.isArray(ca.sources) &&
            Array.isArray(ca.suggested_actions);

        console.log(`   consult_assist[0] structure: ${hasRequiredFields ? '✅' : '❌'}`);

        // Validate source structure
        if (ca.sources && ca.sources.length > 0) {
            const source = ca.sources[0];
            const hasSourceFields =
                typeof source.source_type === 'string' &&
                typeof source.organization_or_journal === 'string' &&
                typeof source.url === 'string';

            console.log(`   consult_assist[0].sources[0] structure: ${hasSourceFields ? '✅' : '❌'}`);
        }
    }

    console.log('');
}

// ============================================================================
// RUN ALL E2E TESTS
// ============================================================================
async function runAllE2ETests() {
    console.log('\n' + '='.repeat(70));
    console.log('   E2E TESTS: 3-TRACK RECOMMENDATIONS SYSTEM');
    console.log('='.repeat(70));
    console.log('');
    console.log('REGRA-MÃE: Recomendação só entra no LAUDO se vier da biblioteca E for aplicável.');
    console.log('Web evidence NUNCA entra no laudo.');
    console.log('');

    try {
        // Run 3 test cases
        const result1 = await testCase1_LibraryMatchApplicable();
        const result2 = await testCase2_SizeMismatch();
        const result3 = await testCase3_NoLibraryHits();

        // Validate JSON structures
        console.log('\n' + '='.repeat(70));
        console.log('   VALIDAÇÃO DE ESTRUTURA JSON');
        console.log('='.repeat(70));

        validateOutputStructure('CASO 1', result1);
        validateOutputStructure('CASO 2', result2);
        validateOutputStructure('CASO 3', result3);

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('   📊 SUMMARY');
        console.log('='.repeat(70));
        console.log(`   CASO 1 (Match Aplicável):`);
        console.log(`      - LAUDO: ${result1.recommendations?.length || 0} recs`);
        console.log(`      - CONSULTA: ${result1.consult_assist?.length || 0} entries`);
        console.log(`      - CURADORIA: ${result1.library_ingestion_candidates?.length || 0} candidates`);
        console.log(``);
        console.log(`   CASO 2 (Size Mismatch):`);
        console.log(`      - LAUDO: ${result2.recommendations?.length || 0} recs (condicional)`);
        console.log(`      - CONSULTA: ${result2.consult_assist?.length || 0} entries`);
        console.log(`      - CURADORIA: ${result2.library_ingestion_candidates?.length || 0} candidates`);
        console.log(``);
        console.log(`   CASO 3 (No Library Hits):`);
        console.log(`      - LAUDO: ${result3.recommendations?.length || 0} recs (genérico)`);
        console.log(`      - CONSULTA: ${result3.consult_assist?.length || 0} entries`);
        console.log(`      - CURADORIA: ${result3.library_ingestion_candidates?.length || 0} candidates`);

        console.log('\n' + '='.repeat(70));
        console.log('   ✅ ALL E2E TESTS COMPLETE');
        console.log('='.repeat(70) + '\n');

        // Export results for inspection
        console.log('\n💾 Salvando outputs JSON para inspeção...\n');

        const { writeFileSync } = await import('fs');
        writeFileSync(
            './test-output-case1.json',
            JSON.stringify(result1, null, 2)
        );
        writeFileSync(
            './test-output-case2.json',
            JSON.stringify(result2, null, 2)
        );
        writeFileSync(
            './test-output-case3.json',
            JSON.stringify(result3, null, 2)
        );

        console.log('   ✅ test-output-case1.json (Match Aplicável)');
        console.log('   ✅ test-output-case2.json (Size Mismatch)');
        console.log('   ✅ test-output-case3.json (No Library Hits)');
        console.log('');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

runAllE2ETests();

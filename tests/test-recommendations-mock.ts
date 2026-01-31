/**
 * Teste Mock do Sistema de Recomendações
 * Simula o pipeline completo SEM precisar de API key
 */

import { runRecommendationsAgent, type AgentContext } from '../src/core/reportGeneration/agents/recommendations';
import { validateRecommendations } from '../src/core/reportGeneration/recommendations-guard';
import { exportAuxiliaryTracks } from '../src/utils/consult-assist-exporter';

// Mock findings representando casos reais variados
const MOCK_CASES = [
    {
        name: 'Nódulo Pulmonar 8mm',
        finding_type: 'pulmonary_nodule',
        report: {
            case_id: 'MOCK_PULM_01',
            findings: [{
                label: 'Nódulo sólido pulmonar 8mm',
                organ: 'pulmão',
                size_mm: 8,
                morphology: 'solid',
                count: 'single'
            }]
        },
        context: {
            patient_age: 55,
            risk_category: 'low' as const,
            immunosuppressed: false,
            oncologic_context: false
        }
    },
    {
        name: 'Cisto Renal Bosniak',
        finding_type: 'renal_cyst',
        report: {
            case_id: 'MOCK_RENAL_01',
            findings: [{
                label: 'Cisto renal complexo',
                organ: 'rim direito',
                size_mm: 25
            }]
        },
        context: {
            patient_age: 62,
            risk_category: 'unknown' as const,
            immunosuppressed: false,
            oncologic_context: false
        }
    },
    {
        name: 'Lesão Hepática LI-RADS',
        finding_type: 'hepatic_lesion',
        report: {
            case_id: 'MOCK_HEPATIC_01',
            findings: [{
                label: 'Lesão hepática com realce arterial',
                organ: 'fígado',
                size_mm: 18
            }]
        },
        context: {
            patient_age: 58,
            risk_category: 'high' as const,
            immunosuppressed: false,
            oncologic_context: true
        }
    },
    {
        name: 'Nódulo Tireoide TI-RADS',
        finding_type: 'thyroid_nodule',
        report: {
            case_id: 'MOCK_THYROID_01',
            findings: [{
                label: 'Nódulo de tireoide hipoecogênico',
                organ: 'tireoide',
                size_mm: 12
            }]
        },
        context: {
            patient_age: 45,
            risk_category: 'unknown' as const,
            immunosuppressed: false,
            oncologic_context: false
        }
    },
    {
        name: 'Massa Anexial O-RADS',
        finding_type: 'adnexal_mass',
        report: {
            case_id: 'MOCK_ADNEXAL_01',
            findings: [{
                label: 'Massa anexial à direita',
                organ: 'anexo direito',
                size_mm: 35
            }]
        },
        context: {
            patient_age: 52,
            risk_category: 'unknown' as const,
            immunosuppressed: false,
            oncologic_context: false
        }
    },
    {
        name: 'Lesão Prostática PI-RADS',
        finding_type: 'prostate_lesion',
        report: {
            case_id: 'MOCK_PROSTATE_01',
            findings: [{
                label: 'Lesão prostática zona periférica',
                organ: 'próstata',
                size_mm: 8
            }]
        },
        context: {
            patient_age: 67,
            risk_category: 'high' as const,
            immunosuppressed: false,
            oncologic_context: false
        }
    }
];

async function testMockCase(testCase: typeof MOCK_CASES[0]) {
    console.log(`\n📋 ${testCase.name.toUpperCase()}`);
    console.log('='.repeat(70));

    try {
        // Run recommendations agent
        const result = await runRecommendationsAgent(testCase.context, testCase.report as any);

        // Validate with Guard
        const payloadsObject = (result as any)._libraryPayloads || {};
        const libraryPayloads = new Map<string, any>(Object.entries(payloadsObject));
        const guardResult = validateRecommendations(result.recommendations || [], libraryPayloads);

        // Stats
        const hasLibraryRecs = (result.recommendations?.length || 0) > 0;
        const hasReferences = (result.references?.length || 0) > 0;
        const hasConsultAssist = (result.consult_assist?.length || 0) > 0;
        const hasIngestionCandidates = (result.library_ingestion_candidates?.length || 0) > 0;

        console.log(`   📊 RESULTADOS:`);
        console.log(`      - TRILHA 1 (LAUDO): ${result.recommendations?.length || 0} recommendations`);
        console.log(`      - References: ${result.references?.length || 0}`);
        console.log(`      - TRILHA 2 (CONSULTA): ${result.consult_assist?.length || 0} entries`);
        console.log(`      - TRILHA 3 (CURADORIA): ${result.library_ingestion_candidates?.length || 0} candidates`);
        console.log(`      - Guard violations: ${guardResult.violations.length} ${guardResult.valid ? '✅' : '❌'}`);

        // Show recommendation text
        if (result.recommendations && result.recommendations.length > 0) {
            const rec = result.recommendations[0];
            console.log(`\n   📝 RECOMENDAÇÃO (LAUDO):`);
            console.log(`      "${rec.text.substring(0, 100)}${rec.text.length > 100 ? '...' : ''}"`);
            if (rec.conditional) {
                console.log(`      ⚠️  CONDICIONAL (falta dados)`);
            }
        }

        // Show consult assist title
        if (result.consult_assist && result.consult_assist.length > 0) {
            const ca = result.consult_assist[0];
            console.log(`\n   🩺 CONSULTA MÉDICA (NÃO ENTRA NO LAUDO):`);
            console.log(`      "${ca.title}"`);
            console.log(`      - Quality: ${ca.evidence_quality}`);
            console.log(`      - Sources: ${ca.sources.length}`);
            console.log(`      - Actions: ${ca.suggested_actions.length}`);
        }

        // Export if has auxiliary tracks
        if (hasConsultAssist || hasIngestionCandidates) {
            const exported = exportAuxiliaryTracks(result as any, {
                outputDir: './test-results-mock',
                format: 'both'
            });

            if (exported.consultAssist) {
                console.log(`\n   💾 EXPORTED:`);
                console.log(`      - JSON: ${exported.consultAssist.jsonPath}`);
                console.log(`      - MD: ${exported.consultAssist.mdPath}`);
            }
        }

        console.log(`\n   ✅ ${testCase.name} - SUCCESS`);

        return {
            case: testCase.name,
            success: true,
            library_recs: result.recommendations?.length || 0,
            references: result.references?.length || 0,
            consult_assist: result.consult_assist?.length || 0,
            ingestion_candidates: result.library_ingestion_candidates?.length || 0,
            guard_violations: guardResult.violations.length
        };

    } catch (error: any) {
        console.error(`   ❌ ERROR: ${error.message}`);
        return {
            case: testCase.name,
            success: false,
            error: error.message,
            library_recs: 0,
            references: 0,
            consult_assist: 0,
            ingestion_candidates: 0,
            guard_violations: 0
        };
    }
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('   TESTE MOCK - SISTEMA 3 TRILHAS (SEM API KEY)');
    console.log('='.repeat(70));
    console.log('');
    console.log('Testando 6 classificações radiológicas:');
    console.log('  1. Fleischner (nódulos pulmonares)');
    console.log('  2. Bosniak (cistos renais)');
    console.log('  3. LI-RADS (lesões hepáticas)');
    console.log('  4. TI-RADS (nódulos tireoide)');
    console.log('  5. O-RADS (massas anexiais)');
    console.log('  6. PI-RADS (lesões próstata)');
    console.log('');

    const results = [];

    for (const testCase of MOCK_CASES) {
        const result = await testMockCase(testCase);
        results.push(result);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('   📊 SUMMARY');
    console.log('='.repeat(70));

    const successful = results.filter(r => r.success).length;
    const totalLibraryRecs = results.reduce((sum, r) => sum + r.library_recs, 0);
    const totalReferences = results.reduce((sum, r) => sum + r.references, 0);
    const totalConsultAssist = results.reduce((sum, r) => sum + r.consult_assist, 0);
    const totalIngestionCandidates = results.reduce((sum, r) => sum + r.ingestion_candidates, 0);
    const totalGuardViolations = results.reduce((sum, r) => sum + r.guard_violations, 0);

    console.log('');
    console.log(`   Success Rate: ${successful}/${MOCK_CASES.length}`);
    console.log('');
    console.log(`   TRILHA 1 (LAUDO):`);
    console.log(`      - Total recommendations: ${totalLibraryRecs}`);
    console.log(`      - Total references: ${totalReferences}`);
    console.log('');
    console.log(`   TRILHA 2 (CONSULTA):`);
    console.log(`      - Total consult assist: ${totalConsultAssist}`);
    console.log('');
    console.log(`   TRILHA 3 (CURADORIA):`);
    console.log(`      - Total ingestion candidates: ${totalIngestionCandidates}`);
    console.log('');
    console.log(`   GUARD:`);
    console.log(`      - Total violations: ${totalGuardViolations}`);
    console.log(`      - Status: ${totalGuardViolations === 0 ? '✅ PASS' : '⚠️  REVIEW'}`);
    console.log('');

    // Table
    console.log('   Detailed Results:');
    console.log('   ' + '-'.repeat(68));
    console.log('   Case                    | Lib | Refs | Consult | Ingest | Guard');
    console.log('   ' + '-'.repeat(68));

    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        const guard = r.guard_violations === 0 ? '✅' : `❌${r.guard_violations}`;
        console.log(`   ${r.case.padEnd(23)} | ${String(r.library_recs).padEnd(3)} | ${String(r.references).padEnd(4)} | ${String(r.consult_assist).padEnd(7)} | ${String(r.ingestion_candidates).padEnd(6)} | ${guard}`);
    });

    console.log('   ' + '-'.repeat(68));

    console.log('\n' + '='.repeat(70));
    if (successful === MOCK_CASES.length && totalGuardViolations === 0) {
        console.log('   ✅ ALL TESTS PASS');
    } else {
        console.log('   ⚠️  SOME TESTS FAILED');
    }
    console.log('='.repeat(70) + '\n');

    console.log('💾 Outputs salvos em: ./test-results-mock/\n');
}

main().catch(console.error);

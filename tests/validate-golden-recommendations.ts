/**
 * Validação do Sistema de Recomendações com 10 Casos Reais (Golden Set)
 *
 * Executa o pipeline completo e valida:
 * - TRILHA 1: Recomendações no laudo (somente biblioteca)
 * - TRILHA 2: Consult assist (web evidence)
 * - TRILHA 3: Ingestion candidates (curadoria)
 * - Guard Layer (0 violações esperadas)
 */

import fs from 'fs';
import path from 'path';
import { processCasePipeline } from '../src/core/reportGeneration/orchestrator';
import type { CaseBundle } from '../src/types';

const GOLDEN_DIR = path.join(process.cwd(), 'tests/golden-set/golden_test');
const OUTPUT_DIR = path.join(process.cwd(), 'test-results-golden');

interface ValidationResult {
    case_id: string;
    success: boolean;
    has_recommendations: boolean;
    has_references: boolean;
    has_consult_assist: boolean;
    has_ingestion_candidates: boolean;
    guard_violations: number;
    error?: string;
    findings_count: number;
    recommendations_count: number;
    references_count: number;
}

async function validateCase(caseId: string): Promise<ValidationResult> {
    console.log(`\n📋 CASO ${caseId.toUpperCase()}`);
    console.log('='.repeat(70));

    try {
        // Load input
        const inputPath = path.join(GOLDEN_DIR, caseId, 'input.json');
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input not found: ${inputPath}`);
        }

        const bundle: CaseBundle = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

        // Run pipeline
        console.log(`   🔄 Running pipeline for ${caseId}...`);
        const result = await processCasePipeline(bundle);

        // Extract recommendation data
        const report: any = result.report;
        const hasRecommendations = Array.isArray(report.evidence_recommendations) && report.evidence_recommendations.length > 0;
        const hasReferences = Array.isArray(report.references) && report.references.length > 0;
        const hasConsultAssist = Array.isArray(report.consult_assist) && report.consult_assist.length > 0;
        const hasIngestionCandidates = Array.isArray(report.library_ingestion_candidates) && report.library_ingestion_candidates.length > 0;

        // Count Guard violations (if any)
        let guardViolations = 0;
        // Guard validation happens inside pipeline, check flags
        if (report.flags?.hallucination_detected) {
            guardViolations++;
        }

        // Log results
        console.log(`   ✅ Pipeline success`);
        console.log(`   📊 Findings: ${report.findings?.length || 0}`);
        console.log(`   📋 TRILHA 1 (LAUDO): ${report.evidence_recommendations?.length || 0} recommendations`);
        console.log(`   📚 References: ${report.references?.length || 0}`);
        console.log(`   🩺 TRILHA 2 (CONSULTA): ${report.consult_assist?.length || 0} entries`);
        console.log(`   📥 TRILHA 3 (CURADORIA): ${report.library_ingestion_candidates?.length || 0} candidates`);
        console.log(`   🛡️  Guard violations: ${guardViolations}`);

        // Save output
        const outputPath = path.join(OUTPUT_DIR, `${caseId}-result.json`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify({
            case_id: caseId,
            report_json: result.report,
            markdown: result.markdown,
            qa: result.qa,
            risk: result.risk
        }, null, 2));

        console.log(`   💾 Saved: ${outputPath}`);

        return {
            case_id: caseId,
            success: true,
            has_recommendations: hasRecommendations,
            has_references: hasReferences,
            has_consult_assist: hasConsultAssist,
            has_ingestion_candidates: hasIngestionCandidates,
            guard_violations: guardViolations,
            findings_count: report.findings?.length || 0,
            recommendations_count: report.evidence_recommendations?.length || 0,
            references_count: report.references?.length || 0
        };

    } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);

        return {
            case_id: caseId,
            success: false,
            has_recommendations: false,
            has_references: false,
            has_consult_assist: false,
            has_ingestion_candidates: false,
            guard_violations: 0,
            error: error.message,
            findings_count: 0,
            recommendations_count: 0,
            references_count: 0
        };
    }
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('   VALIDAÇÃO COM 10 CASOS REAIS (GOLDEN SET)');
    console.log('='.repeat(70));
    console.log('');
    console.log('Sistema: 3 trilhas de recomendações');
    console.log('Guard: Validação anti-alucinação');
    console.log('');

    const cases = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
    const results: ValidationResult[] = [];

    for (const caseId of cases) {
        const result = await validateCase(caseId);
        results.push(result);

        // Small delay between cases
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('   📊 SUMMARY');
    console.log('='.repeat(70));

    const successful = results.filter(r => r.success).length;
    const withRecommendations = results.filter(r => r.has_recommendations).length;
    const withReferences = results.filter(r => r.has_references).length;
    const withConsultAssist = results.filter(r => r.has_consult_assist).length;
    const withIngestionCandidates = results.filter(r => r.has_ingestion_candidates).length;
    const totalGuardViolations = results.reduce((sum, r) => sum + r.guard_violations, 0);
    const totalFindings = results.reduce((sum, r) => sum + r.findings_count, 0);
    const totalRecommendations = results.reduce((sum, r) => sum + r.recommendations_count, 0);
    const totalReferences = results.reduce((sum, r) => sum + r.references_count, 0);

    console.log(``);
    console.log(`   Pipeline Success: ${successful}/10`);
    console.log(`   Total Findings: ${totalFindings}`);
    console.log(``);
    console.log(`   TRILHA 1 (LAUDO):`);
    console.log(`      - Cases with recommendations: ${withRecommendations}/10`);
    console.log(`      - Total recommendations: ${totalRecommendations}`);
    console.log(`      - Total references: ${totalReferences}`);
    console.log(``);
    console.log(`   TRILHA 2 (CONSULTA):`);
    console.log(`      - Cases with consult assist: ${withConsultAssist}/10`);
    console.log(``);
    console.log(`   TRILHA 3 (CURADORIA):`);
    console.log(`      - Cases with ingestion candidates: ${withIngestionCandidates}/10`);
    console.log(``);
    console.log(`   GUARD LAYER:`);
    console.log(`      - Total violations: ${totalGuardViolations}`);
    console.log(`      - Status: ${totalGuardViolations === 0 ? '✅ PASS' : '⚠️  REVIEW NEEDED'}`);
    console.log(``);

    // Detailed table
    console.log('\n   Detailed Results:');
    console.log('   ' + '-'.repeat(68));
    console.log('   Case | Success | Findings | Recs | Refs | Consult | Ingest | Guard');
    console.log('   ' + '-'.repeat(68));

    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        const consult = r.has_consult_assist ? '✓' : '-';
        const ingest = r.has_ingestion_candidates ? '✓' : '-';
        const guard = r.guard_violations === 0 ? '✅' : `❌${r.guard_violations}`;

        console.log(`   ${r.case_id.padEnd(4)} | ${status.padEnd(7)} | ${String(r.findings_count).padEnd(8)} | ${String(r.recommendations_count).padEnd(4)} | ${String(r.references_count).padEnd(4)} | ${consult.padEnd(7)} | ${ingest.padEnd(6)} | ${guard}`);
    });

    console.log('   ' + '-'.repeat(68));

    // Failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log('\n   ❌ Failures:');
        failures.forEach(f => {
            console.log(`      - ${f.case_id}: ${f.error}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    if (successful === 10 && totalGuardViolations === 0) {
        console.log('   ✅ ALL VALIDATIONS PASS');
    } else {
        console.log('   ⚠️  SOME VALIDATIONS FAILED');
    }
    console.log('='.repeat(70) + '\n');

    // Save summary
    const summaryPath = path.join(OUTPUT_DIR, 'validation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        total_cases: 10,
        successful: successful,
        total_findings: totalFindings,
        total_recommendations: totalRecommendations,
        total_references: totalReferences,
        total_guard_violations: totalGuardViolations,
        results: results
    }, null, 2));

    console.log(`💾 Summary saved: ${summaryPath}\n`);
}

main().catch(console.error);

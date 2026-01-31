// scripts/recommendations/completeness-validator.ts
// Quality Gates para garantir completude (anti-esquecimento)

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import Database from 'better-sqlite3';

interface CoverageSpec {
    coverage_domains: Record<string, DomainSpec>;
    completeness_gates: CompletenessGates;
    saturation_criteria: SaturationCriteria;
}

interface DomainSpec {
    priority: 'P0' | 'P1' | 'P2';
    min_docs: number;
    min_recs: number;
    topics: Record<string, TopicSpec>;
}

interface TopicSpec {
    priority: 'P0' | 'P1' | 'P2';
    rec_types: string[];
    must_have_sources: string[];
    queries: string[];
    min_docs: number;
    min_recs: number;
}

interface CompletenessGates {
    p0_topics_minimum: GateConfig;
    must_have_sources: GateConfig;
    domain_balance: DomainBalanceConfig;
    rec_type_coverage: RecTypeCoverageConfig;
}

interface GateConfig {
    enabled: boolean;
    fail_on_missing: boolean;
    description: string;
}

interface DomainBalanceConfig extends GateConfig {
    fail_on_imbalance: boolean;
    max_std_dev: number;
}

interface RecTypeCoverageConfig extends GateConfig {
    min_per_type: Record<string, number>;
}

interface SaturationCriteria {
    consecutive_duplicates_threshold: number;
    min_unique_sources_per_query: number;
    stop_conditions: string[];
}

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    stats: ValidationStats;
}

interface ValidationStats {
    total_docs: number;
    total_recs: number;
    coverage_by_domain: Record<string, DomainCoverage>;
    coverage_by_rec_type: Record<string, number>;
    missing_must_have_sources: string[];
    p0_topics_below_minimum: TopicGap[];
}

interface DomainCoverage {
    docs: number;
    recs: number;
    min_docs: number;
    min_recs: number;
    percentage: number;
}

interface TopicGap {
    domain: string;
    topic: string;
    current_docs: number;
    min_docs: number;
    current_recs: number;
    min_recs: number;
}

/**
 * GATE 1: Todos os tópicos P0 devem atingir mínimos
 */
async function validateP0TopicsMinimum(
    db: Database.Database,
    spec: CoverageSpec
): Promise<{ passed: boolean; errors: string[]; gaps: TopicGap[] }> {
    const errors: string[] = [];
    const gaps: TopicGap[] = [];

    for (const [domainName, domainSpec] of Object.entries(spec.coverage_domains)) {
        for (const [topicName, topicSpec] of Object.entries(domainSpec.topics)) {
            if (topicSpec.priority !== 'P0') continue;

            // Contar docs para este tópico
            const docCount = db
                .prepare(
                    `
        SELECT COUNT(DISTINCT d.doc_id) as count
        FROM documents d
        JOIN recommendations r ON d.doc_id = r.doc_id
        WHERE r.topico = ?
      `
                )
                .get(topicName) as { count: number };

            // Contar recs para este tópico
            const recCount = db
                .prepare(
                    `
        SELECT COUNT(*) as count
        FROM recommendations
        WHERE topico = ?
      `
                )
                .get(topicName) as { count: number };

            // Verificar se atinge mínimos
            if (docCount.count < topicSpec.min_docs || recCount.count < topicSpec.min_recs) {
                const gap: TopicGap = {
                    domain: domainName,
                    topic: topicName,
                    current_docs: docCount.count,
                    min_docs: topicSpec.min_docs,
                    current_recs: recCount.count,
                    min_recs: topicSpec.min_recs,
                };
                gaps.push(gap);

                errors.push(
                    `❌ P0 topic "${topicName}" (${domainName}): ` +
                    `${docCount.count}/${topicSpec.min_docs} docs, ` +
                    `${recCount.count}/${topicSpec.min_recs} recs`
                );
            }
        }
    }

    return {
        passed: errors.length === 0,
        errors,
        gaps,
    };
}

/**
 * GATE 2: Must-have sources obrigatórios
 */
async function validateMustHaveSources(
    db: Database.Database,
    spec: CoverageSpec
): Promise<{ passed: boolean; errors: string[]; missing: string[] }> {
    const errors: string[] = [];
    const missing: string[] = [];
    const allMustHave = new Set<string>();

    // Coletar todos os must_have_sources de todos os tópicos P0
    for (const domainSpec of Object.values(spec.coverage_domains)) {
        for (const topicSpec of Object.values(domainSpec.topics)) {
            if (topicSpec.priority === 'P0') {
                topicSpec.must_have_sources.forEach((src) => allMustHave.add(src));
            }
        }
    }

    // Verificar quais estão presentes no registry
    const existingSources = db
        .prepare('SELECT source_id FROM sources')
        .all() as { source_id: string }[];

    const existingSet = new Set(existingSources.map((s) => s.source_id));

    for (const mustHave of allMustHave) {
        if (!existingSet.has(mustHave)) {
            missing.push(mustHave);
            errors.push(`❌ Must-have source ausente: "${mustHave}"`);
        }
    }

    return {
        passed: errors.length === 0,
        errors,
        missing,
    };
}

/**
 * GATE 3: Cobertura balanceada entre domínios
 */
async function validateDomainBalance(
    db: Database.Database,
    spec: CoverageSpec
): Promise<{ passed: boolean; errors: string[]; stats: Record<string, DomainCoverage> }> {
    const errors: string[] = [];
    const stats: Record<string, DomainCoverage> = {};

    // Total de recomendações
    const totalRecs = (
        db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as { count: number }
    ).count;

    // Calcular % por domínio
    const percentages: number[] = [];

    for (const [domainName, domainSpec] of Object.entries(spec.coverage_domains)) {
        if (domainSpec.priority !== 'P0') continue;

        // Docs neste domínio
        const docCount = db
            .prepare(
                `
      SELECT COUNT(DISTINCT d.doc_id) as count
      FROM documents d
      JOIN recommendations r ON d.doc_id = r.doc_id
      WHERE r.dominio = ?
    `
            )
            .get(domainName) as { count: number };

        // Recs neste domínio
        const recCount = db
            .prepare(
                `
      SELECT COUNT(*) as count
      FROM recommendations
      WHERE dominio = ?
    `
            )
            .get(domainName) as { count: number };

        const percentage = totalRecs > 0 ? (recCount.count / totalRecs) * 100 : 0;
        percentages.push(percentage);

        stats[domainName] = {
            docs: docCount.count,
            recs: recCount.count,
            min_docs: domainSpec.min_docs,
            min_recs: domainSpec.min_recs,
            percentage,
        };

        // Verificar mínimos absolutos
        if (docCount.count < domainSpec.min_docs) {
            errors.push(
                `❌ Domínio "${domainName}": ${docCount.count}/${domainSpec.min_docs} docs (abaixo do mínimo)`
            );
        }
        if (recCount.count < domainSpec.min_recs) {
            errors.push(
                `❌ Domínio "${domainName}": ${recCount.count}/${domainSpec.min_recs} recs (abaixo do mínimo)`
            );
        }

        // Verificar se < 10% do total
        if (percentage < 10 && totalRecs > 0) {
            errors.push(
                `⚠️  Domínio "${domainName}": apenas ${percentage.toFixed(1)}% do total (< 10%)`
            );
        }
    }

    // Calcular desvio padrão
    if (percentages.length > 0) {
        const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        const variance =
            percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
        const stdDev = Math.sqrt(variance) / 100; // normalizar

        const maxStdDev = spec.completeness_gates.domain_balance.max_std_dev;
        if (stdDev > maxStdDev) {
            errors.push(
                `⚠️  Desbalanceamento entre domínios: std_dev=${(stdDev * 100).toFixed(1)}% ` +
                `(max permitido: ${(maxStdDev * 100).toFixed(1)}%)`
            );
        }
    }

    return {
        passed: errors.length === 0,
        errors,
        stats,
    };
}

/**
 * GATE 4: Cobertura por rec_type
 */
async function validateRecTypeCoverage(
    db: Database.Database,
    spec: CoverageSpec
): Promise<{ passed: boolean; errors: string[]; stats: Record<string, number> }> {
    const errors: string[] = [];
    const stats: Record<string, number> = {};

    const minPerType = spec.completeness_gates.rec_type_coverage.min_per_type;

    for (const [recType, minCount] of Object.entries(minPerType)) {
        const count = db
            .prepare(
                `
      SELECT COUNT(*) as count
      FROM recommendations
      WHERE rec_type = ?
    `
            )
            .get(recType) as { count: number };

        stats[recType] = count.count;

        if (count.count < minCount) {
            errors.push(
                `❌ rec_type "${recType}": ${count.count}/${minCount} (abaixo do mínimo)`
            );
        }
    }

    return {
        passed: errors.length === 0,
        errors,
        stats,
    };
}

/**
 * Gerador de relatório de gaps
 */
async function generateGapsReport(
    validationResult: ValidationResult,
    outputPath: string
): Promise<void> {
    const lines: string[] = [];

    lines.push('# Gaps de Completude - Recommendations Database\n');
    lines.push(`**Gerado:** ${new Date().toISOString()}\n`);
    lines.push('---\n');

    // Status geral
    if (validationResult.passed) {
        lines.push('## ✅ Status: PASSOU EM TODOS OS GATES\n');
    } else {
        lines.push('## ❌ Status: FALHOU EM GATES DE COMPLETUDE\n');
        lines.push('**Build deve FALHAR até estes gaps serem resolvidos.**\n');
    }

    // Estatísticas gerais
    lines.push('## 📊 Estatísticas Gerais\n');
    lines.push(`- **Total de documentos:** ${validationResult.stats.total_docs}`);
    lines.push(`- **Total de recomendações:** ${validationResult.stats.total_recs}\n`);

    // Cobertura por domínio
    lines.push('## 🗂️ Cobertura por Domínio\n');
    lines.push('| Domínio | Docs | Recs | % Total | Status |');
    lines.push('|---------|------|------|---------|--------|');
    for (const [domain, coverage] of Object.entries(validationResult.stats.coverage_by_domain)) {
        const docsStatus = coverage.docs >= coverage.min_docs ? '✅' : '❌';
        const recsStatus = coverage.recs >= coverage.min_recs ? '✅' : '❌';
        lines.push(
            `| ${domain} | ${coverage.docs}/${coverage.min_docs} ${docsStatus} | ` +
            `${coverage.recs}/${coverage.min_recs} ${recsStatus} | ` +
            `${coverage.percentage.toFixed(1)}% | ${docsStatus === '✅' && recsStatus === '✅' ? '✅' : '❌'} |`
        );
    }
    lines.push('');

    // Cobertura por rec_type
    lines.push('## 🏷️ Cobertura por Tipo de Recomendação\n');
    lines.push('| Tipo | Quantidade | Status |');
    lines.push('|------|------------|--------|');
    for (const [recType, count] of Object.entries(validationResult.stats.coverage_by_rec_type)) {
        const status = '✅'; // TODO: comparar com mínimo
        lines.push(`| ${recType} | ${count} | ${status} |`);
    }
    lines.push('');

    // Tópicos P0 abaixo do mínimo
    if (validationResult.stats.p0_topics_below_minimum.length > 0) {
        lines.push('## ❌ Tópicos P0 Abaixo do Mínimo\n');
        lines.push('| Domínio | Tópico | Docs (atual/mín) | Recs (atual/mín) |');
        lines.push('|---------|--------|------------------|------------------|');
        for (const gap of validationResult.stats.p0_topics_below_minimum) {
            lines.push(
                `| ${gap.domain} | ${gap.topic} | ` +
                `${gap.current_docs}/${gap.min_docs} | ` +
                `${gap.current_recs}/${gap.min_recs} |`
            );
        }
        lines.push('');
    }

    // Must-have sources ausentes
    if (validationResult.stats.missing_must_have_sources.length > 0) {
        lines.push('## ❌ Must-Have Sources Ausentes\n');
        for (const source of validationResult.stats.missing_must_have_sources) {
            lines.push(`- \`${source}\``);
        }
        lines.push('');
    }

    // Erros detalhados
    if (validationResult.errors.length > 0) {
        lines.push('## 🔴 Erros Detalhados\n');
        for (const error of validationResult.errors) {
            lines.push(`- ${error}`);
        }
        lines.push('');
    }

    // Warnings
    if (validationResult.warnings.length > 0) {
        lines.push('## ⚠️ Avisos\n');
        for (const warning of validationResult.warnings) {
            lines.push(`- ${warning}`);
        }
        lines.push('');
    }

    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * Validador principal
 */
export async function validateCompleteness(
    dbPath: string,
    specPath: string,
    outputDir: string
): Promise<ValidationResult> {
    // Load spec
    const specContent = await fs.readFile(specPath, 'utf-8');
    const spec = yaml.parse(specContent) as CoverageSpec;

    // Open DB
    const db = new Database(dbPath);

    const errors: string[] = [];
    const warnings: string[] = [];

    // GATE 1: P0 Topics Minimum
    console.log('🔍 Gate 1: Validando tópicos P0...');
    const gate1 = await validateP0TopicsMinimum(db, spec);
    if (!gate1.passed && spec.completeness_gates.p0_topics_minimum.fail_on_missing) {
        errors.push(...gate1.errors);
    } else if (!gate1.passed) {
        warnings.push(...gate1.errors);
    }

    // GATE 2: Must-Have Sources
    console.log('🔍 Gate 2: Validando must-have sources...');
    const gate2 = await validateMustHaveSources(db, spec);
    if (!gate2.passed && spec.completeness_gates.must_have_sources.fail_on_missing) {
        errors.push(...gate2.errors);
    } else if (!gate2.passed) {
        warnings.push(...gate2.errors);
    }

    // GATE 3: Domain Balance
    console.log('🔍 Gate 3: Validando balanceamento de domínios...');
    const gate3 = await validateDomainBalance(db, spec);
    if (!gate3.passed && spec.completeness_gates.domain_balance.fail_on_imbalance) {
        errors.push(...gate3.errors);
    } else if (!gate3.passed) {
        warnings.push(...gate3.errors);
    }

    // GATE 4: Rec Type Coverage
    console.log('🔍 Gate 4: Validando cobertura por rec_type...');
    const gate4 = await validateRecTypeCoverage(db, spec);
    if (!gate4.passed) {
        errors.push(...gate4.errors);
    }

    // Calcular estatísticas
    const totalRecs = (
        db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as { count: number }
    ).count;
    const totalDocs = (
        db.prepare('SELECT COUNT(DISTINCT source_id) as count FROM sources').get() as {
            count: number;
        }
    ).count;

    const result: ValidationResult = {
        passed: errors.length === 0,
        errors,
        warnings,
        stats: {
            total_docs: totalDocs,
            total_recs: totalRecs,
            coverage_by_domain: gate3.stats,
            coverage_by_rec_type: gate4.stats,
            missing_must_have_sources: gate2.missing,
            p0_topics_below_minimum: gate1.gaps,
        },
    };

    // Gerar relatório
    const reportPath = path.join(outputDir, 'gaps.md');
    await generateGapsReport(result, reportPath);
    console.log(`📄 Relatório gerado: ${reportPath}`);

    db.close();
    return result;
}

/**
 * CLI Entry Point
 */
if (require.main === module) {
    const dbPath = process.argv[2] || 'data/recommendations/db/recommendations.db';
    const specPath = process.argv[3] || 'data/recommendations/sources/coverage_spec.yaml';
    const outputDir = process.argv[4] || 'data/recommendations/reports';

    validateCompleteness(dbPath, specPath, outputDir)
        .then((result) => {
            if (result.passed) {
                console.log('✅ Todos os gates de completude PASSARAM');
                process.exit(0);
            } else {
                console.error('❌ Falha em gates de completude');
                console.error(`Erros: ${result.errors.length}`);
                console.error(`Warnings: ${result.warnings.length}`);
                process.exit(1); // FALHA DE BUILD
            }
        })
        .catch((err) => {
            console.error('💥 Erro fatal:', err);
            process.exit(1);
        });
}

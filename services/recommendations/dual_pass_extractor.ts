// scripts/recommendations/dual-pass-extractor.ts
// Extração em dois passes independentes para fontes P0 críticas
// Reduz erros de cut-off e garante precisão

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

interface DualPassConfig {
    source_id: string;
    priority: 'P0' | 'P1' | 'P2';
    enable_dual_pass: boolean;
    min_agreement_threshold: number; // 0-1, ex: 0.8 = 80% de acordo
}

interface ExtractionPass {
    pass_id: string;
    model: string;
    temperature: number;
    extracted_recs: Recommendation[];
    timestamp: string;
}

interface Recommendation {
    rec_id: string;
    rec_type: string;
    achado: string;
    condicao_if: string;
    acao_then: string;
    followup_interval?: string;
    verbatim_quote: string;
    snippet_suporte: string;
    anchor: string;
    pagina: number;
    confidence: number;
}

interface ComparisonResult {
    consensus: Recommendation[];
    disagreements: Disagreement[];
    agreement_rate: number;
    requires_human_review: boolean;
}

interface Disagreement {
    rec_hash: string;
    pass1_rec: Recommendation | null;
    pass2_rec: Recommendation | null;
    difference_type: 'missing_in_pass2' | 'missing_in_pass1' | 'content_mismatch';
    fields_differing?: string[];
}

// ============================================================================
// P0 CRITICAL SOURCES (dual-pass obrigatório)
// ============================================================================
const P0_CRITICAL_SOURCES: DualPassConfig[] = [
    {
        source_id: 'fleischner_2017',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
    {
        source_id: 'fleischner_2005',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
    {
        source_id: 'bosniak_v2019',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.9, // Bosniak é crítico, precisa 90%
    },
    {
        source_id: 'li_rads_v2018',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
    {
        source_id: 'pi_rads_v2_1',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
    {
        source_id: 'recist_1_1_original',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.9, // RECIST é baseline, precisa 90%
    },
    {
        source_id: 'irecist_immunotherapy',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
    {
        source_id: 'mrecist_hcc',
        priority: 'P0',
        enable_dual_pass: true,
        min_agreement_threshold: 0.85,
    },
];

/**
 * Hash de recomendação para comparação
 */
function hashRecommendation(rec: Recommendation): string {
    // Hash baseado em achado + condição + ação (campos semânticos core)
    const key = `${rec.achado}|${rec.condicao_if}|${rec.acao_then}`.toLowerCase();
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
}

/**
 * Executa extração (um passe)
 */
async function executeExtractionPass(
    sourceText: string[],
    sourceId: string,
    passNumber: 1 | 2,
    genAI: GoogleGenerativeAI
): Promise<ExtractionPass> {
    // Usar temperatura ligeiramente diferente entre passes para diversidade
    const temperature = passNumber === 1 ? 0.0 : 0.1;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const extractedRecs: Recommendation[] = [];

    console.log(`  🔄 Pass ${passNumber}: Extraindo de ${sourceId}...`);

    // Processar página por página
    for (let pageIdx = 0; pageIdx < sourceText.length; pageIdx++) {
        const pageNum = pageIdx + 1;
        const pageContent = sourceText[pageIdx];

        const prompt = `
Você é um assistente especializado em extração de diretrizes clínicas radiológicas.

DOCUMENTO: ${sourceId}
PÁGINA: ${pageNum}

TEXTO DA PÁGINA:
${pageContent}

INSTRUÇÕES CRÍTICAS:
1. Extraia SOMENTE recomendações explícitas de conduta (IF achado THEN ação)
2. Para cada recomendação, você DEVE fornecer:
   - achado (normalizado)
   - condicao_if (condições específicas)
   - acao_then (recomendação de conduta)
   - verbatim_quote (<= 25 palavras LITERAIS do texto acima)
   - snippet_suporte (<= 25 palavras parafraseadas ok)
   - anchor (ex: "Table 2" ou "Section 3.1" ou "Figure 1")
   - pagina (${pageNum})
   - rec_type (recommendation | classification | staging | response_criteria | reporting_standard)
3. NÃO invente. Se não houver recomendação explícita, retorne array vazio.
4. SEJA PRECISO com cut-offs numéricos (ex: "< 6mm", não "aproximadamente 6mm")

SCHEMA JSON esperado:
{
  "recommendations": [
    {
      "rec_type": "string",
      "achado": "string",
      "condicao_if": "string",
      "acao_then": "string",
      "followup_interval": "string | null",
      "verbatim_quote": "string",
      "snippet_suporte": "string",
      "anchor": "string",
      "pagina": number,
      "confidence": number
    }
  ]
}
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                topP: 1.0,
                maxOutputTokens: 8000,
            },
        });

        const responseText = result.response.text();

        // Parse JSON
        try {
            const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());

            if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                for (const rec of parsed.recommendations) {
                    extractedRecs.push({
                        rec_id: crypto.randomUUID(),
                        rec_type: rec.rec_type || 'recommendation',
                        achado: rec.achado,
                        condicao_if: rec.condicao_if,
                        acao_then: rec.acao_then,
                        followup_interval: rec.followup_interval || null,
                        verbatim_quote: rec.verbatim_quote,
                        snippet_suporte: rec.snippet_suporte,
                        anchor: rec.anchor,
                        pagina: rec.pagina,
                        confidence: rec.confidence || 0.8,
                    });
                }
            }
        } catch (err) {
            console.error(`    ⚠️  Erro ao parsear JSON da página ${pageNum} (Pass ${passNumber}):`, err);
        }
    }

    console.log(`  ✅ Pass ${passNumber}: ${extractedRecs.length} recomendações extraídas`);

    return {
        pass_id: `pass_${passNumber}_${Date.now()}`,
        model: 'gemini-2.0-flash-exp',
        temperature,
        extracted_recs: extractedRecs,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Compara dois passes e identifica consenso/divergências
 */
function compareExtractionPasses(
    pass1: ExtractionPass,
    pass2: ExtractionPass
): ComparisonResult {
    const consensus: Recommendation[] = [];
    const disagreements: Disagreement[] = [];

    // Criar hash maps
    const pass1Map = new Map<string, Recommendation>();
    const pass2Map = new Map<string, Recommendation>();

    for (const rec of pass1.extracted_recs) {
        pass1Map.set(hashRecommendation(rec), rec);
    }

    for (const rec of pass2.extracted_recs) {
        pass2Map.set(hashRecommendation(rec), rec);
    }

    // Encontrar consenso (presentes em ambos)
    for (const [hash, rec1] of pass1Map.entries()) {
        if (pass2Map.has(hash)) {
            const rec2 = pass2Map.get(hash)!;

            // Verificar se campos críticos batem
            const criticalFieldsMatch =
                rec1.achado === rec2.achado &&
                rec1.condicao_if === rec2.condicao_if &&
                rec1.acao_then === rec2.acao_then &&
                rec1.pagina === rec2.pagina;

            if (criticalFieldsMatch) {
                // CONSENSO
                consensus.push({
                    ...rec1,
                    confidence: Math.max(rec1.confidence, rec2.confidence), // usar maior confidence
                });
            } else {
                // Presentes em ambos mas com diferenças
                disagreements.push({
                    rec_hash: hash,
                    pass1_rec: rec1,
                    pass2_rec: rec2,
                    difference_type: 'content_mismatch',
                    fields_differing: [
                        rec1.achado !== rec2.achado ? 'achado' : null,
                        rec1.condicao_if !== rec2.condicao_if ? 'condicao_if' : null,
                        rec1.acao_then !== rec2.acao_then ? 'acao_then' : null,
                        rec1.pagina !== rec2.pagina ? 'pagina' : null,
                    ].filter((f): f is string => f !== null),
                });
            }
        } else {
            // Presente em pass1 mas não em pass2
            disagreements.push({
                rec_hash: hash,
                pass1_rec: rec1,
                pass2_rec: null,
                difference_type: 'missing_in_pass2',
            });
        }
    }

    // Encontrar presentes em pass2 mas não em pass1
    for (const [hash, rec2] of pass2Map.entries()) {
        if (!pass1Map.has(hash)) {
            disagreements.push({
                rec_hash: hash,
                pass1_rec: null,
                pass2_rec: rec2,
                difference_type: 'missing_in_pass1',
            });
        }
    }

    // Calcular agreement rate
    const totalUnique = pass1Map.size + pass2Map.size - consensus.length;
    const agreementRate = totalUnique > 0 ? consensus.length / totalUnique : 1.0;

    return {
        consensus,
        disagreements,
        agreement_rate: agreementRate,
        requires_human_review: disagreements.length > 0,
    };
}

/**
 * Gera relatório de divergências para revisão humana
 */
async function generateDisagreementReport(
    sourceId: string,
    comparison: ComparisonResult,
    outputPath: string
): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Relatório de Divergências - Dual Pass Extraction\n`);
    lines.push(`**Source:** ${sourceId}`);
    lines.push(`**Data:** ${new Date().toISOString()}`);
    lines.push(`**Agreement Rate:** ${(comparison.agreement_rate * 100).toFixed(1)}%\n`);
    lines.push('---\n');

    lines.push(`## ✅ Consenso: ${comparison.consensus.length} recomendações\n`);

    if (comparison.disagreements.length > 0) {
        lines.push(`## ⚠️ Divergências: ${comparison.disagreements.length} casos\n`);

        for (let i = 0; i < comparison.disagreements.length; i++) {
            const dis = comparison.disagreements[i];
            lines.push(`### Divergência ${i + 1}: ${dis.difference_type}\n`);

            if (dis.difference_type === 'content_mismatch' && dis.fields_differing) {
                lines.push(`**Campos divergentes:** ${dis.fields_differing.join(', ')}\n`);
            }

            if (dis.pass1_rec) {
                lines.push('**Pass 1:**');
                lines.push(`- Achado: ${dis.pass1_rec.achado}`);
                lines.push(`- Condição: ${dis.pass1_rec.condicao_if}`);
                lines.push(`- Ação: ${dis.pass1_rec.acao_then}`);
                lines.push(`- Página: ${dis.pass1_rec.pagina}`);
                lines.push(`- Quote: "${dis.pass1_rec.verbatim_quote}"\n`);
            }

            if (dis.pass2_rec) {
                lines.push('**Pass 2:**');
                lines.push(`- Achado: ${dis.pass2_rec.achado}`);
                lines.push(`- Condição: ${dis.pass2_rec.condicao_if}`);
                lines.push(`- Ação: ${dis.pass2_rec.acao_then}`);
                lines.push(`- Página: ${dis.pass2_rec.pagina}`);
                lines.push(`- Quote: "${dis.pass2_rec.verbatim_quote}"\n`);
            }

            lines.push('---\n');
        }
    }

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * Executa extração dual-pass para uma fonte P0
 */
export async function dualPassExtraction(
    sourceId: string,
    sourceText: string[],
    config: DualPassConfig,
    outputDir: string
): Promise<Recommendation[]> {
    if (!config.enable_dual_pass) {
        throw new Error(`Dual-pass não habilitado para ${sourceId}`);
    }

    console.log(`\n🔬 Dual-Pass Extraction: ${sourceId}`);
    console.log(`  Threshold de acordo: ${(config.min_agreement_threshold * 100).toFixed(0)}%\n`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    // PASS 1
    const pass1 = await executeExtractionPass(sourceText, sourceId, 1, genAI);

    // PASS 2 (independente)
    const pass2 = await executeExtractionPass(sourceText, sourceId, 2, genAI);

    // Comparação
    console.log(`\n  🔍 Comparando passes...`);
    const comparison = compareExtractionPasses(pass1, pass2);

    console.log(`  ✅ Consenso: ${comparison.consensus.length} recomendações`);
    console.log(`  ⚠️  Divergências: ${comparison.disagreements.length}`);
    console.log(`  📊 Agreement rate: ${(comparison.agreement_rate * 100).toFixed(1)}%`);

    // Gerar relatório de divergências
    if (comparison.disagreements.length > 0) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const reportPath = path.join(outputDir, `disagreements_${sourceId}.md`);
        await generateDisagreementReport(sourceId, comparison, reportPath);
        console.log(`  📄 Relatório de divergências: ${reportPath}`);
    }

    // Verificar threshold
    if (comparison.agreement_rate < config.min_agreement_threshold) {
        console.error(
            `\n❌ FALHA: Agreement rate ${(comparison.agreement_rate * 100).toFixed(1)}% ` +
            `abaixo do threshold ${(config.min_agreement_threshold * 100).toFixed(0)}%`
        );
        console.error(`   → Revisão humana OBRIGATÓRIA antes de inserir no DB`);
        throw new Error(`Dual-pass agreement below threshold for ${sourceId}`);
    }

    console.log(`\n✅ Dual-pass PASSOU para ${sourceId}`);
    return comparison.consensus;
}

/**
 * CLI Entry Point
 */
if (require.main === module) {
    // Exemplo de uso
    console.log('Dual-Pass Extractor');
    console.log('Uso: ts-node dual-pass-extractor.ts <source_id> <text_file> <output_dir>');
}

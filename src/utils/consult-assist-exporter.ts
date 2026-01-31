/**
 * Consult Assist Exporter
 *
 * Utilitário para expor consult_assist (TRILHA 2) para médicos.
 * NÃO entra no laudo, mas fica disponível para consulta/cópia manual.
 */

import fs from 'fs';
import path from 'path';
import type { ReportJSON, ConsultAssistEntry } from '../types/report-json';

export interface ExportOptions {
  outputDir?: string;
  format?: 'json' | 'markdown' | 'both';
  includeMetadata?: boolean;
}

/**
 * Exporta consult_assist para arquivo separado
 */
export function exportConsultAssist(
  report: ReportJSON,
  options: ExportOptions = {}
): { jsonPath?: string; mdPath?: string } | null {

  const consultAssist = (report as any).consult_assist as ConsultAssistEntry[] | undefined;

  if (!consultAssist || consultAssist.length === 0) {
    console.log('[ConsultAssist] No entries to export');
    return null;
  }

  const {
    outputDir = './output/consult-assist',
    format = 'both',
    includeMetadata = true
  } = options;

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  const baseName = `${report.case_id}_medical_consult`;
  const result: { jsonPath?: string; mdPath?: string } = {};

  // Export JSON
  if (format === 'json' || format === 'both') {
    const jsonPath = path.join(outputDir, `${baseName}.json`);

    const exportData = includeMetadata ? {
      case_id: report.case_id,
      exported_at: new Date().toISOString(),
      findings_count: report.findings?.length || 0,
      consult_entries: consultAssist,
      disclaimer: 'Este conteúdo é para CONSULTA MÉDICA. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar. NÃO faz parte do laudo oficial.'
    } : consultAssist;

    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
    result.jsonPath = jsonPath;

    console.log(`💡 [ConsultAssist] JSON exportado: ${jsonPath}`);
  }

  // Export Markdown
  if (format === 'markdown' || format === 'both') {
    const mdPath = path.join(outputDir, `${baseName}.md`);
    const markdown = generateMarkdown(report.case_id, consultAssist, includeMetadata);

    fs.writeFileSync(mdPath, markdown);
    result.mdPath = mdPath;

    console.log(`💡 [ConsultAssist] Markdown exportado: ${mdPath}`);
  }

  return result;
}

/**
 * Gera Markdown formatado do consult_assist
 */
function generateMarkdown(
  caseId: string,
  entries: ConsultAssistEntry[],
  includeMetadata: boolean
): string {

  const lines: string[] = [];

  // Header
  lines.push('# ASSISTÊNCIA MÉDICA (CONSULTA EXTERNA)');
  lines.push('');
  lines.push('> ⚠️ **IMPORTANTE:** Este conteúdo NÃO faz parte do laudo oficial.');
  lines.push('> É fornecido apenas para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.');
  lines.push('');

  if (includeMetadata) {
    lines.push(`**Caso:** ${caseId}`);
    lines.push(`**Data de Export:** ${new Date().toISOString().split('T')[0]}`);
    lines.push(`**Entradas:** ${entries.length}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Each entry
  entries.forEach((entry, idx) => {
    lines.push(`## ${idx + 1}. ${entry.title}`);
    lines.push('');

    // Summary
    lines.push('**Resumo:**');
    lines.push('');
    lines.push(entry.summary);
    lines.push('');

    // Suggested actions
    if (entry.suggested_actions.length > 0) {
      lines.push('**Ações Sugeridas:**');
      lines.push('');
      entry.suggested_actions.forEach(action => {
        lines.push(`- ${action}`);
      });
      lines.push('');
    }

    // Evidence quality
    lines.push(`**Qualidade da Evidência:** ${entry.evidence_quality}`);
    lines.push('');

    // Conflicts/Caveats
    if (entry.conflicts_or_caveats.length > 0) {
      lines.push('**Ressalvas e Conflitos:**');
      lines.push('');
      entry.conflicts_or_caveats.forEach(caveat => {
        lines.push(`- ⚠️ ${caveat}`);
      });
      lines.push('');
    }

    // Sources
    if (entry.sources.length > 0) {
      lines.push('**Fontes:**');
      lines.push('');
      entry.sources.forEach((source, sIdx) => {
        lines.push(`${sIdx + 1}. **${source.organization_or_journal}** (${source.year})`);
        lines.push(`   - ${source.title}`);
        lines.push(`   - Tipo: ${source.source_type} | Relevância: ${source.relevance}`);
        lines.push(`   - URL: ${source.url}`);
        if (source.doi) {
          lines.push(`   - DOI: ${source.doi}`);
        }
        lines.push(`   - Acesso em: ${source.accessed_at}`);
        lines.push('');
      });
    }

    // Numeric safety
    lines.push('**Segurança Numérica:**');
    lines.push(`- Números incluídos: ${entry.numeric_safety.numbers_included ? 'Sim' : 'Não'}`);
    lines.push(`- Regra: ${entry.numeric_safety.rule}`);
    lines.push('');

    // Copy-ready note
    lines.push('---');
    lines.push('');
    lines.push(`> 📋 ${entry.copy_ready_note}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  // Footer
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Sistema:** Radon AI - Sistema de Recomendações em 3 Trilhas');
  lines.push('**Trilha:** TRILHA 2 (CONSULTA) - Evidências externas para assistência médica');
  lines.push('');

  return lines.join('\n');
}

/**
 * Exporta TRILHA 3 (library_ingestion_candidates) para staging
 */
export function exportIngestionCandidates(
  report: ReportJSON,
  options: ExportOptions = {}
): string | null {

  const candidates = (report as any).library_ingestion_candidates;

  if (!candidates || candidates.length === 0) {
    console.log('[Ingestion] No candidates to export');
    return null;
  }

  const {
    outputDir = './output/library-staging',
  } = options;

  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `${report.case_id}_staging_candidates.json`);

  const exportData = {
    case_id: report.case_id,
    exported_at: new Date().toISOString(),
    status: 'pending_review',
    candidates_count: candidates.length,
    candidates: candidates
  };

  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));

  console.log(`📥 [Ingestion] Candidatos exportados: ${jsonPath}`);

  return jsonPath;
}

/**
 * Wrapper: exporta ambas as trilhas (2 e 3) se presentes
 */
export function exportAuxiliaryTracks(
  report: ReportJSON,
  options: ExportOptions = {}
): { consultAssist?: any; ingestionCandidates?: string } {

  const result: { consultAssist?: any; ingestionCandidates?: string } = {};

  // TRILHA 2: CONSULTA
  const consultResult = exportConsultAssist(report, options);
  if (consultResult) {
    result.consultAssist = consultResult;
  }

  // TRILHA 3: CURADORIA
  const ingestionResult = exportIngestionCandidates(report, options);
  if (ingestionResult) {
    result.ingestionCandidates = ingestionResult;
  }

  return result;
}

export default {
  exportConsultAssist,
  exportIngestionCandidates,
  exportAuxiliaryTracks
};


import { AttachmentDoc } from '../types';

const DEBUG_LOGS = true;

export interface ReportGroup {
  id: string;
  title: string;
  docIds: string[];
  docs: AttachmentDoc[];
  date?: string;
  type?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  isBlocked?: boolean;
  blockingReasons?: string[];
}

/**
 * Agrupa documentos visualmente.
 *
 * Ordem de prioridade para agrupamento:
 * 1. globalGroupId (análise global de PDF) - MAIS CONFIÁVEL
 * 2. MANUAL_SPLIT (divisão manual pelo usuário)
 * 3. PDF source + hint da IA
 * 4. Hint forte da IA para imagens soltas
 * 5. Documento avulso (sem agrupamento)
 */
export function groupDocsVisuals(docs: AttachmentDoc[]): ReportGroup[] {
  const groups = new Map<string, AttachmentDoc[]>();
  if (DEBUG_LOGS) {
    console.log('[Debug][Grouping] input', { docs: docs.length });
  }

  docs.forEach(doc => {
    // Normaliza o hint para evitar nulos e diferenças de caixa
    const hint = (doc.reportGroupHint || '').trim();
    const hasStrongHint = isStrongReportHint(hint);
    const isManualSplit = hint.startsWith('MANUAL_SPLIT:');

    // PRIORIDADE 1: Agrupamento Global (análise global de PDF)
    // Este é o método mais confiável pois a IA viu todas as páginas juntas
    if (doc.globalGroupId !== undefined && doc.globalGroupSource && !isManualSplit) {
      const key = `global::${doc.globalGroupSource}::${doc.globalGroupId}`;
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
      return;
    }

    // PRIORIDADE 2: Divisão manual pelo usuário (MANUAL_SPLIT)
    // Respeita sempre a decisão do usuário
    if (isManualSplit && doc.source.includes('PDF Pg')) {
      const baseName = doc.source.split(' PDF Pg ')[0];
      const key = `pdf::${baseName}::${hint}`;
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
      return;
    }

    // PRIORIDADE 3: Agrupamento por origem de arquivo PDF + hint da IA
    // Fallback para quando não há análise global
    if (doc.source.includes('PDF Pg') || doc.source.includes('.pdf Pg') || doc.source.includes('Pg ')) {
      const normalizedHint = hint || 'default';
      // Extrai nome base do PDF corretamente
      const baseName = doc.source.split(' Pg ')[0];
      const key = `pdf::${baseName}::${normalizedHint}`;
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
      return;
    }

    // PRIORIDADE 4: Agrupamento por Hint da IA (imagens soltas)
    if (hasStrongHint) {
      const key = `hint::${hint}`;
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
      return;
    }

    // PRIORIDADE 5: Documento avulso (imagem solta sem hint forte)
    const key = `single::${doc.id}`;
    groups.set(key, [doc]);
  });

  const result: ReportGroup[] = [];

  // Contagem para saber se um PDF foi quebrado em múltiplos grupos
  const pdfBaseNameCounts = new Map<string, number>();
  groups.forEach((_, key) => {
    // Conta tanto grupos globais quanto PDF tradicionais
    if (key.startsWith('global::') || key.startsWith('pdf::')) {
      const baseName = key.split('::')[1];
      pdfBaseNameCounts.set(baseName, (pdfBaseNameCounts.get(baseName) || 0) + 1);
    }
  });

  groups.forEach((groupDocs, key) => {
    // CORREÇÃO CENÁRIO 1: Ordenação Natural (Natural Sort)
    // Garante que "Pg 2" venha antes de "Pg 10"
    groupDocs.sort((a, b) => {
      return a.source.localeCompare(b.source, undefined, { numeric: true, sensitivity: 'base' });
    });

    // O status do grupo é o pior status dos seus membros
    let groupStatus: ReportGroup['status'] = 'done';
    if (groupDocs.some(d => d.status === 'error')) groupStatus = 'error';
    else if (groupDocs.some(d => d.status === 'processing')) groupStatus = 'processing';
    else if (groupDocs.some(d => d.status === 'pending')) groupStatus = 'pending';

    // Metadados representativos (prioriza o que tem detailedAnalysis completo)
    const representative = groupDocs.find(d => d.metadata?.reportType) || groupDocs[0];

    // Título Amigável
    let title = representative.source;

    // PRIORIDADE 1: Agrupamento Global - usar tipo detectado
    if (key.startsWith('global::')) {
      const parts = key.split('::');
      const baseName = parts[1];
      const globalGroupId = parts[2];

      // Verificar se há múltiplos grupos do mesmo PDF
      const sameBasePdfGroups = Array.from(groups.keys()).filter(k =>
        k.startsWith(`global::${baseName}::`)
      ).length;

      // Usar o tipo detectado pela análise global
      const globalType = representative.globalGroupType;

      if (sameBasePdfGroups > 1 && globalType) {
        // Múltiplos laudos no mesmo PDF - mostrar tipo
        title = `${baseName} - ${globalType}`;
      } else if (globalType && globalType !== 'Documento não classificado' && globalType !== 'Indefinido') {
        // PDF com único laudo mas tipo identificado
        title = `${baseName} (${globalType})`;
      } else {
        title = baseName;
      }

      // Indicar se é provisório ou adendo
      if (representative.isProvisorio) {
        title += ' [Provisório]';
      }
      if (representative.isAdendo) {
        title += ' [Adendo]';
      }
    }
    // PRIORIDADE 2-3: PDF tradicional
    else if (key.startsWith('pdf::')) {
      const parts = key.split('::');
      const baseName = parts[1];
      const rawHint = parts[2];
      const hasMultipleGroups = (pdfBaseNameCounts.get(baseName) || 0) > 1;

      // Se o PDF foi quebrado em vários exames, usamos o Hint para diferenciar no título
      const hintLabel = (representative.reportGroupHint || '').trim() || (rawHint !== 'default' ? rawHint : '');

      const displayHint = hintLabel.startsWith('MANUAL_SPLIT:')
        ? formatManualHint(hintLabel)
        : formatGlobalHint(hintLabel);

      if (hasMultipleGroups && displayHint) {
        title = `${baseName} - ${displayHint}`;
      } else {
        title = baseName;
      }
    }
    // PRIORIDADE 4: Hint da IA
    else if (key.startsWith('hint::')) {
      title = representative.reportGroupHint || 'Grupo Identificado';
    }

    const group: ReportGroup = {
      id: key,
      title: title,
      docIds: groupDocs.map(d => d.id),
      docs: groupDocs,
      date: representative.metadata?.reportDate || representative.metadata?.displayDate,
      type: representative.metadata?.reportType || (groupDocs.length > 1 ? 'Documento Multipágina' : 'Documento'),
      status: groupStatus
    };

    // BARREIRA DE SEGURANÇA (Fase 1: Segurança Clínica)
    const validation = validateGroupConsistency(groupDocs);
    if (validation.isBlocked) {
      group.isBlocked = true;
      group.blockingReasons = validation.reasons;
      group.status = 'error';
    }

    result.push(group);
  });

  if (DEBUG_LOGS) {
    console.log('[Debug][Grouping] output', { groups: result.length });
  }
  return result;
}

function formatManualHint(hint: string): string {
  const parts = hint.split(':');
  if (parts.length >= 3 && parts[2]) {
    return `Laudo Manual ${parts[2]}`;
  }
  return 'Laudo Manual';
}

/**
 * Formata hint global para exibição amigável.
 * Ex: "GLOBAL:1|PDF:arquivo.pdf|TIPO:TOMOGRAFIA DE TORAX" -> "TOMOGRAFIA DE TORAX"
 */
function formatGlobalHint(hint: string): string {
  if (!hint) return '';

  // Extrair o tipo do hint global
  const tipoMatch = hint.match(/\|TIPO:([^|]+)/i);
  if (tipoMatch && tipoMatch[1]) {
    const tipo = tipoMatch[1].trim();
    if (tipo !== 'Documento não classificado' && tipo !== 'Indefinido') {
      return tipo;
    }
  }

  // Extrair o exame do hint tradicional
  const exameMatch = hint.match(/\|EXAME:([^|]+)/i);
  if (exameMatch && exameMatch[1]) {
    return exameMatch[1].trim();
  }

  // Se for ID, mostrar ID
  if (hint.startsWith('ID:')) {
    return hint;
  }

  return '';
}

/**
 * Valida a consistência do grupo (Segurança Clínica).
 * Impede que documentos de pacientes diferentes sejam agrupados.
 */
function validateGroupConsistency(docs: AttachmentDoc[]): { isBlocked: boolean, reasons: string[] } {
  const reasons: string[] = [];

  if (docs.length <= 1) return { isBlocked: false, reasons: [] };

  const osValues = new Set<string>();
  const nameValues = new Set<string>();

  docs.forEach(doc => {
    // Pegamos os metadados extraídos individualmente de cada página do laudo
    const pageOs = (doc.detailedAnalysis?.report_metadata?.os || '').trim().toUpperCase();
    const pageName = (doc.detailedAnalysis?.report_metadata?.paciente || '').trim().toUpperCase();

    // Só validamos se os dados foram de fato extraídos (evitamos bloquear campos vazios se o OCR falhou totalmente na página)
    // Mas se tivermos 2 páginas com IDs diferentes, é um hard stop.
    if (pageOs && pageOs.length > 3) osValues.add(pageOs);
    if (pageName && pageName.length > 5) nameValues.add(pageName);
  });

  // CRÍTICO: Bloqueio se houver divergência de OS
  if (osValues.size > 1) {
    reasons.push(`Divergência de OS detectada: ${Array.from(osValues).join(' vs ')}`);
  }

  // CRÍTICO: Bloqueio se houver divergência de Nome (considerando pequenas variações se necessário, mas aqui seremos estritos)
  if (nameValues.size > 1) {
    reasons.push(`Divergência de Paciente detectada: ${Array.from(nameValues).join(' vs ')}`);
  }

  return { isBlocked: reasons.length > 0, reasons };
}

function isStrongReportHint(hint: string): boolean {
  if (!hint) return false;
  const normalized = hint.trim().toUpperCase();
  if (!normalized) return false;
  if (normalized.startsWith('ID:')) return true;
  if (normalized.startsWith('GLOBAL:')) return true;
  if (normalized.startsWith('MANUAL_GROUP:')) return true; // Agrupamento manual de imagens simultâneas
  if (normalized.includes('|EXAME:')) return true;
  if (normalized.includes('|TIPO:')) return true; // Tipo detectado pela análise global
  return false;
}

// ============================================================================
// BUNDLE DE PDF - Agrupa ReportGroups que vêm do mesmo arquivo PDF
// ============================================================================

/**
 * Interface para bundles de PDF.
 * Um bundle agrupa múltiplos ReportGroup que vieram do mesmo PDF.
 */
export interface PdfBundle {
  pdfBaseName: string;
  groups: ReportGroup[];
}

/**
 * Extrai o nome base do PDF a partir do ID do grupo.
 * Ex: "pdf::arquivo.pdf::tipo" → "arquivo.pdf"
 * Ex: "global::arquivo.pdf::1" → "arquivo.pdf"
 */
function extractPdfBaseName(groupId: string): string | null {
  if (groupId.startsWith('pdf::') || groupId.startsWith('global::')) {
    const parts = groupId.split('::');
    return parts[1] || null;
  }
  return null;
}

/**
 * Agrupa ReportGroups que vêm do mesmo PDF para exibir como abas.
 * 
 * IMPORTANTE: Esta função cria GRUPOS VIRTUAIS por classificação.
 * Extrai todos os docs dos grupos originais e reagrupa por tipo de documento.
 * 
 * @param groups - Lista de ReportGroups gerados por groupDocsVisuals
 * @returns Lista de PdfBundles, onde cada bundle contém grupos separados por classificação
 */
export function groupReportsByPdf(groups: ReportGroup[]): PdfBundle[] {
  const pdfMap = new Map<string, ReportGroup[]>();
  const nonPdfGroups: ReportGroup[] = [];

  // Primeiro, agrupa todos os grupos pelo baseName do PDF
  groups.forEach(group => {
    const baseName = extractPdfBaseName(group.id);
    if (baseName) {
      const list = pdfMap.get(baseName) || [];
      list.push(group);
      pdfMap.set(baseName, list);
    } else {
      // Grupos que não são de PDF (imagens soltas, etc)
      nonPdfGroups.push(group);
    }
  });

  const bundles: PdfBundle[] = [];

  // Para cada PDF, preserva grupos originais e só divide quando um grupo é misto
  pdfMap.forEach((pdfGroups, baseName) => {
    const normalizedGroups: ReportGroup[] = [];

    pdfGroups.forEach(group => {
      const classifications = Array.from(new Set(group.docs.map(doc => doc.classification || 'indeterminado')));

      if (classifications.length <= 1) {
        normalizedGroups.push(group);
        return;
      }

      classifications.forEach(classification => {
        const docs = group.docs.filter(doc => (doc.classification || 'indeterminado') === classification);
        docs.sort((a, b) => a.source.localeCompare(b.source, undefined, { numeric: true }));

        let groupStatus: ReportGroup['status'] = 'done';
        if (docs.some(d => d.status === 'error')) groupStatus = 'error';
        else if (docs.some(d => d.status === 'processing')) groupStatus = 'processing';
        else if (docs.some(d => d.status === 'pending')) groupStatus = 'pending';

        const representative = docs.find(d => d.metadata?.reportType) || docs[0];
        const validation = validateGroupConsistency(docs);
        if (validation.isBlocked) {
          groupStatus = 'error';
        }

        normalizedGroups.push({
          id: `virtual::${baseName}::${classification}::${group.id}`,
          title: `${baseName} - ${classification}`,
          docIds: docs.map(d => d.id),
          docs,
          date: representative?.metadata?.reportDate,
          type: representative?.metadata?.reportType || classification,
          status: groupStatus,
          isBlocked: validation.isBlocked || undefined,
          blockingReasons: validation.reasons.length ? validation.reasons : undefined
        });
      });
    });

    bundles.push({ pdfBaseName: baseName, groups: normalizedGroups });
  });

  // Grupos solo (imagens, etc) - cada um é seu próprio bundle
  nonPdfGroups.forEach(g => {
    bundles.push({ pdfBaseName: '', groups: [g] });
  });

  if (DEBUG_LOGS) {
    console.log('[Debug][Grouping] groupReportsByPdf output', {
      totalBundles: bundles.length,
      multiBundles: bundles.filter(b => b.groups.length > 1).length,
      groupCounts: bundles.map(b => b.groups.length)
    });
  }

  return bundles;
}

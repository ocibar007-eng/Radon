
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
}

/**
 * Agrupa documentos visualmente.
 * 1. Se veio de PDF (source contém "PDF Pg"), agrupa pelo nome do arquivo base + Dica da IA.
 *    - Isso permite que um único PDF contendo 2 exames (ex: Abdome e Tórax) seja dividido em 2 grupos se os hints forem diferentes.
 * 2. Se tem hint da IA, usa o hint.
 * 3. Se for upload avulso, fica sozinho.
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
    
    // Lógica 1: Agrupamento por origem de arquivo PDF
    // Ex: "MeuExame.pdf PDF Pg 1" -> Key Base: "MeuExame.pdf"
    if (doc.source.includes('PDF Pg')) {
      const normalizedHint = hint || 'default';
      const baseName = doc.source.split(' PDF Pg ')[0]; // Remove o sufixo da página
      
      // COMBINA NOME DO ARQUIVO + HINT DA IA (pode ser MANUAL_SPLIT)
      const key = `pdf::${baseName}::${normalizedHint}`;
      
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
    } 
    // Lógica 2: Agrupamento por Hint da IA (se disponível e não for PDF split)
    else if (hasStrongHint) { 
      const key = `hint::${hint}`; 
      const list = groups.get(key) || [];
      list.push(doc);
      groups.set(key, list);
    }
    // Lógica 3: Documento avulso (imagem solta sem hint forte)
    else {
      const key = `single::${doc.id}`;
      groups.set(key, [doc]);
    }
  });

  const result: ReportGroup[] = [];

  // Contagem para saber se um PDF foi quebrado em múltiplos grupos
  const pdfBaseNameCounts = new Map<string, number>();
  groups.forEach((_, key) => {
    if (key.startsWith('pdf::')) {
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
    
    if (key.startsWith('pdf::')) {
        const parts = key.split('::');
        const baseName = parts[1];
        const rawHint = parts[2];
        const hasMultipleGroups = (pdfBaseNameCounts.get(baseName) || 0) > 1;
        
        // Se o PDF foi quebrado em vários exames, usamos o Hint para diferenciar no título
        const hintLabel = (representative.reportGroupHint || '').trim() || (rawHint !== 'default' ? rawHint : '');
        
        const displayHint = hintLabel.startsWith('MANUAL_SPLIT:')
          ? formatManualHint(hintLabel)
          : hintLabel;

        if (hasMultipleGroups && displayHint) {
             title = `${baseName} - ${displayHint}`;
        } else {
             title = baseName;
        }
    } else if (key.startsWith('hint::')) {
        title = representative.reportGroupHint || 'Grupo Identificado';
    }

    result.push({
      id: key,
      title: title,
      docIds: groupDocs.map(d => d.id),
      docs: groupDocs,
      date: representative.metadata?.reportDate || representative.metadata?.displayDate,
      type: representative.metadata?.reportType || (groupDocs.length > 1 ? 'Documento Multipágina' : 'Documento'),
      status: groupStatus
    });
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

function isStrongReportHint(hint: string): boolean {
  if (!hint) return false;
  const normalized = hint.trim().toUpperCase();
  if (!normalized) return false;
  if (normalized.startsWith('ID:')) return true;
  return normalized.includes('|EXAME:');
}

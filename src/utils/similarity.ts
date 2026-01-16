
import { AttachmentDoc } from '../types';

export interface SimilarityResult {
  score: number; // 0 a 1
  reasons: string[];
  shouldAsk: boolean; // Se deve perguntar ao usuário
  shouldAutoGroup: boolean; // Se deve agrupar automaticamente
}

/**
 * Normaliza um nome removendo acentos, espaços extras e convertendo para maiúsculas
 */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza uma data para formato YYYY-MM-DD
 */
function normalizeDate(date: string): string {
  if (!date) return '';

  // Se já está no formato correto
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  // Tenta converter DD/MM/YYYY para YYYY-MM-DD
  const match = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return date;
}

/**
 * Calcula a similaridade entre dois documentos para determinar se devem ser agrupados.
 * Usado principalmente para imagens soltas enviadas sequencialmente.
 *
 * Thresholds:
 * - score >= 0.85: Agrupar automaticamente
 * - score >= 0.5 e < 0.85: Perguntar ao usuário
 * - score < 0.5: Manter separado
 */
export function calculateDocSimilarity(doc1: AttachmentDoc, doc2: AttachmentDoc): SimilarityResult {
  let score = 0;
  const reasons: string[] = [];

  // Metadados da análise detalhada
  const meta1 = doc1.detailedAnalysis?.report_metadata;
  const meta2 = doc2.detailedAnalysis?.report_metadata;

  // Se não há metadados de análise, não podemos comparar com confiança
  if (!meta1 || !meta2) {
    return {
      score: 0,
      reasons: ['Metadados insuficientes para comparação'],
      shouldAsk: false,
      shouldAutoGroup: false
    };
  }

  // Critério 1: Mesmo paciente (alto peso)
  if (meta1.paciente && meta2.paciente) {
    const name1 = normalizeName(meta1.paciente);
    const name2 = normalizeName(meta2.paciente);

    if (name1 && name2 && name1 === name2) {
      score += 0.35;
      reasons.push('Mesmo paciente');
    } else if (name1 && name2 && name1 !== name2) {
      // Pacientes diferentes = definitivamente não agrupar
      return {
        score: 0,
        reasons: ['Pacientes diferentes - não agrupar'],
        shouldAsk: false,
        shouldAutoGroup: false
      };
    }
  }

  // Critério 2: Mesma OS (muito alto peso)
  if (meta1.os && meta2.os) {
    const os1 = meta1.os.trim();
    const os2 = meta2.os.trim();

    if (os1 && os2 && os1 === os2) {
      score += 0.3;
      reasons.push('Mesma OS');
    } else if (os1 && os2 && os1 !== os2) {
      // OS diferentes = provavelmente não agrupar
      score -= 0.3;
      reasons.push('OS diferentes');
    }
  }

  // Critério 3: Mesma data de realização (peso médio)
  if (meta1.data_realizacao && meta2.data_realizacao) {
    const date1 = normalizeDate(meta1.data_realizacao);
    const date2 = normalizeDate(meta2.data_realizacao);

    if (date1 && date2) {
      if (date1 === date2) {
        score += 0.15;
        reasons.push('Mesma data de realização');
      } else {
        // Datas diferentes + mesmo tipo de exame = follow-up, não agrupar!
        if (meta1.tipo_exame && meta2.tipo_exame &&
            normalizeName(meta1.tipo_exame) === normalizeName(meta2.tipo_exame)) {
          score -= 0.4;
          reasons.push('Possível follow-up (mesmo exame, datas diferentes)');
        }
      }
    }
  }

  // Critério 4: Mesmo serviço de origem (peso médio)
  const servico1 = meta1.servico_origem?.nome || '';
  const servico2 = meta2.servico_origem?.nome || '';

  if (servico1 && servico2) {
    if (normalizeName(servico1) === normalizeName(servico2)) {
      score += 0.1;
      reasons.push('Mesmo serviço de origem');
    }
  }

  // Critério 5: Tipo de exame (peso importante para separação)
  if (meta1.tipo_exame && meta2.tipo_exame) {
    const tipo1 = normalizeName(meta1.tipo_exame);
    const tipo2 = normalizeName(meta2.tipo_exame);

    if (tipo1 === tipo2) {
      // Mesmo tipo pode ser mesmo laudo OU follow-up
      // Só adiciona pontos se as datas forem iguais
      const date1 = normalizeDate(meta1.data_realizacao || '');
      const date2 = normalizeDate(meta2.data_realizacao || '');

      if (date1 === date2 || !date1 || !date2) {
        score += 0.1;
        reasons.push('Mesmo tipo de exame');
      }
    } else {
      // Tipos diferentes = laudos diferentes!
      // TC Tórax ≠ TC Abdome
      score -= 0.3;
      reasons.push('Tipos de exame diferentes');
    }
  }

  // Normalizar score para ficar entre 0 e 1
  const normalizedScore = Math.max(0, Math.min(1, score));

  // Determinar ações baseadas no score
  const shouldAutoGroup = normalizedScore >= 0.85;
  const shouldAsk = normalizedScore >= 0.5 && normalizedScore < 0.85;

  return {
    score: normalizedScore,
    reasons,
    shouldAsk,
    shouldAutoGroup
  };
}

/**
 * Encontra documentos candidatos para agrupamento com um documento novo.
 * Retorna lista ordenada por score de similaridade.
 */
export function findGroupingCandidates(
  newDoc: AttachmentDoc,
  existingDocs: AttachmentDoc[]
): Array<{ doc: AttachmentDoc; similarity: SimilarityResult }> {
  const candidates: Array<{ doc: AttachmentDoc; similarity: SimilarityResult }> = [];

  for (const existingDoc of existingDocs) {
    // Só compara com docs que ainda não estão em um grupo global
    if (existingDoc.globalGroupId !== undefined) continue;

    // Só compara laudos prévios
    if (existingDoc.classification !== 'laudo_previo') continue;
    if (newDoc.classification !== 'laudo_previo') continue;

    const similarity = calculateDocSimilarity(newDoc, existingDoc);

    // Só inclui se tiver alguma possibilidade de agrupamento
    if (similarity.score > 0) {
      candidates.push({ doc: existingDoc, similarity });
    }
  }

  // Ordena por score decrescente
  candidates.sort((a, b) => b.similarity.score - a.similarity.score);

  return candidates;
}

/**
 * Verifica se é um cenário de errata/adendo baseado no texto verbatim
 */
export function isErrataOrAdendo(verbatimText: string): boolean {
  if (!verbatimText) return false;

  const keywords = ['ERRATA', 'ADENDO', 'COMPLEMENTO', 'RETIFICAÇÃO', 'CORREÇÃO', 'ADITIVO'];
  const upper = verbatimText.toUpperCase();

  return keywords.some(k => upper.includes(k));
}

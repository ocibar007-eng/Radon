import { FormulaMetaMap } from '../../generated/formula-registry';
import type { ComputeRequest } from '../../types/compute-request';
import type { ReportAuditEntry } from '../../types/report-json';
import type { FindingsOutput } from './agents/types';

export const INFERENCE_LEVEL = 'cautious' as const;

type InferenceResult = {
  requests: ComputeRequest[];
  auditEntries: ReportAuditEntry[];
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  return false;
}

function getRequiredKeys(formula: string): string[] {
  const meta = (FormulaMetaMap as Record<string, { inputs?: Array<{ key?: string; name?: string; required?: boolean | string }> }>)[formula];
  if (!meta?.inputs) return [];
  return meta.inputs
    .filter((input) => input.required === true || input.required === 'true')
    .map((input) => input.key || input.name)
    .filter((key): key is string => Boolean(key));
}

function setIfMissing(
  inputs: Record<string, unknown>,
  key: string,
  value: unknown,
  reason: string,
  inferred: string[]
): void {
  if (!isMissing(inputs[key])) return;
  inputs[key] = value;
  inferred.push(`${key}=${String(value)} (${reason})`);
}

function inferBoolean(
  normalized: string,
  positive: string[],
  negative: string[]
): boolean | undefined {
  if (includesAny(normalized, negative)) return false;
  if (includesAny(normalized, positive)) return true;
  return undefined;
}

function inferBosniak(
  inputs: Record<string, unknown>,
  normalizedDesc: string,
  normalizedOrgan: string,
  inferred: string[]
): void {
  const isKidney = normalizedOrgan.includes('RIM') || normalizedOrgan.includes('RENAL');
  const simpleCyst = isKidney && normalizedDesc.includes('CISTO SIMPLES');

  if (simpleCyst) {
    setIfMissing(inputs, 'realce_hu', 0, 'cisto simples informado', inferred);
    setIfMissing(inputs, 'componentes_solidos', false, 'cisto simples informado', inferred);
    setIfMissing(inputs, 'septos', false, 'cisto simples informado', inferred);
    setIfMissing(inputs, 'calcificacao', false, 'cisto simples informado', inferred);
    setIfMissing(inputs, 'fluido_simples', true, 'cisto simples informado', inferred);
    setIfMissing(inputs, 'homogeneo', true, 'cisto simples informado', inferred);
  }

  if (includesAny(normalizedDesc, [
    'TSTC',
    'TOO SMALL TO CHARACTERIZE',
    'MUITO PEQUENO PARA CARACTERIZAR',
    'PEQUENO DEMAIS PARA CARACTERIZAR',
    'CARACTERIZACAO LIMITADA',
    'PEQUENAS DIMENSOES',
    'VOLUME PARCIAL',
  ])) {
    setIfMissing(inputs, 'muito_pequeno_caracterizar', true, 'tstc/limitacao descrita', inferred);
  }

  const noEnhancement = includesAny(normalizedDesc, [
    'SEM REALCE',
    'NAO REALCA',
    'NAO REALCE',
    'SEM REALCE SIGNIFICATIVO',
  ]);
  const hasEnhancement = !noEnhancement && normalizedDesc.includes('REALCE');

  if (noEnhancement) {
    setIfMissing(inputs, 'realce_hu', 0, 'sem realce descrito', inferred);
  } else if (hasEnhancement) {
    setIfMissing(inputs, 'realce_hu', 20, 'realce descrito', inferred);
  }

  const solids = inferBoolean(
    normalizedDesc,
    ['COMPONENTE SOLIDO', 'NODULO MURAL'],
    ['SEM COMPONENTE SOLIDO', 'SEM NODULO MURAL']
  );
  if (solids !== undefined) {
    setIfMissing(inputs, 'componentes_solidos', solids, 'descricao do laudo', inferred);
  }

  const septa = inferBoolean(
    normalizedDesc,
    ['SEPTOS', 'SEPTADO', 'SEPTACAO'],
    ['SEM SEPTO', 'SEM SEPTOS']
  );
  if (septa !== undefined) {
    setIfMissing(inputs, 'septos', septa, 'descricao do laudo', inferred);
  }

  const calc = inferBoolean(
    normalizedDesc,
    ['CALCIFICACAO', 'CALCIFICADO'],
    ['SEM CALCIFICACAO']
  );
  if (calc !== undefined) {
    setIfMissing(inputs, 'calcificacao', calc, 'descricao do laudo', inferred);
  }
}

function getBosniakMissing(inputs: Record<string, unknown>): string[] {
  const hasSignal = [
    'fluido_simples',
    'muito_pequeno_caracterizar',
    'atenuacao_hu_pre',
    'atenuacao_hu_portal',
    'realce_hu',
    'parede_espessura_mm',
    'septos_espessura_mm',
    'parede_irregular',
    'septos_irregulares',
    'nodulo_realce',
    'hiperintenso_t2_csf',
    'hiperintenso_t1_marcado',
    'hiperintenso_t1_heterogeneo_fs',
    'septos',
    'calcificacao',
    'componentes_solidos',
  ].some((key) => !isMissing(inputs[key]));

  if (hasSignal) return [];

  return ['dados insuficientes (realce/parede/septos/atenuacao/sinais RM)'];
}

function inferPirads(inputs: Record<string, unknown>, normalizedDesc: string, inferred: string[]): void {
  const hasPz = includesAny(normalizedDesc, ['ZONA PERIFERICA', 'PERIFERICA']);
  const hasTz = includesAny(normalizedDesc, ['ZONA DE TRANSICAO', 'ZONA TRANSICAO', 'TRANSICAO']);

  if (hasPz && !hasTz) {
    setIfMissing(inputs, 'localizacao', 'zona_periferica', 'zona periferica mencionada', inferred);
  } else if (hasTz && !hasPz) {
    setIfMissing(inputs, 'localizacao', 'zona_transicao', 'zona de transicao mencionada', inferred);
  }

  const dcePos = includesAny(normalizedDesc, ['DCE POSITIVO', 'REALCE DINAMICO POSITIVO', 'REALCE PRECOCE POSITIVO']);
  const dceNeg = includesAny(normalizedDesc, ['DCE NEGATIVO', 'SEM REALCE DINAMICO', 'SEM REALCE PRECOCE']);

  if (dcePos) {
    setIfMissing(inputs, 'dce_score', 1, 'DCE positivo descrito', inferred);
  } else if (dceNeg) {
    setIfMissing(inputs, 'dce_score', 0, 'DCE negativo descrito', inferred);
  }
}

function inferTirads(inputs: Record<string, unknown>, inferred: string[]): void {
  setIfMissing(inputs, 'forma', 'mais_larga_que_alta', 'padrao cauteloso (wider-than-tall)', inferred);
  setIfMissing(inputs, 'focos_ecogenicos', 'ausentes', 'padrao cauteloso (sem focos)', inferred);
}

function inferOradsUs(inputs: Record<string, unknown>, normalizedDesc: string, inferred: string[]): void {
  if (includesAny(normalizedDesc, ['CISTO SIMPLES', 'CISTO ANEXIAL SIMPLES'])) {
    setIfMissing(inputs, 'composicao', 'cistica_simples', 'descricao de cisto simples', inferred);
  } else if (includesAny(normalizedDesc, ['CISTO COMPLEXO', 'CISTO COMPLEXA'])) {
    setIfMissing(inputs, 'composicao', 'cistica_complexa', 'descricao de cisto complexo', inferred);
  } else if (normalizedDesc.includes('MISTA')) {
    setIfMissing(inputs, 'composicao', 'mista', 'descricao de lesao mista', inferred);
  } else if (normalizedDesc.includes('SOLIDA')) {
    setIfMissing(inputs, 'composicao', 'solida', 'descricao de lesao solida', inferred);
  }

  if (includesAny(normalizedDesc, ['SEM VASCULARIZACAO', 'VASCULARIZACAO AUSENTE', 'SEM VASCULARIDADE'])) {
    setIfMissing(inputs, 'vascularizacao', 'ausente', 'vascularizacao ausente descrita', inferred);
  } else if (includesAny(normalizedDesc, ['VASCULARIZACAO PRESENTE', 'COM VASCULARIZACAO', 'VASCULARIDADE PRESENTE'])) {
    setIfMissing(inputs, 'vascularizacao', 'presente', 'vascularizacao presente descrita', inferred);
  }
}

export function applyCautiousInference(
  findings: FindingsOutput,
  modality: string
): InferenceResult {
  const requests: ComputeRequest[] = [];
  const auditEntries: ReportAuditEntry[] = [];

  for (const finding of findings.findings) {
    if (!finding.compute_requests?.length) continue;
    const normalizedDesc = normalizeText(finding.description || '');
    const normalizedOrgan = normalizeText(finding.organ || '');

    for (const request of finding.compute_requests) {
      const inputs = { ...request.inputs } as Record<string, unknown>;
      const inferred: string[] = [];

      if (request.formula === 'ABD-0002') {
        const modalityTag = normalizeText(modality);
        if (modalityTag === 'MR') {
          setIfMissing(inputs, 'modalidade', 'MRI', 'modalidade do exame', inferred);
        } else if (modalityTag === 'CT') {
          setIfMissing(inputs, 'modalidade', 'CT', 'modalidade do exame', inferred);
        }
        inferBosniak(inputs, normalizedDesc, normalizedOrgan, inferred);
      } else if (request.formula === 'URO-0002') {
        inferPirads(inputs, normalizedDesc, inferred);
      } else if (request.formula === 'TIR-0001') {
        inferTirads(inputs, inferred);
      } else if (request.formula === 'GIN-0003') {
        if (normalizeText(modality) === 'MR') {
          auditEntries.push({
            type: 'missing',
            ref_id: request.ref_id,
            formula: request.formula,
            details: 'O-RADS RM nao implementado; fornecer criterios RM para classificar.',
          });
          continue;
        }
        inferOradsUs(inputs, normalizedDesc, inferred);
      }

      const missing = request.formula === 'ABD-0002'
        ? getBosniakMissing(inputs)
        : getRequiredKeys(request.formula).filter((key) => isMissing(inputs[key]));
      if (missing.length > 0) {
        auditEntries.push({
          type: 'missing',
          ref_id: request.ref_id,
          formula: request.formula,
          details: `Faltam campos obrigatorios: ${missing.join(', ')}. Completar para classificar.`,
        });
        continue;
      }

      if (inferred.length > 0) {
        auditEntries.push({
          type: 'inferred',
          ref_id: request.ref_id,
          formula: request.formula,
          details: `Inferencias aplicadas: ${inferred.join('; ')}.`,
        });
      }

      requests.push({
        ...request,
        inputs,
      });
    }
  }

  return { requests, auditEntries };
}

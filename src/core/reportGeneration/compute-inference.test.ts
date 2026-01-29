import { describe, it, expect } from 'vitest';
import { applyCautiousInference } from './compute-inference';
import type { FindingsOutput } from './agents/types';

describe('applyCautiousInference', () => {
  it('infers Bosniak inputs from "cisto simples"', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim direito',
          description: 'Cisto simples cortical no rim direito.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-1',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.realce_hu).toBe(0);
    expect(inputs.componentes_solidos).toBe(false);
    expect(inputs.septos).toBe(false);
    expect(inputs.calcificacao).toBe(false);
    expect(inputs.fluido_simples).toBe(true);
    expect(inputs.homogeneo).toBe(true);
    expect(result.auditEntries.some((entry) => entry.type === 'inferred')).toBe(true);
  });

  it('skips PI-RADS when required inputs are missing', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Prostata',
          description: 'Lesao focal na prostata sem detalhes de scores.',
          compute_requests: [
            {
              formula: 'URO-0002',
              inputs: {},
              ref_id: 'pirads-1',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'MR');
    expect(result.requests).toHaveLength(0);
    expect(result.auditEntries[0].type).toBe('missing');
    expect(result.auditEntries[0].details).toContain('t2_score');
  });

  it('defaults TI-RADS shape and echogenic foci when missing', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Tireoide',
          description: 'Nodulo tireoidiano solido hipoecoico.',
          compute_requests: [
            {
              formula: 'TIR-0001',
              inputs: {
                composicao: 'solida',
                ecogenicidade: 'hipoecoica',
                margens: 'bem_definidas',
              },
              ref_id: 'tirads-1',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'US');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.forma).toBe('mais_larga_que_alta');
    expect(inputs.focos_ecogenicos).toBe('ausentes');
  });

  it('flags TSTC for Bosniak when described', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim esquerdo',
          description: 'Cisto TSTC no rim esquerdo, muito pequeno para caracterizar.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-2',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.muito_pequeno_caracterizar).toBe(true);
  });

  it('infers Bosniak wall thickening and enhancement cues', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim direito',
          description: 'Lesao cistica com parede espessada e realce parietal.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-3',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.parede_espessura_mm).toBe(4);
    expect(inputs.parede_realce).toBe(true);
  });

  it('extracts septa count, thickness, and HU', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim esquerdo',
          description: 'Lesao cistica com 4 ou mais septos, septos com 3 mm e atenuacao 75 HU em fase sem contraste.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-4',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.numero_septos).toBe(4);
    expect(inputs.septos_espessura_mm).toBe(3);
    expect(inputs.atenuacao_hu_pre).toBe(75);
  });

  it('accepts explicit Bosniak class in dictation', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim esquerdo',
          description: 'Cisto simples Bosniak 1 no polo superior.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-5',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    expect(result.requests).toHaveLength(1);
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.categoria_declarada).toBe('I');
  });

  it('maps hyperdense non-contrast cue to Bosniak II', () => {
    const findings: FindingsOutput = {
      findings: [
        {
          organ: 'Rim direito',
          description: 'Cisto hiperdenso no sem contraste, densidade maior do que 20.',
          compute_requests: [
            {
              formula: 'ABD-0002',
              inputs: {},
              ref_id: 'bosniak-6',
            },
          ],
        },
      ],
    };

    const result = applyCautiousInference(findings, 'CT');
    const inputs = result.requests[0].inputs as Record<string, unknown>;
    expect(inputs.categoria_declarada).toBe('II');
  });
});

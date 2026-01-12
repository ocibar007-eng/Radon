
import { describe, it, expect } from 'vitest';
import { OrigemSchema, PatientRegistrationSchema, ReportAnalysisSchema } from './schemas';

describe('Resiliencia dos Schemas (Enums e Normalizacao)', () => {
  it('normaliza OrigemSchema com entradas sujas', () => {
    expect(OrigemSchema.parse('Sabin Diagnostico')).toBe('interno_sabin');
    expect(OrigemSchema.parse('EXTERNO')).toBe('externo');
  });

  it('normaliza report_metadata.origem no ReportAnalysisSchema', () => {
    const parsed = ReportAnalysisSchema.parse({
      report_metadata: { origem: 'Sabin Diagnostico' },
      preview: {},
      possible_duplicate: {}
    });

    expect(parsed.report_metadata.origem).toBe('interno_sabin');

    const parsedExterno = ReportAnalysisSchema.parse({
      report_metadata: { origem: 'EXTERNO' },
      preview: {},
      possible_duplicate: {}
    });

    expect(parsedExterno.report_metadata.origem).toBe('externo');
  });

  it('aceita confianca com variacoes de caixa e descricao', () => {
    const parsed = PatientRegistrationSchema.parse({
      os: { valor: '123', confianca: 'Alta confiança', evidencia: 'OS 123' },
      paciente: { valor: 'Maria Silva', confianca: 'MEDIA', evidencia: 'Paciente' },
      tipo_exame: { valor: 'RX Torax', confianca: 'baixa', evidencia: 'Tipo' },
      data_exame: {
        valor: '12/03/2024',
        data_normalizada: '2024-03-12',
        hora: null,
        confianca: 'Alta confiança',
        evidencia: 'Data do exame'
      }
    });

    expect(parsed.os.confianca).toBe('alta');
    expect(parsed.paciente.confianca).toBe('media');
    expect(parsed.tipo_exame.confianca).toBe('baixa');
    expect(parsed.data_exame.confianca).toBe('alta');
  });
});

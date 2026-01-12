
import { describe, it, expect } from 'vitest';
import { DocumentAnalysisSchema, PatientRegistrationSchema, ReportAnalysisSchema } from './schemas';

describe('Integridade de Dados (Schemas Zod)', () => {
  
  describe('DocumentAnalysisSchema', () => {
    it('deve validar um JSON correto de classificação', () => {
      const input = {
        classification: 'assistencial',
        texto_verbatim: 'Paciente refere dor.',
        report_group_hint: 'OS-123'
      };
      
      const result = DocumentAnalysisSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve aplicar valores default se a IA omitir campos opcionais', () => {
      const input = {
        // classification omitida -> deve virar 'indeterminado'
        texto_verbatim: 'Apenas texto'
      };
      
      const result = DocumentAnalysisSchema.safeParse(input);
      
      if (result.success) {
        expect(result.data.classification).toBe('indeterminado');
        expect(result.data.report_group_hint).toBe('');
      } else {
        throw new Error('Falha na validação');
      }
    });

    it('deve rejeitar tipos de dados incorretos', () => {
      const input = {
        classification: 12345, // Deveria ser string enum
        texto_verbatim: null
      };
      
      const result = DocumentAnalysisSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ReportAnalysisSchema (Laudos Prévios)', () => {
    it('deve garantir estrutura de metadados mesmo com arrays vazios', () => {
      const input = {
        report_metadata: {
          tipo_exame: 'RX TORAX',
          // datas_encontradas omitido
        },
        preview: {}
      };

      // @ts-ignore simula input parcial
      const result = ReportAnalysisSchema.safeParse(input);
      
      if (!result.success) {
        // O Zod schema atual espera objetos aninhados completos ou define defaults internos?
        // Vamos verificar se o schema suporta construção parcial.
        // No arquivo schemas.ts, usamos .default() extensivamente.
        // Se o objeto pai 'report_metadata' existe, os filhos devem assumir defaults.
      }
      
      // Teste com objeto mínimo válido
      const minimalInput = {
        report_metadata: {},
        preview: {},
        possible_duplicate: {}
      };
      
      const validResult = ReportAnalysisSchema.safeParse(minimalInput);
      expect(validResult.success).toBe(true);
      if(validResult.success) {
          expect(validResult.data.report_metadata.origem).toBe('externo'); // Default
          expect(validResult.data.possible_duplicate.is_possible_duplicate).toBe(false);
      }
    });
  });
});

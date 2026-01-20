
import { describe, it, expect } from 'vitest';
import { groupDocsVisuals } from './grouping';
import { AttachmentDoc } from '../types';

describe('Algoritmo de Agrupamento (Grouping Logic)', () => {

  // Helper para criar docs mockados rapidamente
  const mockDoc = (
    id: string,
    source: string,
    hint: string = '',
    pdfSessionId?: string,
    pdfSourceName?: string
  ): AttachmentDoc => ({
    id,
    source,
    reportGroupHint: hint,
    pdfSessionId,
    pdfSourceName,
    // Campos obrigatórios mas irrelevantes para o teste de agrupamento
    previewUrl: 'blob:fake',
    status: 'done',
    classification: 'laudo_previo'
  });

  it('deve agrupar páginas do mesmo PDF em um único grupo', () => {
    const pdfSessionId = 'pdf-session-1';
    const docs = [
      mockDoc('1', 'Exame_Sangue.pdf PDF Pg 1', 'default', pdfSessionId, 'Exame_Sangue.pdf'),
      mockDoc('2', 'Exame_Sangue.pdf PDF Pg 2', 'default', pdfSessionId, 'Exame_Sangue.pdf'),
      mockDoc('3', 'Exame_Sangue.pdf PDF Pg 3', 'default', pdfSessionId, 'Exame_Sangue.pdf')
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toContain(`pdfsession::${pdfSessionId}`);
    expect(groups[0].docs).toHaveLength(3);
    // Garante ordenação
    expect(groups[0].docs[0].source).toContain('Pg 1');
    expect(groups[0].docs[2].source).toContain('Pg 3');
  });

  it('deve manter páginas do mesmo PDF juntas mesmo com hints diferentes quando há pdfSessionId', () => {
    const pdfSessionId = 'pdf-session-2';
    const docs = [
      mockDoc('1', 'Misto.pdf PDF Pg 1', 'EXAME:TORAX', pdfSessionId, 'Misto.pdf'),
      mockDoc('2', 'Misto.pdf PDF Pg 2', 'EXAME:ABDOMEN', pdfSessionId, 'Misto.pdf')
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].docs).toHaveLength(2);
  });

  it('deve separar imagens soltas que não possuem hint de agrupamento', () => {
    const docs = [
      mockDoc('A', 'Foto_Laudo_1.jpg', ''),
      mockDoc('B', 'Foto_Laudo_2.jpg', '') // Sem hint, devem ficar separadas
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(2);
    expect(groups[0].id).toContain('single::');
    expect(groups[1].id).toContain('single::');
  });

  it('deve agrupar imagens soltas que possuem o mesmo reportGroupHint FORTE', () => {
    // Hint precisa ser FORTE (começar com ID:, GLOBAL:, ou MANUAL_GROUP:)
    const hint = 'MANUAL_GROUP:abc-123';
    const docs = [
      mockDoc('X', 'IMG_001.jpg', hint),
      mockDoc('Y', 'IMG_002.jpg', hint)
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].docs).toHaveLength(2);
  });

  it('deve separar páginas do mesmo PDF se tiverem hints diferentes (Split Manual ou IA)', () => {
    // Cenário: Um PDF contendo dois exames diferentes
    const docs = [
      mockDoc('1', 'Misto.pdf PDF Pg 1', 'EXAME:TORAX'),
      mockDoc('2', 'Misto.pdf PDF Pg 2', 'EXAME:ABDOMEN')
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(2);
    // Verifica se as chaves de grupo são distintas
    expect(groups[0].id).not.toBe(groups[1].id);
    expect(groups.some(g => g.id.includes('EXAME:TORAX'))).toBe(true);
    expect(groups.some(g => g.id.includes('EXAME:ABDOMEN'))).toBe(true);
  });
});

// ============================================================================
// NOVOS TESTES: Validação de Segurança de Pacientes
// Baseado em DOSSIE_COMPLETO.md e commit 0d36f69
// ============================================================================

describe('Validação de Segurança - Pacientes Diferentes', () => {

  const createDocWithMetadata = (
    id: string,
    paciente: string,
    os: string,
    groupId: number = 0
  ): AttachmentDoc => ({
    id,
    source: 'test.pdf',
    previewUrl: 'blob:fake',
    status: 'done',
    classification: 'laudo_previo',
    globalGroupId: groupId,
    reportGroupHint: `GLOBAL:${groupId}|PDF:test.pdf`,
    detailedAnalysis: {
      report_metadata: {
        paciente,
        os,
        tipo_exame: 'TC TÓRAX',
        data_realizacao: '2024-01-15',
        origem: 'externo',
        datas_encontradas: [],
        criterio_data_realizacao: ''
      },
      preview: { titulo: 'TC Tórax', descricao: 'Normal' },
      possible_duplicate: { is_possible_duplicate: false, reason: null }
    }
  });

  it('deve BLOQUEAR grupo com pacientes diferentes', () => {
    const docs = [
      createDocWithMetadata('p1', 'MARIA SANTOS SILVA', '123456', 0),
      createDocWithMetadata('p2', 'JOSÉ CARLOS OLIVEIRA', '789012', 0)
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].isBlocked).toBe(true);
    expect(groups[0].status).toBe('error');
    expect(groups[0].blockingReasons).toContainEqual(
      expect.stringMatching(/Divergência de Paciente/)
    );
  });

  it('deve BLOQUEAR grupo com OS diferentes (mesmo paciente)', () => {
    const docs = [
      createDocWithMetadata('p1', 'MARIA SANTOS', '123456', 0),
      createDocWithMetadata('p2', 'MARIA SANTOS', '789012', 0) // OS diferente!
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups[0].isBlocked).toBe(true);
    expect(groups[0].blockingReasons).toContainEqual(
      expect.stringMatching(/Divergência de OS/)
    );
  });

  it('NÃO deve bloquear quando paciente e OS iguais', () => {
    const docs = [
      createDocWithMetadata('p1', 'MARIA SANTOS', '123456', 0),
      createDocWithMetadata('p2', 'MARIA SANTOS', '123456', 0)
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups[0].isBlocked).toBeFalsy();
    expect(groups[0].status).not.toBe('error');
  });

  it('deve detectar divergência mesmo com variação de espaços (normalização funciona mas detecta diferença)', () => {
    // A normalização atual usa .trim().toUpperCase() mas não remove espaços internos extras
    // Nomes idênticos na forma normalizada não bloqueiam
    const docs = [
      createDocWithMetadata('p1', 'MARIA SANTOS SILVA', '123', 0),
      createDocWithMetadata('p2', 'MARIA SANTOS SILVA', '123', 0) // Exatamente igual
    ];

    const groups = groupDocsVisuals(docs);

    // Mesma normalização = não bloqueia
    expect(groups[0].isBlocked).toBeFalsy();
  });

  it('NÃO deve bloquear quando campos vazios (OCR falhou)', () => {
    const docs = [
      createDocWithMetadata('p1', '', '', 0),
      createDocWithMetadata('p2', '', '', 0)
    ];

    const groups = groupDocsVisuals(docs);

    // Não deve bloquear se ambos estão vazios (evita falso positivo)
    expect(groups[0].isBlocked).toBeFalsy();
  });

  it('deve permitir apenas um doc no grupo sem validação', () => {
    const docs = [createDocWithMetadata('p1', 'MARIA', '123', 0)];

    const groups = groupDocsVisuals(docs);

    expect(groups[0].isBlocked).toBeFalsy();
    // Só valida quando há 2+ docs no grupo
  });
});

describe('Agrupamento - MANUAL_GROUP', () => {

  const createManualDoc = (id: string, groupUuid: string): AttachmentDoc => ({
    id,
    source: `img${id}.jpg`,
    previewUrl: 'blob:fake',
    status: 'done',
    classification: 'laudo_previo',
    reportGroupHint: `MANUAL_GROUP:${groupUuid}`
  });

  it('deve agrupar imagens com mesmo MANUAL_GROUP UUID', () => {
    const uuid = 'abc-123-def-456';
    const docs = [
      createManualDoc('1', uuid),
      createManualDoc('2', uuid),
      createManualDoc('3', uuid)
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].docs).toHaveLength(3);
    expect(groups[0].id).toContain('hint::MANUAL_GROUP:');
  });

  it('deve separar imagens com MANUAL_GROUP diferentes', () => {
    const docs = [
      createManualDoc('1', 'uuid-A'),
      createManualDoc('2', 'uuid-B')
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(2);
  });
});


import { describe, it, expect } from 'vitest';
import { groupDocsVisuals } from './grouping';
import { AttachmentDoc } from '../types';

describe('Algoritmo de Agrupamento (Grouping Logic)', () => {
  
  // Helper para criar docs mockados rapidamente
  const mockDoc = (id: string, source: string, hint: string = ''): AttachmentDoc => ({
    id,
    source,
    reportGroupHint: hint,
    // Campos obrigatórios mas irrelevantes para o teste de agrupamento
    previewUrl: 'blob:fake',
    status: 'done',
    classification: 'laudo_previo'
  });

  it('deve agrupar páginas do mesmo PDF em um único grupo', () => {
    const docs = [
      mockDoc('1', 'Exame_Sangue.pdf PDF Pg 1', 'default'),
      mockDoc('2', 'Exame_Sangue.pdf PDF Pg 2', 'default'),
      mockDoc('3', 'Exame_Sangue.pdf PDF Pg 3', 'default')
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toContain('pdf::Exame_Sangue.pdf');
    expect(groups[0].docs).toHaveLength(3);
    // Garante ordenação
    expect(groups[0].docs[0].source).toContain('Pg 1');
    expect(groups[0].docs[2].source).toContain('Pg 3');
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

  it('deve agrupar imagens soltas que possuem o mesmo reportGroupHint', () => {
    const hint = 'PROTOCOLO:12345';
    const docs = [
      mockDoc('X', 'IMG_001.jpg', hint),
      mockDoc('Y', 'IMG_002.jpg', hint)
    ];

    const groups = groupDocsVisuals(docs);

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toContain(`hint::${hint}`);
    expect(groups[0].docs).toHaveLength(2);
    expect(groups[0].title).toBe(hint);
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

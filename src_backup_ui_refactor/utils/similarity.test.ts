import { describe, it, expect } from 'vitest';
import { calculateDocSimilarity, findGroupingCandidates, isErrataOrAdendo } from './similarity';
import { AttachmentDoc } from '../types';

describe('calculateDocSimilarity', () => {
    // Helper para criar documento mock
    const createMockDoc = (overrides: Partial<AttachmentDoc> = {}): AttachmentDoc => ({
        id: 'test-id',
        source: 'test.jpg',
        previewUrl: 'https://example.com/test.jpg',
        classification: 'laudo_previo',
        status: 'done',
        verbatimText: '',
        detailedAnalysis: {
            report_metadata: {
                paciente: 'JOÃO DA SILVA',
                os: '123456',
                tipo_exame: 'TOMOGRAFIA DE TÓRAX',
                data_realizacao: '2024-01-15',
                origem: 'externo',
                datas_encontradas: [],
                criterio_data_realizacao: 'Data do exame'
            },
            preview: {
                titulo: 'Teste',
                descricao: 'Teste'
            },
            possible_duplicate: {
                is_possible_duplicate: false,
                reason: null
            }
        },
        ...overrides
    });

    describe('Auto-agrupamento (score >= 0.85)', () => {
        it('deve auto-agrupar quando mesmo paciente + mesma OS + mesma data', () => {
            const doc1 = createMockDoc();
            const doc2 = createMockDoc();

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.score).toBeGreaterThanOrEqual(0.85);
            expect(result.shouldAutoGroup).toBe(true);
            expect(result.shouldAsk).toBe(false);
            expect(result.reasons).toContain('Mesmo paciente');
            expect(result.reasons).toContain('Mesma OS');
        });

        it('deve ter score alto mas perguntar quando sem data (paciente + OS + tipo iguais)', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'MARIA SANTOS',
                        os: '789456',
                        tipo_exame: 'RESSONÂNCIA DE CRÂNIO',
                        data_realizacao: '',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'MARIA SANTOS',
                        os: '789456',
                        tipo_exame: 'RESSONÂNCIA DE CRÂNIO',
                        data_realizacao: '',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            // Sem data: paciente(0.35) + OS(0.3) + tipo(0.1) = 0.75
            expect(result.score).toBeCloseTo(0.75, 1);
            expect(result.shouldAsk).toBe(true); // Entre 0.5 e 0.85
            expect(result.shouldAutoGroup).toBe(false);
        });
    });

    describe('Bloqueio de agrupamento (score = 0)', () => {
        it('deve bloquear quando pacientes diferentes', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO DA SILVA',
                        os: '123456',
                        tipo_exame: 'TC TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'MARIA SANTOS',
                        os: '123456',
                        tipo_exame: 'TC TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.score).toBe(0);
            expect(result.shouldAutoGroup).toBe(false);
            expect(result.shouldAsk).toBe(false);
            expect(result.reasons).toContain('Pacientes diferentes - não agrupar');
        });

        it('deve retornar score 0 quando metadados insuficientes', () => {
            const doc1 = createMockDoc({ detailedAnalysis: undefined });
            const doc2 = createMockDoc();

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.score).toBe(0);
            expect(result.shouldAutoGroup).toBe(false);
            expect(result.reasons).toContain('Metadados insuficientes para comparação');
        });
    });

    describe('Detecção de Follow-up', () => {
        it('deve detectar follow-up (mesmo exame, datas diferentes)', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO DA SILVA',
                        os: '123456',
                        tipo_exame: 'TOMOGRAFIA DE TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO DA SILVA',
                        os: '123456',
                        tipo_exame: 'TOMOGRAFIA DE TÓRAX',
                        data_realizacao: '2024-03-20', // Data diferente = follow-up
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.score).toBeLessThan(0.5); // Penalizado por follow-up
            expect(result.shouldAutoGroup).toBe(false);
            expect(result.reasons).toContain('Possível follow-up (mesmo exame, datas diferentes)');
        });
    });

    describe('Perguntar ao usuário (0.5 <= score < 0.85)', () => {
        it('deve ter score baixo quando OS diferentes (penalidade forte)', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO DA SILVA',
                        os: '123456',
                        tipo_exame: 'TC TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO DA SILVA',
                        os: '789456', // OS diferente
                        tipo_exame: 'TC TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            // paciente(0.35) - OS_diff(-0.3) + data(0.15) + tipo(0.1) = 0.3
            expect(result.score).toBeCloseTo(0.3, 1);
            expect(result.shouldAsk).toBe(false); // Score < 0.5
            expect(result.shouldAutoGroup).toBe(false);
            expect(result.reasons).toContain('OS diferentes');
        });
    });

    describe('Normalização de nomes', () => {
        it('deve considerar iguais nomes com acentuação diferente', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'José da Silva',
                        os: '123456',
                        tipo_exame: 'TC',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOSE DA SILVA', // Sem acento
                        os: '123456',
                        tipo_exame: 'TC',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.reasons).toContain('Mesmo paciente');
            expect(result.score).toBeGreaterThan(0.5);
        });

        it('deve ignorar espaços extras e case', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: '  maria   santos  ',
                        os: '123',
                        tipo_exame: 'TC',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'MARIA SANTOS',
                        os: '123',
                        tipo_exame: 'TC',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.reasons).toContain('Mesmo paciente');
        });
    });

    describe('Normalização de datas', () => {
        it('deve reconhecer datas em formatos diferentes como iguais', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO',
                        os: '123',
                        tipo_exame: 'TC',
                        data_realizacao: '15/01/2024', // DD/MM/YYYY
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO',
                        os: '123',
                        tipo_exame: 'TC',
                        data_realizacao: '2024-01-15', // YYYY-MM-DD
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.reasons).toContain('Mesma data de realização');
        });
    });

    describe('Tipos de exame diferentes', () => {
        it('deve penalizar tipos diferentes', () => {
            const doc1 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO',
                        os: '123',
                        tipo_exame: 'TC TÓRAX',
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const doc2 = createMockDoc({
                detailedAnalysis: {
                    report_metadata: {
                        paciente: 'JOÃO',
                        os: '123',
                        tipo_exame: 'TC ABDOME', // Tipo diferente
                        data_realizacao: '2024-01-15',
                        origem: 'externo',
                        datas_encontradas: [],
                        criterio_data_realizacao: ''
                    },
                    preview: { titulo: '', descricao: '' },
                    possible_duplicate: { is_possible_duplicate: false, reason: null }
                }
            });

            const result = calculateDocSimilarity(doc1, doc2);

            expect(result.reasons).toContain('Tipos de exame diferentes');
            expect(result.score).toBeLessThan(0.85);
        });
    });
});

describe('findGroupingCandidates', () => {
    const createMockDoc = (id: string, overrides: Partial<AttachmentDoc> = {}): AttachmentDoc => ({
        id,
        source: `${id}.jpg`,
        previewUrl: `https://example.com/${id}.jpg`,
        classification: 'laudo_previo',
        status: 'done',
        verbatimText: '',
        detailedAnalysis: {
            report_metadata: {
                paciente: 'JOÃO DA SILVA',
                os: '123456',
                tipo_exame: 'TC TÓRAX',
                data_realizacao: '2024-01-15',
                origem: 'externo',
                datas_encontradas: [],
                criterio_data_realizacao: ''
            },
            preview: { titulo: '', descricao: '' },
            possible_duplicate: { is_possible_duplicate: false, reason: null }
        },
        ...overrides
    });

    it('deve encontrar candidatos com score > 0', () => {
        const newDoc = createMockDoc('new');
        const existing1 = createMockDoc('exist1');
        const existing2 = createMockDoc('exist2', {
            detailedAnalysis: {
                report_metadata: {
                    paciente: 'MARIA SANTOS', // Diferente
                    os: '789',
                    tipo_exame: 'RM',
                    data_realizacao: '2024-02-01',
                    origem: 'externo',
                    datas_encontradas: [],
                    criterio_data_realizacao: ''
                },
                preview: { titulo: '', descricao: '' },
                possible_duplicate: { is_possible_duplicate: false, reason: null }
            }
        });

        const candidates = findGroupingCandidates(newDoc, [existing1, existing2]);

        expect(candidates.length).toBe(1); // Apenas existing1
        expect(candidates[0].doc.id).toBe('exist1');
        expect(candidates[0].similarity.score).toBeGreaterThan(0);
    });

    it('deve ignorar docs que já estão em grupo global', () => {
        const newDoc = createMockDoc('new');
        const grouped = createMockDoc('grouped', { globalGroupId: 1 });
        const ungrouped = createMockDoc('ungrouped');

        const candidates = findGroupingCandidates(newDoc, [grouped, ungrouped]);

        expect(candidates.length).toBe(1);
        expect(candidates[0].doc.id).toBe('ungrouped');
    });

    it('deve ordenar por score decrescente', () => {
        const newDoc = createMockDoc('new');

        const high = createMockDoc('high'); // Mesmo paciente/OS/data = alto score

        const medium = createMockDoc('medium', {
            detailedAnalysis: {
                report_metadata: {
                    paciente: 'JOÃO DA SILVA',
                    os: '999999', // OS diferente = score médio
                    tipo_exame: 'TC TÓRAX',
                    data_realizacao: '2024-01-15',
                    origem: 'externo',
                    datas_encontradas: [],
                    criterio_data_realizacao: ''
                },
                preview: { titulo: '', descricao: '' },
                possible_duplicate: { is_possible_duplicate: false, reason: null }
            }
        });

        const candidates = findGroupingCandidates(newDoc, [medium, high]);

        expect(candidates.length).toBe(2);
        expect(candidates[0].doc.id).toBe('high'); // Maior score primeiro
        expect(candidates[1].doc.id).toBe('medium');
        expect(candidates[0].similarity.score).toBeGreaterThan(candidates[1].similarity.score);
    });

    it('deve filtrar apenas laudos prévios', () => {
        const newDoc = createMockDoc('new');
        const pedido = createMockDoc('pedido', { classification: 'pedido' as any });
        const laudo = createMockDoc('laudo');

        const candidates = findGroupingCandidates(newDoc, [pedido, laudo]);

        expect(candidates.length).toBe(1);
        expect(candidates[0].doc.id).toBe('laudo');
    });
});

describe('isErrataOrAdendo', () => {
    it('deve detectar ERRATA', () => {
        expect(isErrataOrAdendo('Este laudo contém uma ERRATA importante.')).toBe(true);
        expect(isErrataOrAdendo('errata: correção do laudo anterior')).toBe(true);
    });

    it('deve detectar ADENDO', () => {
        expect(isErrataOrAdendo('ADENDO ao laudo de 15/01/2024')).toBe(true);
        expect(isErrataOrAdendo('Segue adendo com informações complementares')).toBe(true);
    });

    it('deve detectar variações', () => {
        expect(isErrataOrAdendo('COMPLEMENTO: nova informação')).toBe(true);
        expect(isErrataOrAdendo('RETIFICAÇÃO do laudo')).toBe(true);
        expect(isErrataOrAdendo('CORREÇÃO dos achados anteriores')).toBe(true);
        expect(isErrataOrAdendo('ADITIVO')).toBe(true);
    });

    it('deve retornar false para textos normais', () => {
        expect(isErrataOrAdendo('Laudo de tomografia de tórax')).toBe(false);
        expect(isErrataOrAdendo('Exame realizado em 15/01/2024')).toBe(false);
        expect(isErrataOrAdendo('')).toBe(false);
    });

    it('deve ser case-insensitive', () => {
        expect(isErrataOrAdendo('errata')).toBe(true);
        expect(isErrataOrAdendo('ADENDO')).toBe(true);
        expect(isErrataOrAdendo('Complemento')).toBe(true);
    });
});

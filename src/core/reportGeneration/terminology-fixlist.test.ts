import { describe, test, expect, beforeEach } from 'vitest';
import path from 'node:path';
import {
    applyTerminologyFixlist,
    applyTerminologyFixlistArray,
    applyTerminologyFixlistToReport,
    clearFixlistCache,
} from './terminology-fixlist';

const FIXLIST_PATH = path.resolve(process.cwd(), 'data', 'terminology-fixlist.json');

beforeEach(() => {
    clearFixlistCache();
});

describe('applyTerminologyFixlist', () => {
    // =========================================================================
    // NEOLOGISMOS / SUFIXO ERRADO
    // =========================================================================

    test('corrige endometriósica → endometriótica', () => {
        const result = applyTerminologyFixlist(
            'Lesão endometriósica profunda no septo retovaginal.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Lesão endometriótica profunda no septo retovaginal.');
        expect(result.totalFixes).toBe(1);
        expect(result.fixes[0].type).toBe('sufixo_errado');
    });

    test('corrige endometriósico → endometriótico', () => {
        const result = applyTerminologyFixlist(
            'Implante endometriósico no fundo de saco.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Implante endometriótico no fundo de saco.');
    });

    test('corrige parenquimal → parenquimatoso', () => {
        const result = applyTerminologyFixlist(
            'Alteração parenquimal difusa.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Alteração parenquimatoso difusa.');
        expect(result.totalFixes).toBe(1);
        expect(result.fixes[0].type).toBe('sufixo_errado');
    });

    // =========================================================================
    // ANGLICISMOS
    // =========================================================================

    test('corrige paratubal → paratubáreo', () => {
        const result = applyTerminologyFixlist(
            'Cisto paratubal à direita.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Cisto paratubáreo à direita.');
        expect(result.fixes[0].type).toBe('anglicismo');
    });

    test('corrige paraovárico → paraovariano', () => {
        const result = applyTerminologyFixlist(
            'Cisto paraovárico simples.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Cisto paraovariano simples.');
    });

    // =========================================================================
    // HÍFENS INDEVIDOS
    // =========================================================================

    test('corrige reto-sigmoide → retossigmoide', () => {
        const result = applyTerminologyFixlist(
            'Espessamento parietal no reto-sigmoide.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Espessamento parietal no retossigmoide.');
        expect(result.fixes[0].type).toBe('hifen_indevido');
    });

    test('corrige hepato-renal → hepatorrenal', () => {
        const result = applyTerminologyFixlist(
            'Índice hepato-renal alterado.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Índice hepatorrenal alterado.');
    });

    test('corrige hiper-intenso → hiperintenso', () => {
        const result = applyTerminologyFixlist(
            'Lesão hiper-intenso em T2.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Lesão hiperintenso em T2.');
    });

    test('corrige peri-renal → perirrenal', () => {
        const result = applyTerminologyFixlist(
            'Coleção peri-renal à esquerda.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Coleção perirrenal à esquerda.');
    });

    test('corrige sub-capsular → subcapsular', () => {
        const result = applyTerminologyFixlist(
            'Coleção sub-capsular hepática.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Coleção subcapsular hepática.');
    });

    // =========================================================================
    // HÍFENS FALTANTES
    // =========================================================================

    test('corrige pré contraste → pré-contraste', () => {
        const result = applyTerminologyFixlist(
            'Na fase pré contraste, densidade de 45 HU.',
            'technique',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Na fase pré-contraste, densidade de 45 HU.');
        expect(result.fixes[0].type).toBe('hifen_faltante');
    });

    test('corrige pós contraste → pós-contraste', () => {
        const result = applyTerminologyFixlist(
            'Na fase pós contraste observa-se realce.',
            'technique',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Na fase pós-contraste observa-se realce.');
    });

    // =========================================================================
    // MÚLTIPLAS CORREÇÕES NO MESMO TEXTO
    // =========================================================================

    test('aplica múltiplas correções em um texto', () => {
        const input =
            'Lesão endometriósica no reto-sigmoide com cisto paratubal à direita.';
        const result = applyTerminologyFixlist(input, 'findings', FIXLIST_PATH);
        expect(result.text).toBe(
            'Lesão endometriótica no retossigmoide com cisto paratubáreo à direita.'
        );
        expect(result.totalFixes).toBe(3);
    });

    // =========================================================================
    // NÃO DEVE ALTERAR (skip: true / termos corretos)
    // =========================================================================

    test('não altera peri-hepático (correto com hífen)', () => {
        const result = applyTerminologyFixlist(
            'Coleção peri-hepática.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Coleção peri-hepática.');
        expect(result.totalFixes).toBe(0);
    });

    test('não altera sub-hepático (correto com hífen)', () => {
        const result = applyTerminologyFixlist(
            'Espaço sub-hepático livre.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Espaço sub-hepático livre.');
        expect(result.totalFixes).toBe(0);
    });

    test('não altera intra-abdominal (correto com hífen)', () => {
        const result = applyTerminologyFixlist(
            'Pressão intra-abdominal elevada.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Pressão intra-abdominal elevada.');
        expect(result.totalFixes).toBe(0);
    });

    // =========================================================================
    // EDGE CASES
    // =========================================================================

    test('retorna texto vazio sem erros', () => {
        const result = applyTerminologyFixlist('', 'findings', FIXLIST_PATH);
        expect(result.text).toBe('');
        expect(result.totalFixes).toBe(0);
    });

    test('retorna texto sem matches sem erros', () => {
        const result = applyTerminologyFixlist(
            'Fígado com dimensões normais.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Fígado com dimensões normais.');
        expect(result.totalFixes).toBe(0);
    });

    test('case insensitive - corrige variação de caixa', () => {
        const result = applyTerminologyFixlist(
            'Lesão ENDOMETRIÓSICA profunda.',
            'findings',
            FIXLIST_PATH
        );
        expect(result.text).toBe('Lesão endometriótica profunda.');
        expect(result.totalFixes).toBe(1);
    });
});

describe('applyTerminologyFixlistArray', () => {
    test('aplica fixlist a array de strings', () => {
        const values = [
            'Lesão endometriósica profunda.',
            'Cisto paratubal à direita.',
            'Fígado normal.',
        ];
        const result = applyTerminologyFixlistArray(
            values,
            'findings',
            FIXLIST_PATH
        );
        expect(result.values?.[0]).toBe('Lesão endometriótica profunda.');
        expect(result.values?.[1]).toBe('Cisto paratubáreo à direita.');
        expect(result.values?.[2]).toBe('Fígado normal.');
        expect(result.totalFixes).toBe(2);
    });

    test('retorna undefined para input undefined', () => {
        const result = applyTerminologyFixlistArray(
            undefined,
            'findings',
            FIXLIST_PATH
        );
        expect(result.values).toBeUndefined();
        expect(result.totalFixes).toBe(0);
    });
});

describe('applyTerminologyFixlistToReport', () => {
    test('aplica fixlist a Markdown completo', () => {
        const markdown = `## ACHADOS

### Órgãos pélvicos
Lesão endometriósica no reto-sigmoide.
Cisto paratubal à direita, medindo 2,5 cm.

### Técnica
Estudo realizado na fase pré contraste e pós contraste.`;

        const result = applyTerminologyFixlistToReport(markdown, FIXLIST_PATH);
        expect(result.text).toContain('endometriótica');
        expect(result.text).toContain('retossigmoide');
        expect(result.text).toContain('paratubáreo');
        expect(result.text).toContain('pré-contraste');
        expect(result.text).toContain('pós-contraste');
        expect(result.text).not.toContain('endometriósica');
        expect(result.text).not.toContain('reto-sigmoide');
        expect(result.text).not.toContain('paratubal');
        expect(result.totalFixes).toBe(5);
    });
});

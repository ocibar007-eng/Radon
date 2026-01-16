import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuiaAutorizacaoTemplate } from './GuiaAutorizacaoTemplate';
import {
    mockGuiaUnimed,
    mockGuiaSUS,
    mockGuiaSemDetalhes
} from '../../__mocks__/documentMocks';

describe('GuiaAutorizacaoTemplate', () => {

    it('deve renderizar guia Unimed completa', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        // Header
        expect(screen.getByText('Guia de Autorização')).toBeInTheDocument();

        // Convênio em destaque
        expect(screen.getByText('UNIMED - Plano Empresarial Premium')).toBeInTheDocument();

        // Número da guia
        expect(screen.getByText('2024.01.123456.789')).toBeInTheDocument();

        // Carteirinha
        expect(screen.getByText('4567.8901.2345.6789')).toBeInTheDocument();

        // Beneficiário
        expect(screen.getByText('MARIA SILVA SANTOS')).toBeInTheDocument();
    });

    it('deve renderizar procedimento autorizado em destaque', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        expect(screen.getByText('TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE VENOSO')).toBeInTheDocument();

        // Código TUSS
        expect(screen.getByText(/40901114/)).toBeInTheDocument();

        // Quantidade
        expect(screen.getByText(/1.*sessão/)).toBeInTheDocument();
    });

    it('deve renderizar validade com ícone de calendário', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        expect(screen.getByText('Validade')).toBeInTheDocument();
        expect(screen.getByText(/30\/01\/2024/)).toBeInTheDocument();
    });

    it('deve renderizar observações quando presentes', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        expect(screen.getByText('Observações')).toBeInTheDocument();
        expect(screen.getByText(/rede credenciada/)).toBeInTheDocument();
        expect(screen.getByText(/15 dias/)).toBeInTheDocument();
        expect(screen.getByText(/documento de identificação/)).toBeInTheDocument();
    });

    it('deve renderizar guia SUS', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaSUS} />);

        expect(screen.getByText('SUS - Sistema Único de Saúde')).toBeInTheDocument();
        expect(screen.getByText('SUS-2024-789456')).toBeInTheDocument();
        expect(screen.getByText('JOÃO PEDRO OLIVEIRA')).toBeInTheDocument();
        expect(screen.getByText('RESSONÂNCIA MAGNÉTICA DE CRÂNIO')).toBeInTheDocument();

        // Observações específicas do SUS
        expect(screen.getByText(/Central de Agendamento/)).toBeInTheDocument();
        expect(screen.getByText(/cartão SUS/)).toBeInTheDocument();
    });

    it('deve renderizar código de procedimento quando presente', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        expect(screen.getByText(/40901114.*TUSS/)).toBeInTheDocument();
    });

    it('deve mostrar alerta quando dados principais estão faltando', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaSemDetalhes} />);

        // Deve renderizar o que tem
        expect(screen.getByText('AMIL')).toBeInTheDocument();
        expect(screen.getByText('999888777')).toBeInTheDocument();

        // Deve mostrar alerta
        expect(screen.getByText(/dados principais não puderam ser extraídos/)).toBeInTheDocument();
    });

    it('deve lidar com guia completamente vazia', () => {
        render(<GuiaAutorizacaoTemplate data={{} as any} />);

        expect(screen.getByText('Guia de Autorização')).toBeInTheDocument();
        expect(screen.getByText(/dados principais não puderam ser extraídos/)).toBeInTheDocument();
    });

    it('deve renderizar quantidade autorizada quando presente', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        expect(screen.getByText(/1.*sessão/)).toBeInTheDocument();
    });

    it('deve formatar números em fonte mono', () => {
        const { container } = render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        // Número da guia em font-mono
        const guiaNumero = screen.getByText('2024.01.123456.789');
        expect(guiaNumero.className).toMatch(/font-mono/);

        // Carteirinha em font-mono
        const carteirinha = screen.getByText('4567.8901.2345.6789');
        expect(carteirinha.className).toMatch(/font-mono/);
    });

    it('deve destacar guia em azul e procedimento em verde', () => {
        const { container } = render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        // Número da guia deve ter bg azul (bg-info/5)
        const guiaCard = screen.getByText('Nº Guia').closest('.sr-organ-card');
        expect(guiaCard?.className).toMatch(/info/);

        // Procedimento autorizado deve ter bg verde (bg-success/5)
        const procedCard = screen.getByText('Procedimento Autorizado').closest('.sr-organ-card');
        expect(procedCard?.className).toMatch(/success/);
    });

    it('deve esconder seções vazias apropriadamente', () => {
        const guiaMinima = {
            tipo_documento: 'guia_autorizacao' as const,
            convenio: 'TESTE',
            numero_guia: '123',
            beneficiario: 'TESTE',
            procedimento_autorizado: 'EXAME'
        };

        render(<GuiaAutorizacaoTemplate data={guiaMinima} />);

        // Não deve mostrar seções vazias
        expect(screen.queryByText('Observações')).not.toBeInTheDocument();
        expect(screen.queryByText('Validade')).not.toBeInTheDocument();
    });

    it('deve renderizar múltiplas observações como lista', () => {
        render(<GuiaAutorizacaoTemplate data={mockGuiaUnimed} />);

        const observacoes = mockGuiaUnimed.observacoes!;
        expect(observacoes.length).toBe(3);

        observacoes.forEach(obs => {
            expect(screen.getByText(new RegExp(obs.substring(0, 15)))).toBeInTheDocument();
        });
    });
});

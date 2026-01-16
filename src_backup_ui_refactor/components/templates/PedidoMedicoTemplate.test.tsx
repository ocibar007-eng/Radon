import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PedidoMedicoTemplate } from './PedidoMedicoTemplate';
import {
    mockPedidoMedico,
    mockPedidoRM,
    mockPedidoIncompleto
} from '../../__mocks__/documentMocks';

describe('PedidoMedicoTemplate', () => {

    it('deve renderizar pedido médico completo corretamente', () => {
        render(<PedidoMedicoTemplate data={mockPedidoMedico} />);

        // Verifica header
        expect(screen.getByText('Pedido Médico / Ordem de Serviço')).toBeInTheDocument();

        // Verifica paciente
        expect(screen.getByText('MARIA SILVA SANTOS')).toBeInTheDocument();
        expect(screen.getByText('45 anos')).toBeInTheDocument();
        expect(screen.getByText('Feminino')).toBeInTheDocument();

        // Verifica médico solicitante
        expect(screen.getByText('Dr. Carlos Alberto Mendes')).toBeInTheDocument();
        expect(screen.getByText('CRM 12345/SP')).toBeInTheDocument();
        expect(screen.getByText('Pneumologia')).toBeInTheDocument();

        // Verifica exame solicitado
        expect(screen.getByText('TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE')).toBeInTheDocument();
        expect(screen.getByText(/PED-2024-001234/)).toBeInTheDocument();

        // Verifica justificativa clínica
        expect(screen.getByText(/tosse persistente há 3 meses/)).toBeInTheDocument();
        expect(screen.getByText(/R05 - Tosse/)).toBeInTheDocument();

        // Verifica observações
        expect(screen.getByText(/alergia a iodo/)).toBeInTheDocument();
        expect(screen.getByText(/resultado com urgência/)).toBeInTheDocument();
    });

    it('deve renderizar pedido de RM sem observações', () => {
        render(<PedidoMedicoTemplate data={mockPedidoRM} />);

        expect(screen.getByText('JOÃO PEDRO OLIVEIRA')).toBeInTheDocument();
        expect(screen.getByText('RESSONÂNCIA MAGNÉTICA DE CRÂNIO')).toBeInTheDocument();
        expect(screen.getByText('Dra. Ana Paula Rodrigues')).toBeInTheDocument();

        // Não deve mostrar seção de observações se vazia
        expect(screen.queryByText('Observações')).not.toBeInTheDocument();
    });

    it('deve mostrar alerta quando dados estão incompletos', () => {
        render(<PedidoMedicoTemplate data={mockPedidoIncompleto} />);

        // Deve mostrar o que tem
        expect(screen.getByText('ULTRASSONOGRAFIA DE ABDOME TOTAL')).toBeInTheDocument();

        // Deve mostrar alerta de dados incompletos
        expect(screen.getByText(/campos não puderam ser extraídos/)).toBeInTheDocument();
    });

    it('deve lidar com dados completamente vazios', () => {
        render(<PedidoMedicoTemplate data={{} as any} />);

        // Deve renderizar sem quebrar
        expect(screen.getByText('Pedido Médico / Ordem de Serviço')).toBeInTheDocument();
        expect(screen.getByText(/campos não puderam ser extraídos/)).toBeInTheDocument();
    });

    it('deve renderizar CID quando presente', () => {
        render(<PedidoMedicoTemplate data={mockPedidoMedico} />);

        const cidElement = screen.getByText(/R05 - Tosse/);
        expect(cidElement).toBeInTheDocument();
        expect(cidElement.closest('.text-accent')).toBeInTheDocument();
    });

    it('deve renderizar data de solicitação formatada', () => {
        render(<PedidoMedicoTemplate data={mockPedidoMedico} />);

        expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('deve renderizar especialidade do médico quando presente', () => {
        render(<PedidoMedicoTemplate data={mockPedidoMedico} />);

        expect(screen.getByText('Pneumologia')).toBeInTheDocument();
    });

    it('deve renderizar múltiplas observações como lista', () => {
        render(<PedidoMedicoTemplate data={mockPedidoMedico} />);

        const observacoes = mockPedidoMedico.observacoes!;
        expect(observacoes.length).toBe(3);

        observacoes.forEach(obs => {
            expect(screen.getByText(new RegExp(obs.substring(0, 20)))).toBeInTheDocument();
        });
    });
});

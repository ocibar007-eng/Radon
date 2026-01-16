import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TermoConsentimentoTemplate } from './TermoConsentimentoTemplate';
import {
    mockTermoContraste,
    mockTermoSedacao,
    mockTermoSemAlergias
} from '../../__mocks__/documentMocks';

describe('TermoConsentimentoTemplate', () => {

    it('deve renderizar termo de contraste completo', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        // Header
        expect(screen.getByText('Termo de Consentimento')).toBeInTheDocument();

        // Título do termo
        expect(screen.getByText(/TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO/)).toBeInTheDocument();
        expect(screen.getByText(/contraste iodado/i)).toBeInTheDocument();

        // Paciente
        expect(screen.getByText('MARIA SILVA SANTOS')).toBeInTheDocument();

        // Declarações
        expect(screen.getByText(/Declaro ter sido informado/)).toBeInTheDocument();
        expect(screen.getByText(/reações alérgicas/)).toBeInTheDocument();
        expect(screen.getByText(/Autorizo a realização/)).toBeInTheDocument();
    });

    it('deve destacar alergias em warning', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        // Seção de alergias deve existir
        expect(screen.getByText('Alergias Relatadas')).toBeInTheDocument();

        // Alergias específicas
        expect(screen.getByText(/Dipirona/)).toBeInTheDocument();
        expect(screen.getByText(/Mariscos/)).toBeInTheDocument();

        // Verifica estilo warning
        const alergiasSection = screen.getByText('Alergias Relatadas').closest('.sr-organ-card');
        expect(alergiasSection?.className).toMatch(/warning/);
    });

    it('deve renderizar medicações em uso', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        expect(screen.getByText('Medicações em Uso')).toBeInTheDocument();
        expect(screen.getByText(/Losartana 50mg/)).toBeInTheDocument();
        expect(screen.getByText(/Metformina 850mg/)).toBeInTheDocument();
        expect(screen.getByText(/AAS 100mg/)).toBeInTheDocument();
    });

    it('deve renderizar comorbidades', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        expect(screen.getByText('Comorbidades')).toBeInTheDocument();
        expect(screen.getByText(/Hipertensão Arterial/)).toBeInTheDocument();
        expect(screen.getByText(/Diabetes Mellitus/)).toBeInTheDocument();
        expect(screen.getByText(/Dislipidemia/)).toBeInTheDocument();
    });

    it('deve mostrar status de assinatura corretamente', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        expect(screen.getByText('✅ Presente')).toBeInTheDocument();
        expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('deve mostrar assinatura ausente quando false', () => {
        render(<TermoConsentimentoTemplate data={mockTermoSemAlergias} />);

        expect(screen.getByText('❌ Não identificada')).toBeInTheDocument();
    });

    it('deve renderizar termo de sedação sem alergias', () => {
        render(<TermoConsentimentoTemplate data={mockTermoSedacao} />);

        expect(screen.getByText(/SEDAÇÃO CONSCIENTE/)).toBeInTheDocument();
        expect(screen.getByText('ANTÔNIO CARLOS PEREIRA')).toBeInTheDocument();

        // Não deve mostrar seção de alergias se vazia
        expect(screen.queryByText('Alergias Relatadas')).not.toBeInTheDocument();
    });

    it('deve renderizar declarações com checkmarks', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        const declaracoes = mockTermoContraste.paciente!.declaracoes!;
        expect(declaracoes.length).toBeGreaterThan(0);

        // Todas declarações devem estar presentes
        declaracoes.forEach(decl => {
            expect(screen.getByText(new RegExp(decl.substring(0, 20)))).toBeInTheDocument();
        });
    });

    it('deve esconder seções vazias apropriadamente', () => {
        const termoMinimo = {
            tipo_documento: 'termo_consentimento' as const,
            titulo: 'TERMO SIMPLES',
            paciente: { nome: 'TESTE' },
            assinatura_presente: false
        };

        render(<TermoConsentimentoTemplate data={termoMinimo} />);

        // Não deve mostrar seções que não têm dados
        expect(screen.queryByText('Medicações em Uso')).not.toBeInTheDocument();
        expect(screen.queryByText('Alergias Relatadas')).not.toBeInTheDocument();
        expect(screen.queryByText('Comorbidades')).not.toBeInTheDocument();
    });

    it('deve renderizar tipo de termo quando presente', () => {
        render(<TermoConsentimentoTemplate data={mockTermoContraste} />);

        // Tipo "contraste_iodado" deve aparecer formatado
        expect(screen.getByText(/contraste iodado/i)).toBeInTheDocument();
    });
});

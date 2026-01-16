import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionarioTemplate } from './QuestionarioTemplate';
import {
    mockQuestionarioRM,
    mockQuestionarioColono,
    mockQuestionarioVazio
} from '../../__mocks__/documentMocks';

describe('QuestionarioTemplate', () => {

    it('deve renderizar questionário de RM completo', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Header
        expect(screen.getByText('Questionário Pré-Exame')).toBeInTheDocument();

        // Tipo de exame
        expect(screen.getByText('RESSONÂNCIA MAGNÉTICA')).toBeInTheDocument();

        // Sintomas atuais
        expect(screen.getByText('Sintomas Atuais')).toBeInTheDocument();
        expect(screen.getByText(/Dor de cabeça intensa/)).toBeInTheDocument();
        expect(screen.getByText(/Náuseas matinais/)).toBeInTheDocument();
        expect(screen.getByText(/Visão embaçada/)).toBeInTheDocument();
    });

    it('deve renderizar histórico cirúrgico', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        expect(screen.getByText('Histórico Cirúrgico')).toBeInTheDocument();
        expect(screen.getByText(/Apendicectomia - 2010/)).toBeInTheDocument();
        expect(screen.getByText(/Cesariana - 2015/)).toBeInTheDocument();
    });

    it('deve renderizar histórico patológico', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        expect(screen.getByText('Histórico Patológico')).toBeInTheDocument();
        expect(screen.getByText(/Enxaqueca/)).toBeInTheDocument();
        expect(screen.getByText(/Hipotireoidismo/)).toBeInTheDocument();
    });

    it('deve renderizar seções de perguntas e respostas', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Seção de triagem de segurança
        expect(screen.getByText('TRIAGEM DE SEGURANÇA PARA RM')).toBeInTheDocument();

        // Perguntas específicas
        expect(screen.getByText(/Possui marca-passo/)).toBeInTheDocument();
        expect(screen.getByText(/implantes metálicos/)).toBeInTheDocument();
        expect(screen.getByText(/tatuagens/)).toBeInTheDocument();
        expect(screen.getByText(/claustrofobia/)).toBeInTheDocument();
        expect(screen.getByText(/grávida/)).toBeInTheDocument();
    });

    it('deve renderizar respostas corretamente', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Respostas "Não" para perguntas de segurança
        const naos = screen.getAllByText(/(?:^|\s)Não(?:\s|$)/);
        expect(naos.length).toBeGreaterThan(0);

        // Resposta detalhada sobre tatuagem
        expect(screen.getByText(/tatuagem pequena no braço direito/)).toBeInTheDocument();

        // Alergia a penicilina
        expect(screen.getByText(/Alergia a penicilina/)).toBeInTheDocument();
    });

    it('deve mostrar tipo de resposta quando presente', () => {
        const { container } = render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Deve mostrar tipo de resposta entre parênteses
        const tipoRespostaElements = container.querySelectorAll('.text-\\[10px\\]');
        expect(tipoRespostaElements.length).toBeGreaterThan(0);
    });

    it('deve renderizar questionário de colonoscopia', () => {
        render(<QuestionarioTemplate data={mockQuestionarioColono} />);

        expect(screen.getByText('COLONOSCOPIA')).toBeInTheDocument();
        expect(screen.getByText(/Sangramento retal/)).toBeInTheDocument();
        expect(screen.getByText(/Alteração do hábito intestinal/)).toBeInTheDocument();

        // Seção de preparo
        expect(screen.getByText('PREPARO INTESTINAL')).toBeInTheDocument();
        expect(screen.getByText(/Manitol 20%/)).toBeInTheDocument();
    });

    it('deve mostrar alerta quando questionário está vazio', () => {
        render(<QuestionarioTemplate data={mockQuestionarioVazio} />);

        expect(screen.getByText('Questionário Pré-Exame')).toBeInTheDocument();
        expect(screen.getByText(/nenhuma informação foi extraída/)).toBeInTheDocument();
    });

    it('deve esconder seções vazias', () => {
        const questionarioSemHistorico = {
            tipo_documento: 'questionario' as const,
            sintomas_atuais: ['Dor'],
            historico_cirurgico: [],
            historico_patologico: [],
            secoes: []
        };

        render(<QuestionarioTemplate data={questionarioSemHistorico} />);

        // Deve mostrar sintomas
        expect(screen.getByText('Sintomas Atuais')).toBeInTheDocument();

        // Não deve mostrar históricos vazios
        expect(screen.queryByText('Histórico Cirúrgico')).not.toBeInTheDocument();
        expect(screen.queryByText('Histórico Patológico')).not.toBeInTheDocument();
    });

    it('deve renderizar múltiplas seções com perguntas', () => {
        render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Deve ter 2 seções
        expect(screen.getByText('TRIAGEM DE SEGURANÇA PARA RM')).toBeInTheDocument();
        expect(screen.getByText('INFORMAÇÕES CLÍNICAS')).toBeInTheDocument();
    });

    it('deve formatar perguntas e respostas com visual apropriado', () => {
        const { container } = render(<QuestionarioTemplate data={mockQuestionarioRM} />);

        // Perguntas devem ter "Q:" e respostas "R:"
        expect(screen.getAllByText(/^Q:/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^R:/).length).toBeGreaterThan(0);

        // Deve ter borda lateral azul
        const qaBlocks = container.querySelectorAll('.border-l-2');
        expect(qaBlocks.length).toBeGreaterThan(0);
    });
});

// Mock data para testes de templates
// Representa documentos reais que seriam extraídos pela AI

import type {
    PedidoMedicoData,
    TermoConsentimentoData,
    QuestionarioData,
    GuiaAutorizacaoData
} from '../adapters/schemas-templates';

/**
 * PEDIDO MÉDICO - Solicitação de TC Tórax
 */
export const mockPedidoMedico: PedidoMedicoData = {
    tipo_documento: 'pedido_medico',
    paciente: {
        nome: 'MARIA SILVA SANTOS',
        idade: '45 anos',
        sexo: 'Feminino'
    },
    medico_solicitante: {
        nome: 'Dr. Carlos Alberto Mendes',
        crm: 'CRM 12345/SP',
        especialidade: 'Pneumologia'
    },
    exame_solicitado: 'TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE',
    justificativa_clinica: 'Paciente com tosse persistente há 3 meses, dispneia aos esforços e perda ponderal de 5kg. Raio-X de tórax prévio mostrou opacidade em lobo superior direito. Investigação de neoplasia pulmonar.',
    cid: 'R05 - Tosse',
    numero_pedido: 'PED-2024-001234',
    data_solicitacao: '15/01/2024',
    observacoes: [
        'Paciente com alergia a iodo - usar contraste não iodado',
        'Realizar cortes de 1mm para melhor avaliação',
        'Encaminhar resultado com urgência'
    ]
};

/**
 * PEDIDO MÉDICO - Ressonância Magnética
 */
export const mockPedidoRM: PedidoMedicoData = {
    tipo_documento: 'pedido_medico',
    paciente: {
        nome: 'JOÃO PEDRO OLIVEIRA',
        idade: '32 anos',
        sexo: 'Masculino'
    },
    medico_solicitante: {
        nome: 'Dra. Ana Paula Rodrigues',
        crm: 'CRM 98765/RJ',
        especialidade: 'Neurologia'
    },
    exame_solicitado: 'RESSONÂNCIA MAGNÉTICA DE CRÂNIO',
    justificativa_clinica: 'Paciente com cefaleia intensa de início súbito há 2 dias, acompanhada de náuseas e fotofobia. Sem melhora com analgésicos comuns.',
    cid: 'R51 - Cefaleia',
    numero_pedido: 'PED-2024-005678',
    data_solicitacao: '16/01/2024',
    observacoes: []
};

/**
 * TERMO DE CONSENTIMENTO - Uso de Contraste Iodado
 */
export const mockTermoContraste: TermoConsentimentoData = {
    tipo_documento: 'termo_consentimento',
    titulo: 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA USO DE CONTRASTE IODADO',
    tipo_termo: 'contraste_iodado',
    paciente: {
        nome: 'MARIA SILVA SANTOS',
        declaracoes: [
            'Declaro ter sido informado(a) sobre os riscos e benefícios do uso de contraste',
            'Fui esclarecido(a) sobre possíveis reações alérgicas',
            'Autorizo a realização do procedimento descrito',
            'Todas minhas dúvidas foram respondidas pela equipe médica'
        ]
    },
    informacoes_relevantes: {
        medicacoes_em_uso: [
            'Losartana 50mg - 1x ao dia',
            'Metformina 850mg - 2x ao dia',
            'AAS 100mg - 1x ao dia'
        ],
        alergias: [
            'Dipirona (reação cutânea)',
            'Mariscos (urticária)'
        ],
        comorbidades: [
            'Hipertensão Arterial Sistêmica',
            'Diabetes Mellitus tipo 2',
            'Dislipidemia'
        ]
    },
    data_aceite: '15/01/2024',
    assinatura_presente: true
};

/**
 * TERMO DE CONSENTIMENTO - Sedação para Endoscopia
 */
export const mockTermoSedacao: TermoConsentimentoData = {
    tipo_documento: 'termo_consentimento',
    titulo: 'TERMO DE CONSENTIMENTO PARA SEDAÇÃO CONSCIENTE',
    tipo_termo: 'sedacao',
    paciente: {
        nome: 'ANTÔNIO CARLOS PEREIRA',
        declaracoes: [
            'Fui informado sobre o procedimento de sedação',
            'Estou ciente dos riscos envolvidos',
            'Concordo com a realização do procedimento'
        ]
    },
    informacoes_relevantes: {
        medicacoes_em_uso: ['Omeprazol 20mg'],
        alergias: [],
        comorbidades: ['Gastrite crônica']
    },
    data_aceite: '16/01/2024',
    assinatura_presente: true
};

/**
 * QUESTIONÁRIO - Pré-Ressonância Magnética
 */
export const mockQuestionarioRM: QuestionarioData = {
    tipo_documento: 'questionario',
    tipo_exame_relacionado: 'RESSONÂNCIA MAGNÉTICA',
    sintomas_atuais: [
        'Dor de cabeça intensa',
        'Náuseas matinais',
        'Visão embaçada ocasional'
    ],
    historico_cirurgico: [
        'Apendicectomia - 2010',
        'Cesariana - 2015'
    ],
    historico_patologico: [
        'Enxaqueca desde a adolescência',
        'Hipotireoidismo diagnosticado em 2018'
    ],
    secoes: [
        {
            titulo: 'TRIAGEM DE SEGURANÇA PARA RM',
            perguntas_respostas: [
                {
                    pergunta: 'Possui marca-passo cardíaco?',
                    resposta: 'Não',
                    tipo_resposta: 'sim_nao'
                },
                {
                    pergunta: 'Possui implantes metálicos (pinos, placas, clipes)?',
                    resposta: 'Não',
                    tipo_resposta: 'sim_nao'
                },
                {
                    pergunta: 'Possui tatuagens?',
                    resposta: 'Sim, tatuagem pequena no braço direito (feita há 5 anos)',
                    tipo_resposta: 'texto_livre'
                },
                {
                    pergunta: 'Sofre de claustrofobia?',
                    resposta: 'Não',
                    tipo_resposta: 'sim_nao'
                },
                {
                    pergunta: 'Está grávida ou suspeita de gravidez?',
                    resposta: 'Não',
                    tipo_resposta: 'sim_nao'
                }
            ]
        },
        {
            titulo: 'INFORMAÇÕES CLÍNICAS',
            perguntas_respostas: [
                {
                    pergunta: 'Possui alergias a medicamentos?',
                    resposta: 'Alergia a penicilina',
                    tipo_resposta: 'texto_livre'
                },
                {
                    pergunta: 'Faz uso de medicação contínua?',
                    resposta: 'Puran T4 75mcg - 1x ao dia (hipotireoidismo)',
                    tipo_resposta: 'texto_livre'
                }
            ]
        }
    ]
};

/**
 * QUESTIONÁRIO - Pré-Colonoscopia
 */
export const mockQuestionarioColono: QuestionarioData = {
    tipo_documento: 'questionario',
    tipo_exame_relacionado: 'COLONOSCOPIA',
    sintomas_atuais: [
        'Sangramento retal intermitente',
        'Alteração do hábito intestinal',
        'Dor abdominal em cólica'
    ],
    historico_cirurgico: ['Colecistectomia - 2019'],
    historico_patologico: [
        'Síndrome do intestino irritável',
        'História familiar de câncer colorretal (pai aos 58 anos)'
    ],
    secoes: [
        {
            titulo: 'PREPARO INTESTINAL',
            perguntas_respostas: [
                {
                    pergunta: 'Realizou o preparo intestinal conforme orientado?',
                    resposta: 'Sim, Manitol 20% conforme prescrição',
                    tipo_resposta: 'texto_livre'
                },
                {
                    pergunta: 'Está em jejum há pelo menos 8 horas?',
                    resposta: 'Sim',
                    tipo_resposta: 'sim_nao'
                }
            ]
        }
    ]
};

/**
 * GUIA DE AUTORIZAÇÃO - Plano de Saúde
 */
export const mockGuiaUnimed: GuiaAutorizacaoData = {
    tipo_documento: 'guia_autorizacao',
    convenio: 'UNIMED - Plano Empresarial Premium',
    numero_guia: '2024.01.123456.789',
    numero_carteirinha: '4567.8901.2345.6789',
    beneficiario: 'MARIA SILVA SANTOS',
    procedimento_autorizado: 'TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE VENOSO',
    codigo_procedimento: '40901114 (TUSS)',
    quantidade_autorizada: 1,
    validade: '30/01/2024',
    observacoes: [
        'Autorização válida apenas para a rede credenciada',
        'Prazo de validade de 15 dias a partir da emissão',
        'Apresentar documento de identificação com foto'
    ]
};

/**
 * GUIA DE AUTORIZAÇÃO - Convênio SUS
 */
export const mockGuiaSUS: GuiaAutorizacaoData = {
    tipo_documento: 'guia_autorizacao',
    convenio: 'SUS - Sistema Único de Saúde',
    numero_guia: 'SUS-2024-789456',
    numero_carteirinha: '123 4567 8901 2345',
    beneficiario: 'JOÃO PEDRO OLIVEIRA',
    procedimento_autorizado: 'RESSONÂNCIA MAGNÉTICA DE CRÂNIO',
    codigo_procedimento: '02.06.03.011-0',
    quantidade_autorizada: 1,
    validade: '28/02/2024',
    observacoes: [
        'Regulação via Central de Agendamento',
        'Apresentar cartão SUS e documento com foto'
    ]
};

/**
 * CASOS DE BORDA - Dados Incompletos
 */
export const mockPedidoIncompleto: Partial<PedidoMedicoData> = {
    tipo_documento: 'pedido_medico',
    exame_solicitado: 'ULTRASSONOGRAFIA DE ABDOME TOTAL',
    // Faltam: paciente, médico, justificativa
};

export const mockTermoSemAlergias: TermoConsentimentoData = {
    tipo_documento: 'termo_consentimento',
    titulo: 'TERMO DE CONSENTIMENTO SIMPLES',
    paciente: {
        nome: 'TESTE PACIENTE',
        declaracoes: []
    },
    assinatura_presente: false
    // Sem informações relevantes
};

export const mockQuestionarioVazio: QuestionarioData = {
    tipo_documento: 'questionario',
    secoes: [],
    sintomas_atuais: [],
    historico_cirurgico: [],
    historico_patologico: []
};

export const mockGuiaSemDetalhes: Partial<GuiaAutorizacaoData> = {
    tipo_documento: 'guia_autorizacao',
    convenio: 'AMIL',
    numero_guia: '999888777',
    beneficiario: 'PACIENTE TESTE',
    procedimento_autorizado: 'EXAME NÃO ESPECIFICADO'
    // Faltam: carteirinha, código, validade
};

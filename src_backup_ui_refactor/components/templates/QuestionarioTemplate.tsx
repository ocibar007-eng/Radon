import React from 'react';
import { ClipboardList, Activity, Scissors, HeartPulse, HelpCircle } from 'lucide-react';
import type { QuestionarioData } from '../../adapters/schemas-templates';

interface Props {
    data: Partial<QuestionarioData>;
}

export const QuestionarioTemplate: React.FC<Props> = ({ data }) => {
    return (
        <div className="structured-report-container animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-subtle">
                <ClipboardList className="text-accent" size={20} />
                <h3 className="text-lg font-bold text-primary">Questionário Pré-Exame</h3>
            </div>

            {/* Tipo de Exame Relacionado */}
            {data.tipo_exame_relacionado && (
                <div className="mb-4 p-2 bg-accent/10 border border-accent/30 rounded text-center">
                    <p className="text-sm font-semibold text-accent">{data.tipo_exame_relacionado}</p>
                </div>
            )}

            {/* Sintomas Atuais */}
            {data.sintomas_atuais && data.sintomas_atuais.length > 0 && (
                <div className="sr-organ-card mb-3 border-warning/30">
                    <div className="sr-organ-header">
                        <Activity size={16} className="text-warning" />
                        <h5 className="sr-organ-title text-warning">Sintomas Atuais</h5>
                    </div>
                    <ul className="sr-findings-list">
                        {data.sintomas_atuais.map((sintoma, idx) => (
                            <li key={idx} className="text-xs font-medium">{sintoma}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Histórico Cirúrgico */}
            {data.historico_cirurgico && data.historico_cirurgico.length > 0 && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <Scissors size={16} className="text-info" />
                        <h5 className="sr-organ-title text-info">Histórico Cirúrgico</h5>
                    </div>
                    <ul className="sr-findings-list">
                        {data.historico_cirurgico.map((cirurgia, idx) => (
                            <li key={idx} className="text-xs">{cirurgia}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Histórico Patológico */}
            {data.historico_patologico && data.historico_patologico.length > 0 && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <HeartPulse size={16} className="text-error" />
                        <h5 className="sr-organ-title text-error">Histórico Patológico</h5>
                    </div>
                    <ul className="sr-findings-list">
                        {data.historico_patologico.map((patologia, idx) => (
                            <li key={idx} className="text-xs">{patologia}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Seções de Perguntas/Respostas */}
            {data.secoes && data.secoes.length > 0 && (
                <div className="space-y-3">
                    {data.secoes.map((secao, idx) => (
                        <div key={idx} className="sr-organ-card">
                            <div className="sr-organ-header">
                                <HelpCircle size={16} className="text-accent" />
                                <h5 className="sr-organ-title">{secao.titulo}</h5>
                            </div>
                            <div className="px-3 pb-3">
                                {secao.perguntas_respostas && secao.perguntas_respostas.length > 0 ? (
                                    <div className="space-y-2">
                                        {secao.perguntas_respostas.map((qa, qaIdx) => (
                                            <div key={qaIdx} className="border-l-2 border-accent/30 pl-2">
                                                <p className="text-xs font-semibold text-tertiary">Q: {qa.pergunta}</p>
                                                <p className="text-xs text-secondary mt-1">
                                                    R: {qa.resposta}
                                                    {qa.tipo_resposta && (
                                                        <span className="ml-2 text-[10px] text-tertiary">
                                                            ({qa.tipo_resposta.replace(/_/g, ' ')})
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-tertiary italic">Nenhuma pergunta/resposta extraída.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Alert se dados vazios */}
            {!data.sintomas_atuais?.length &&
                !data.historico_cirurgico?.length &&
                !data.historico_patologico?.length &&
                !data.secoes?.length && (
                    <div className="text-warning text-sm p-3 border border-amber-900/30 bg-amber-900/10 rounded flex items-center gap-2">
                        <HelpCircle size={16} />
                        <span>Questionário detectado, mas nenhuma informação foi extraída.</span>
                    </div>
                )}
        </div>
    );
};

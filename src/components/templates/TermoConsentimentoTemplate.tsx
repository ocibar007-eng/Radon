import React from 'react';
import { ShieldCheck, User, Pill, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TermoConsentimentoData } from '../../adapters/schemas-templates';

interface Props {
    data: Partial<TermoConsentimentoData>;
    showHeader?: boolean;
}

export const TermoConsentimentoTemplate: React.FC<Props> = ({ data, showHeader = true }) => {
    return (
        <div className="structured-report-container animate-fade-in">
            {/* Header */}
            {showHeader && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-subtle">
                    <ShieldCheck className="text-success" size={20} />
                    <h3 className="text-lg font-bold text-primary">Termo de Consentimento</h3>
                </div>
            )}

            {/* Título do Termo */}
            {data.titulo && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded">
                    <p className="text-sm font-semibold text-success text-center">{data.titulo}</p>
                    {data.tipo_termo && (
                        <p className="text-xs text-center text-tertiary mt-1 capitalize">
                            {data.tipo_termo.replace(/_/g, ' ')}
                        </p>
                    )}
                </div>
            )}

            {/* Paciente */}
            {data.paciente?.nome && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <User size={16} className="text-accent" />
                        <h5 className="sr-organ-title">Paciente</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm font-medium text-secondary">{data.paciente.nome}</p>

                        {/* Declarações */}
                        {data.paciente.declaracoes && data.paciente.declaracoes.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-semibold text-tertiary mb-2">Declarações:</p>
                                <ul className="space-y-1">
                                    {data.paciente.declaracoes.map((decl, idx) => (
                                        <li key={idx} className="text-xs text-secondary flex items-start gap-2">
                                            <CheckCircle2 size={12} className="text-success mt-0.5 shrink-0" />
                                            <span>{decl}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Informações Relevantes */}
            {data.informacoes_relevantes && (
                <div className="grid grid-cols-1 gap-3 mb-3">
                    {/* Medicações em Uso */}
                    {data.informacoes_relevantes.medicacoes_em_uso &&
                        data.informacoes_relevantes.medicacoes_em_uso.length > 0 && (
                            <div className="sr-organ-card">
                                <div className="sr-organ-header">
                                    <Pill size={16} className="text-info" />
                                    <h5 className="sr-organ-title text-info">Medicações em Uso</h5>
                                </div>
                                <ul className="sr-findings-list">
                                    {data.informacoes_relevantes.medicacoes_em_uso.map((med, idx) => (
                                        <li key={idx} className="text-xs">{med}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    {/* Alergias */}
                    {data.informacoes_relevantes.alergias &&
                        data.informacoes_relevantes.alergias.length > 0 && (
                            <div className="sr-organ-card border-warning/30 bg-warning/5">
                                <div className="sr-organ-header">
                                    <AlertTriangle size={16} className="text-warning" />
                                    <h5 className="sr-organ-title text-warning">Alergias Relatadas</h5>
                                </div>
                                <ul className="sr-findings-list">
                                    {data.informacoes_relevantes.alergias.map((alergia, idx) => (
                                        <li key={idx} className="text-xs font-medium text-warning">{alergia}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    {/* Comorbidades */}
                    {data.informacoes_relevantes.comorbidades &&
                        data.informacoes_relevantes.comorbidades.length > 0 && (
                            <div className="sr-organ-card">
                                <div className="sr-organ-header">
                                    <h5 className="sr-organ-title">Comorbidades</h5>
                                </div>
                                <ul className="sr-findings-list">
                                    {data.informacoes_relevantes.comorbidades.map((comorb, idx) => (
                                        <li key={idx} className="text-xs">{comorb}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                </div>
            )}

            {/* Assinatura e Data */}
            <div className="mt-4 p-3 bg-surface-elevated border border-subtle rounded flex items-center justify-between">
                <div>
                    <p className="text-xs text-tertiary">Assinatura do Paciente:</p>
                    <p className="text-sm font-semibold text-secondary mt-0.5">
                        {data.assinatura_presente ? '✅ Presente' : '❌ Não identificada'}
                    </p>
                </div>
                {data.data_aceite && (
                    <div className="text-right">
                        <p className="text-xs text-tertiary">Data:</p>
                        <p className="text-sm font-semibold text-secondary mt-0.5">{data.data_aceite}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

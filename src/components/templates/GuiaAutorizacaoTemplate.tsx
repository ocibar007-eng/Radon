import React from 'react';
import { CreditCard, Building2, User, FileCheck, Calendar, Hash } from 'lucide-react';
import type { GuiaAutorizacaoData } from '../../adapters/schemas-templates';

interface Props {
    data: Partial<GuiaAutorizacaoData>;
}

export const GuiaAutorizacaoTemplate: React.FC<Props> = ({ data }) => {
    return (
        <div className="structured-report-container animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-subtle">
                <CreditCard className="text-success" size={20} />
                <h3 className="text-lg font-bold text-primary">Guia de Autorização</h3>
            </div>

            {/* Convênio */}
            {data.convenio && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded">
                    <div className="flex items-center gap-2 justify-center">
                        <Building2 size={18} className="text-success" />
                        <p className="text-base font-bold text-success">{data.convenio}</p>
                    </div>
                </div>
            )}

            {/* Números da Guia e Carteirinha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {data.numero_guia && (
                    <div className="sr-organ-card border-info/30 bg-info/5">
                        <div className="sr-organ-header">
                            <FileCheck size={16} className="text-info" />
                            <h5 className="sr-organ-title text-info">Nº Guia</h5>
                        </div>
                        <div className="px-3 pb-3">
                            <p className="text-lg font-mono font-bold text-info">{data.numero_guia}</p>
                        </div>
                    </div>
                )}

                {data.numero_carteirinha && (
                    <div className="sr-organ-card">
                        <div className="sr-organ-header">
                            <Hash size={16} className="text-accent" />
                            <h5 className="sr-organ-title">Carteirinha</h5>
                        </div>
                        <div className="px-3 pb-3">
                            <p className="text-sm font-mono font-semibold text-secondary">{data.numero_carteirinha}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Beneficiário */}
            {data.beneficiario && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <User size={16} className="text-accent" />
                        <h5 className="sr-organ-title">Beneficiário</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm font-medium text-secondary">{data.beneficiario}</p>
                    </div>
                </div>
            )}

            {/* Procedimento Autorizado */}
            {data.procedimento_autorizado && (
                <div className="sr-organ-card mb-3 border-success/30 bg-success/5">
                    <div className="sr-organ-header">
                        <FileCheck size={16} className="text-success" />
                        <h5 className="sr-organ-title text-success">Procedimento Autorizado</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm font-semibold text-primary">{data.procedimento_autorizado}</p>

                        {data.codigo_procedimento && (
                            <p className="text-xs text-tertiary mt-2">
                                Código: <span className="font-mono font-semibold">{data.codigo_procedimento}</span>
                            </p>
                        )}

                        {data.quantidade_autorizada && (
                            <p className="text-xs text-tertiary mt-1">
                                Quantidade: <span className="font-semibold">{data.quantidade_autorizada}</span> sessão(ões)
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Validade */}
            {data.validade && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <Calendar size={16} className="text-warning" />
                        <h5 className="sr-organ-title text-warning">Validade</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm font-medium text-secondary">Válido até: {data.validade}</p>
                    </div>
                </div>
            )}

            {/* Observações */}
            {data.observacoes && data.observacoes.length > 0 && (
                <div className="sr-organ-card">
                    <div className="sr-organ-header">
                        <h5 className="sr-organ-title text-tertiary">Observações</h5>
                    </div>
                    <ul className="sr-findings-list">
                        {data.observacoes.map((obs, idx) => (
                            <li key={idx} className="text-xs">{obs}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Alert se dados vazios */}
            {!data.numero_guia && !data.procedimento_autorizado && (
                <div className="text-warning text-sm p-3 border border-amber-900/30 bg-amber-900/10 rounded flex items-center gap-2">
                    <FileCheck size={16} />
                    <span>Guia de autorização detectada, mas dados principais não puderam ser extraídos.</span>
                </div>
            )}
        </div>
    );
};

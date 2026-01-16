import React from 'react';
import { FileText, Calendar, User, Stethoscope, AlertCircle } from 'lucide-react';
import type { PedidoMedicoData } from '../../adapters/schemas-templates';

interface Props {
    data: Partial<PedidoMedicoData>;
}

export const PedidoMedicoTemplate: React.FC<Props> = ({ data }) => {
    return (
        <div className="structured-report-container animate-fade-in">
            {/* Header com ícone */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-subtle">
                <FileText className="text-info" size={20} />
                <h3 className="text-lg font-bold text-primary">Pedido Médico / Ordem de Serviço</h3>
            </div>

            {/* Paciente */}
            {data.paciente?.nome && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <User size={16} className="text-accent" />
                        <h5 className="sr-organ-title">Paciente</h5>
                    </div>
                    <div className="px-3 pb-3 text-sm text-secondary">
                        <p className="font-medium">{data.paciente.nome}</p>
                        {(data.paciente.idade || data.paciente.sexo) && (
                            <p className="text-xs text-tertiary mt-1">
                                {data.paciente.idade && <span>{data.paciente.idade}</span>}
                                {data.paciente.idade && data.paciente.sexo && <span> • </span>}
                                {data.paciente.sexo && <span>{data.paciente.sexo}</span>}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Médico Solicitante */}
            {data.medico_solicitante?.nome && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <Stethoscope size={16} className="text-accent" />
                        <h5 className="sr-organ-title">Médico Solicitante</h5>
                    </div>
                    <div className="px-3 pb-3 text-sm text-secondary">
                        <p className="font-medium">{data.medico_solicitante.nome}</p>
                        {data.medico_solicitante.crm && (
                            <p className="text-xs text-tertiary">{data.medico_solicitante.crm}</p>
                        )}
                        {data.medico_solicitante.especialidade && (
                            <p className="text-xs text-info mt-1">{data.medico_solicitante.especialidade}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Exame Solicitado */}
            {data.exame_solicitado && (
                <div className="sr-organ-card mb-3 border-info/30 bg-info/5">
                    <div className="sr-organ-header">
                        <FileText size={16} className="text-info" />
                        <h5 className="sr-organ-title text-info">Exame Solicitado</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm font-semibold text-primary">{data.exame_solicitado}</p>
                        {data.numero_pedido && (
                            <p className="text-xs text-tertiary mt-2">
                                Nº Pedido: <span className="font-mono">{data.numero_pedido}</span>
                            </p>
                        )}
                        {data.data_solicitacao && (
                            <p className="text-xs text-tertiary flex items-center gap-1 mt-1">
                                <Calendar size={12} />
                                <span>{data.data_solicitacao}</span>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Justificativa Clínica */}
            {data.justificativa_clinica && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <AlertCircle size={16} className="text-warning" />
                        <h5 className="sr-organ-title">Justificativa Clínica</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                            {data.justificativa_clinica}
                        </p>
                        {data.cid && (
                            <p className="text-xs text-accent mt-2">
                                CID: <span className="font-mono font-semibold">{data.cid}</span>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Observações */}
            {data.observacoes && data.observacoes.length > 0 && (
                <div className="sr-organ-card mb-3">
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
            {!data.exame_solicitado && !data.justificativa_clinica && (
                <div className="text-warning text-sm p-3 border border-amber-900/30 bg-amber-900/10 rounded flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Documento de pedido médico detectado, mas campos não puderam ser extraídos.</span>
                </div>
            )}
        </div>
    );
};

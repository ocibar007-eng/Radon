import React from 'react';
import { FileEdit, Calendar, User, Stethoscope, Droplet, AlertTriangle, FileText } from 'lucide-react';

/**
 * Interface para dados extraídos de Anotações Clínicas (assistencial)
 * Ex: Anotações de enfermagem, relatos de intercorrência, contraste, etc.
 */
interface AnotacaoClinicaData {
    transcricao_corrigida?: string;  // Texto OCR limpo/corrigido
    titulo_sugerido?: string;        // Ex: "Anotação de Enfermagem", "Contraste Utilizado"
    data_detectada?: string;         // Data do documento
    profissional?: {
        nome?: string;
        cargo?: string;              // Ex: "Enfermeira", "Técnico de Enfermagem"
        registro?: string;           // COREN, etc.
    };

    // Campos específicos para contraste
    contraste?: {
        tipo?: string;               // Ex: "Gadolínio", "Iodo"
        volume?: string;             // Ex: "15ml"
        via?: string;                // Ex: "Endovenosa"
        lote?: string;
    };

    // Intercorrências
    intercorrencia?: {
        descricao?: string;
        gravidade?: 'leve' | 'moderada' | 'grave';
    };

    // Sinais vitais se detectados
    sinais_vitais?: {
        pa?: string;                 // Pressão arterial
        fc?: string;                 // Frequência cardíaca
        temp?: string;               // Temperatura
        spo2?: string;               // Saturação
    };

    observacoes?: string[];
}

interface Props {
    data: Partial<AnotacaoClinicaData>;
    // verbatimText é o texto OCR original, caso extractedData não tenha transcricao_corrigida
    verbatimText?: string;
    showHeader?: boolean;
}

export const AnotacaoClinicaTemplate: React.FC<Props> = ({ data, verbatimText, showHeader = true }) => {
    // Texto principal: prioriza transcricao_corrigida, depois verbatimText
    const displayText = data.transcricao_corrigida || verbatimText || '';

    const hasContent = displayText || data.contraste?.tipo || data.intercorrencia?.descricao;

    return (
        <div className="structured-report-container animate-fade-in">
            {/* Header */}
            {showHeader && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-subtle">
                    <FileEdit className="text-pink-400" size={20} />
                    <h3 className="text-lg font-bold text-primary">
                        {data.titulo_sugerido || 'Anotação Clínica'}
                    </h3>
                    {data.data_detectada && (
                        <span className="ml-auto text-xs text-tertiary flex items-center gap-1">
                            <Calendar size={12} />
                            {data.data_detectada}
                        </span>
                    )}
                </div>
            )}

            {/* Profissional responsável */}
            {data.profissional?.nome && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <Stethoscope size={16} className="text-accent" />
                        <h5 className="sr-organ-title">Profissional</h5>
                    </div>
                    <div className="px-3 pb-3 text-sm text-secondary">
                        <p className="font-medium">{data.profissional.nome}</p>
                        {data.profissional.cargo && (
                            <p className="text-xs text-tertiary">{data.profissional.cargo}</p>
                        )}
                        {data.profissional.registro && (
                            <p className="text-xs text-info">{data.profissional.registro}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Contraste (se detectado) */}
            {data.contraste?.tipo && (
                <div className="sr-organ-card mb-3 border-cyan-500/30 bg-cyan-500/5">
                    <div className="sr-organ-header">
                        <Droplet size={16} className="text-cyan-400" />
                        <h5 className="sr-organ-title text-cyan-400">Contraste Utilizado</h5>
                    </div>
                    <div className="px-3 pb-3 text-sm">
                        <p className="font-semibold text-primary">{data.contraste.tipo}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-tertiary">
                            {data.contraste.volume && <span>Volume: <b>{data.contraste.volume}</b></span>}
                            {data.contraste.via && <span>Via: <b>{data.contraste.via}</b></span>}
                            {data.contraste.lote && <span>Lote: <b>{data.contraste.lote}</b></span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Intercorrência (se detectada) */}
            {data.intercorrencia?.descricao && (
                <div className={`sr-organ-card mb-3 ${data.intercorrencia.gravidade === 'grave'
                    ? 'border-red-500/30 bg-red-500/10'
                    : data.intercorrencia.gravidade === 'moderada'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-yellow-500/30 bg-yellow-500/5'
                    }`}>
                    <div className="sr-organ-header">
                        <AlertTriangle size={16} className={
                            data.intercorrencia.gravidade === 'grave'
                                ? 'text-red-400'
                                : data.intercorrencia.gravidade === 'moderada'
                                    ? 'text-amber-400'
                                    : 'text-yellow-400'
                        } />
                        <h5 className="sr-organ-title">Intercorrência</h5>
                        {data.intercorrencia.gravidade && (
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${data.intercorrencia.gravidade === 'grave'
                                ? 'bg-red-500/20 text-red-300'
                                : data.intercorrencia.gravidade === 'moderada'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                {data.intercorrencia.gravidade}
                            </span>
                        )}
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                            {data.intercorrencia.descricao}
                        </p>
                    </div>
                </div>
            )}

            {/* Sinais Vitais (se detectados) */}
            {data.sinais_vitais && (data.sinais_vitais.pa || data.sinais_vitais.fc) && (
                <div className="sr-organ-card mb-3">
                    <div className="sr-organ-header">
                        <h5 className="sr-organ-title">Sinais Vitais</h5>
                    </div>
                    <div className="px-3 pb-3 flex flex-wrap gap-4 text-sm">
                        {data.sinais_vitais.pa && (
                            <span className="text-tertiary">PA: <b className="text-primary">{data.sinais_vitais.pa}</b></span>
                        )}
                        {data.sinais_vitais.fc && (
                            <span className="text-tertiary">FC: <b className="text-primary">{data.sinais_vitais.fc}</b></span>
                        )}
                        {data.sinais_vitais.temp && (
                            <span className="text-tertiary">Temp: <b className="text-primary">{data.sinais_vitais.temp}</b></span>
                        )}
                        {data.sinais_vitais.spo2 && (
                            <span className="text-tertiary">SpO2: <b className="text-primary">{data.sinais_vitais.spo2}</b></span>
                        )}
                    </div>
                </div>
            )}

            {/* Transcrição Corrigida (texto principal) */}
            {displayText && (
                <div className="sr-organ-card mb-3 border-pink-500/20 bg-pink-500/5">
                    <div className="sr-organ-header">
                        <FileText size={16} className="text-pink-400" />
                        <h5 className="sr-organ-title text-pink-300">Transcrição</h5>
                    </div>
                    <div className="px-3 pb-3">
                        <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                            {displayText}
                        </p>
                        <p className="text-[10px] text-tertiary mt-2 italic opacity-60">
                            * Transcrição literal com correções ortográficas e de termos técnicos. Conteúdo fiel ao original.
                        </p>
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

            {/* Fallback se não tiver conteúdo */}
            {!hasContent && (
                <div className="text-warning text-sm p-3 border border-amber-900/30 bg-amber-900/10 rounded flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>Anotação clínica detectada, mas conteúdo não pôde ser extraído.</span>
                </div>
            )}
        </div>
    );
};

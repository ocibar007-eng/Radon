import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { AttachmentDoc } from '../types';
import { SimilarityResult } from '../utils/similarity';

interface Props {
    newDoc: AttachmentDoc;
    existingDoc: AttachmentDoc;
    similarity: SimilarityResult;
    onConfirm: (shouldGroup: boolean) => void;
    onCancel: () => void;
}

export const GroupingConfirmDialog: React.FC<Props> = ({
    newDoc,
    existingDoc,
    similarity,
    onConfirm,
    onCancel
}) => {
    const confidencePercent = Math.round(similarity.score * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-elevated border border-strong rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-accent" size={24} />
                        <h2 className="text-lg font-bold text-primary">
                            Estas imagens pertencem ao mesmo laudo?
                        </h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-tertiary hover:text-primary transition-colors"
                        title="Cancelar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

                    {/* Comparison Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="border border-subtle rounded-lg overflow-hidden bg-app">
                            <div className="aspect-[3/4] relative">
                                <img
                                    src={existingDoc.previewUrl}
                                    alt="Documento existente"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="p-3 border-t border-subtle">
                                <p className="text-xs text-secondary font-medium truncate">
                                    {existingDoc.source}
                                </p>
                                <p className="text-xs text-tertiary mt-1">
                                    {existingDoc.detailedAnalysis?.report_metadata.tipo_exame || 'Aguardando análise...'}
                                </p>
                            </div>
                        </div>

                        <div className="border border-accent/30 rounded-lg overflow-hidden bg-app">
                            <div className="aspect-[3/4] relative">
                                <img
                                    src={newDoc.previewUrl}
                                    alt="Nova imagem"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="p-3 border-t border-accent/30 bg-accent/5">
                                <p className="text-xs text-secondary font-medium truncate">
                                    {newDoc.source}
                                </p>
                                <p className="text-xs text-accent mt-1 font-bold">
                                    ← Nova imagem
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Similarity Info */}
                    <div className="bg-surface rounded-lg p-4 border border-subtle mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-secondary font-medium">
                                Confiança de Similaridade
                            </span>
                            <span className={`text-lg font-bold ${confidencePercent >= 70 ? 'text-success' :
                                    confidencePercent >= 50 ? 'text-warning' :
                                        'text-error'
                                }`}>
                                {confidencePercent}%
                            </span>
                        </div>

                        {similarity.reasons.length > 0 && (
                            <div>
                                <p className="text-xs text-tertiary mb-2">Motivos:</p>
                                <ul className="space-y-1">
                                    {similarity.reasons.map((reason, idx) => (
                                        <li key={idx} className="text-xs text-secondary flex items-start gap-2">
                                            <span className="text-accent mt-0.5">•</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Help Text */}
                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                        <p className="text-sm text-info leading-relaxed">
                            <strong>Dica:</strong> Se as duas imagens são partes do mesmo laudo médico (ex: página 1 e página 2),
                            clique em "Sim, são do mesmo laudo". Caso contrário, se são laudos diferentes ou de pacientes diferentes,
                            clique em "Não, são laudos diferentes".
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-subtle flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="btn btn-ghost"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(false)}
                        className="btn btn-outline"
                    >
                        Não, são laudos diferentes
                    </button>
                    <button
                        onClick={() => onConfirm(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Check size={16} />
                        Sim, são do mesmo laudo
                    </button>
                </div>
            </div>
        </div>
    );
};

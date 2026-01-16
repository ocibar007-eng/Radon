import React from 'react';
import { Check, X, HelpCircle } from 'lucide-react';

interface Props {
    images: File[];
    onConfirm: (shouldGroup: boolean) => void;
    onCancel: () => void;
}

export const MultipleImagesDialog: React.FC<Props> = ({ images, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-elevated border border-strong rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="text-accent" size={24} />
                        <h2 className="text-lg font-bold text-primary">
                            Estas imagens pertencem ao mesmo laudo?
                        </h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <p className="text-sm text-secondary mb-4">
                        Você enviou <strong className="text-primary">{images.length} imagens</strong> ao mesmo tempo.
                        São páginas do mesmo laudo médico ou laudos diferentes?
                    </p>

                    {/* Image Grid */}
                    <div className={`grid gap-4 mb-6 ${images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {images.map((file, idx) => (
                            <div key={idx} className="border border-subtle rounded-lg overflow-hidden bg-app">
                                <div className="aspect-[3/4] relative bg-zinc-900">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Imagem ${idx + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="p-2 border-t border-subtle">
                                    <p className="text-xs text-tertiary text-center">
                                        Imagem {idx + 1}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Help Text */}
                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                        <p className="text-sm text-info leading-relaxed">
                            <strong>Mesmo laudo:</strong> Se estas imagens são partes do mesmo exame médico (ex: página 1 e página 2 de uma ressonância).
                            <br />
                            <strong>Laudos diferentes:</strong> Se são exames diferentes ou de datas diferentes.
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
                        className="btn btn-outline flex items-center gap-2"
                    >
                        <X size={16} />
                        Laudos diferentes
                    </button>
                    <button
                        onClick={() => onConfirm(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Check size={16} />
                        Sim, mesmo laudo
                    </button>
                </div>
            </div>
        </div>
    );
};

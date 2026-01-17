
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Maximize2, Minimize2 } from 'lucide-react';
import { useGallery } from '../context/GalleryContext';
import { ClassificationChip } from './ClassificationChip';

export const GlobalGalleryModal: React.FC = () => {
    const {
        isOpen,
        currentDoc,
        closeGallery,
        nextImage,
        prevImage,
        hasPrev,
        hasNext,
        currentIndex,
        totalDocs,
        reclassifyCurrentDoc
    } = useGallery();

    const [isExpanded, setIsExpanded] = useState(false);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'Escape') closeGallery();
            if (e.key === 'f' || e.key === 'F') setIsExpanded(prev => !prev);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, nextImage, prevImage, closeGallery]);

    // Reset expanded state when modal opens
    useEffect(() => {
        if (isOpen) setIsExpanded(false);
    }, [isOpen]);

    if (!currentDoc) return null;

    const title = currentDoc.source === 'upload' && currentDoc.file
        ? currentDoc.file.name
        : currentDoc.source;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
                onClick={closeGallery}
            />

            {/* Modal Container - Compact by default, Expanded on toggle */}
            <div className={`
                relative flex flex-col pointer-events-none transition-all duration-300 ease-out
                ${isExpanded
                    ? 'w-full max-w-6xl h-[95vh]'
                    : 'w-full max-w-2xl h-auto max-h-[70vh]'
                }
            `}>
                <div className="flex-1 flex flex-col pointer-events-auto bg-zinc-900/90 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl">

                    {/* Header Compacto */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-white truncate max-w-[250px]">{title}</h3>
                            {totalDocs > 1 && (
                                <span className="text-xs text-zinc-400 font-mono bg-black/30 px-2 py-0.5 rounded">
                                    {currentIndex} / {totalDocs}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsExpanded(prev => !prev)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title={isExpanded ? "Compactar (F)" : "Expandir (F)"}
                            >
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button
                                onClick={closeGallery}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                                title="Fechar (ESC)"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Main Viewport */}
                    <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">

                        {/* Botão Anterior */}
                        {hasPrev && (
                            <button
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-2 p-2 rounded-full bg-black/50 hover:bg-white/10 text-white transition-all border border-white/10 hover:border-white/30 z-30"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {/* Imagem */}
                        <div className="relative shadow-xl rounded-lg overflow-hidden border border-white/10 bg-black/50 max-h-full">
                            {currentDoc.previewUrl ? (
                                <img
                                    src={currentDoc.previewUrl}
                                    alt="Preview"
                                    className={`object-contain transition-all duration-300 ${isExpanded ? 'max-h-[80vh]' : 'max-h-[50vh]'}`}
                                    style={{ maxWidth: '100%' }}
                                />
                            ) : (
                                <div className="w-64 h-48 flex flex-col items-center justify-center text-zinc-500">
                                    <ZoomIn size={36} className="mb-3 opacity-50" />
                                    <span className="text-sm">Preview indisponível</span>
                                </div>
                            )}
                        </div>

                        {/* Botão Próximo */}
                        {hasNext && (
                            <button
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-2 p-2 rounded-full bg-black/50 hover:bg-white/10 text-white transition-all border border-white/10 hover:border-white/30 z-30"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>

                    {/* Footer - Chip de Classificação */}
                    <div className="flex items-center justify-center px-4 py-3 border-t border-white/10 bg-zinc-800/50">
                        <ClassificationChip
                            classification={currentDoc.classification}
                            size="sm"
                            onChange={reclassifyCurrentDoc}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

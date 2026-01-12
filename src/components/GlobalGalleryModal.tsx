
import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useGallery } from '../context/GalleryContext';

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
    totalDocs
  } = useGallery();

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextImage, prevImage]);

  if (!currentDoc) return null;

  const title = currentDoc.source === 'upload' && currentDoc.file 
    ? currentDoc.file.name 
    : currentDoc.source;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop: Glassmorphism Blur Dark */}
        <div 
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" 
            onClick={closeGallery}
        />

        <div className="relative w-full max-w-5xl h-[90vh] flex flex-col pointer-events-none">
            {/* Modal Content Wrapper (Pointer Events On) */}
            <div className="flex-1 flex flex-col pointer-events-auto bg-transparent relative">
                
                {/* Header Flutuante */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-zinc-950/90 to-transparent">
                    <div className="text-white drop-shadow-md">
                        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                         {totalDocs > 1 && (
                            <span className="text-sm text-zinc-300 font-mono bg-black/40 px-2 py-0.5 rounded">
                                {currentIndex} / {totalDocs}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={closeGallery}
                        className="p-2 rounded-full bg-black/40 hover:bg-white/20 text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Viewport */}
                <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative">
                    
                    {/* Botão Anterior */}
                    {hasPrev && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur transition-all border border-white/10 hover:border-white/30 z-30"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {/* Imagem */}
                    <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-black/50">
                        {currentDoc.previewUrl ? (
                            <img 
                                src={currentDoc.previewUrl} 
                                alt="Preview" 
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        ) : (
                            <div className="w-96 h-64 flex flex-col items-center justify-center text-zinc-500">
                                <ZoomIn size={48} className="mb-4 opacity-50"/>
                                <span>Preview indisponível</span>
                            </div>
                        )}
                    </div>

                    {/* Botão Próximo */}
                    {hasNext && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur transition-all border border-white/10 hover:border-white/30 z-30"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}
                </div>

                {/* Footer Labels */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                    <span className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border shadow-lg backdrop-blur-sm
                        ${currentDoc.classification === 'laudo_previo' 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                        {currentDoc.classification === 'laudo_previo' ? 'Laudo Prévio' : 'Documento Assistencial'}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

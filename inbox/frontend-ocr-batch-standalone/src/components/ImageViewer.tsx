
import React, { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Minus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { BatchFile, FileType } from '@/types';

interface ImageViewerProps {
  files: BatchFile[];
  initialIndex: number;
  onClose: () => void;
  onToggleSelection: (id: string) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ files, initialIndex, onClose, onToggleSelection }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1 < files.length ? prev + 1 : 0));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [files.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : files.length - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [files.length]);

  const file = files[currentIndex];

  const handleToggle = useCallback(() => {
    if (file) onToggleSelection(file.id);
  }, [file, onToggleSelection]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose, handleToggle, handleZoomIn, handleZoomOut, handleResetZoom]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-md animate-in fade-in duration-300"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >

      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto flex flex-col">
          <h2 className="text-white/90 font-medium text-lg tracking-tight drop-shadow-md">{file.normalizedName}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-white/50 text-xs font-mono">{file.name}</span>
            {file.type === FileType.DICOM && (
              <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">DICOM</span>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-sm">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-white/50 text-xs font-mono px-2 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all border border-white/5 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Selection Control (Center Bottom) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
        <button
          onClick={handleToggle}
          className={`
                group flex items-center gap-3 px-6 py-3 rounded-full font-medium text-sm shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-xl transition-all transform hover:-translate-y-1 active:scale-95 border
                ${file.isSelected
              ? 'bg-white text-black border-white ring-4 ring-white/10'
              : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
            }
            `}
        >
          {file.isSelected ? <Check className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {file.isSelected ? 'Selecionado' : 'Selecionar'}
          <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-1 tracking-wider border ${file.isSelected ? 'bg-black/10 border-black/10 text-black/60' : 'bg-white/10 border-white/10 text-white/50'}`}>Espaço</div>
        </button>

        <div className="text-white/30 text-xs font-mono tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
          {String(currentIndex + 1).padStart(2, '0')} <span className="mx-1 text-white/10">/</span> {String(files.length).padStart(2, '0')}
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-3 text-[9px] text-white/30 font-mono">
          <span>← → Navegar</span>
          <span>+/− Zoom</span>
          <span>0 Reset</span>
          <span>ESC Fechar</span>
        </div>
      </div>

      {/* Navigation Areas (Invisible but clickable sides) */}
      <div className="absolute inset-y-0 left-0 w-1/5 z-0 cursor-w-resize flex items-center justify-start pl-6 group" onClick={handlePrev}>
        <div className="p-4 rounded-full bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white transition-all backdrop-blur-sm border border-transparent group-hover:border-white/10 opacity-0 group-hover:opacity-100 transform -translate-x-4 group-hover:translate-x-0 duration-300">
          <ChevronLeft className="w-8 h-8" />
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-1/5 z-0 cursor-e-resize flex items-center justify-end pr-6 group" onClick={handleNext}>
        <div className="p-4 rounded-full bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white transition-all backdrop-blur-sm border border-transparent group-hover:border-white/10 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 duration-300">
          <ChevronRight className="w-8 h-8" />
        </div>
      </div>

      {/* Main Content - Zoomable Image */}
      <div
        className={`relative z-0 max-w-6xl max-h-[82vh] p-4 overflow-hidden ${zoom > 1 ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        {file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt="preview"
            draggable={false}
            className={`max-w-full max-h-[82vh] object-contain shadow-2xl rounded-sm transition-all duration-200 select-none ${file.isSelected ? 'ring-2 ring-white ring-offset-4 ring-offset-black/90' : 'opacity-95'}`}
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
          />
        ) : (
          <div className="text-zinc-500 flex flex-col items-center">
            <p>Visualização Indisponível</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ImageViewer;

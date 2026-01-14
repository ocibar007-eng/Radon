import React, { useState } from 'react';
import { BatchFile, FileType, ProcessStatus, SortMethod } from '../types';
import { FileText, Trash2, GripVertical, AlertCircle, CheckCircle2, Loader2, Calendar, ListFilter, ArrowUpDown, Info, Eye, Check, User, Layers } from 'lucide-react';
import { formatBytes } from '../utils/fileHelpers';
import { ProgressBar } from './ui/ProgressBar';

interface FileListProps {
  files: BatchFile[];
  onRemove: (id: string) => void;
  sortMethod: SortMethod;
  onSortChange: (method: SortMethod) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPreview: (index: number) => void;
  isProcessing: boolean;
  onToggleSelection: (id: string) => void;
  isDarkMode?: boolean;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onRemove,
  sortMethod,
  onSortChange,
  onMoveItem,
  onPreview,
  isProcessing,
  onToggleSelection,
  isDarkMode = false
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (sortMethod !== SortMethod.MANUAL) onSortChange(SortMethod.MANUAL);
    onMoveItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  const calculateTotalProgress = () => {
    if (files.length === 0) return 0;
    const completed = files.filter(f => f.status === ProcessStatus.COMPLETED).length;
    return (completed / files.length) * 100;
  };

  if (files.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center p-12 rounded-2xl border border-dashed shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
          <FileText className={`w-8 h-8 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
        </div>
        <h3 className={`font-semibold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Nenhum arquivo importado</h3>
        <p className={`text-sm max-w-xs leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Sua fila de processamento está vazia. Adicione arquivos para começar.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full rounded-2xl border shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200/80'}`}>

      {/* List Header */}
      <div className={`px-6 py-4 border-b backdrop-blur-md flex flex-col gap-3 sticky top-0 z-10 ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-100'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Fila de Arquivos ({files.length})
          </span>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100/80 border-zinc-200/50'}`}>
              <button
                onClick={() => onSortChange(SortMethod.TIMESTAMP)}
                className={`p-1.5 rounded-md transition-all ${sortMethod === SortMethod.TIMESTAMP
                  ? (isDarkMode ? 'bg-zinc-700 shadow-sm text-white ring-1 ring-zinc-600' : 'bg-white shadow-sm text-zinc-900 ring-1 ring-black/5')
                  : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/50')}`}
                title="Ordenar Inteligente (PACS/Data)"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSortChange(SortMethod.FILENAME)}
                className={`p-1.5 rounded-md transition-all ${sortMethod === SortMethod.FILENAME
                  ? (isDarkMode ? 'bg-zinc-700 shadow-sm text-white ring-1 ring-zinc-600' : 'bg-white shadow-sm text-zinc-900 ring-1 ring-black/5')
                  : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/50')}`}
                title="Ordenar por Nome"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSortChange(SortMethod.MANUAL)}
                className={`p-1.5 rounded-md transition-all ${sortMethod === SortMethod.MANUAL
                  ? (isDarkMode ? 'bg-zinc-700 shadow-sm text-white ring-1 ring-zinc-600' : 'bg-white shadow-sm text-zinc-900 ring-1 ring-black/5')
                  : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/50')}`}
                title="Ordenação Manual"
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Global Progress Bar when processing */}
        {isProcessing && (
          <ProgressBar
            value={calculateTotalProgress()}
            animated={true}
            isDarkMode={isDarkMode}
            size="sm"
            variant="default"
            className="w-full"
          />
        )}
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 ${isDarkMode ? 'bg-[#252529]/30' : 'bg-zinc-50/30'}`}>
        {files.map((file, index) => {
          const isSelected = file.isSelected;

          return (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onClick={() => onPreview(index)}
              className={`
                group relative flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 cursor-pointer
                ${isSelected
                  ? (isDarkMode
                    ? 'bg-zinc-800/80 border-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                    : 'bg-white border-amber-500 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.2)]')
                  : (isDarkMode
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm')
                }
              `}
            >
              {/* Main Row */}
              <div className="flex items-center gap-3">
                {/* Drag Handle */}
                <div
                  className={`cursor-grab active:cursor-grabbing p-1 -ml-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400' : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Checkbox */}
                <div
                  onClick={(e) => { e.stopPropagation(); onToggleSelection(file.id); }}
                  className={`
                    w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all duration-200 cursor-pointer
                    ${file.isSelected
                      ? 'bg-amber-500 border-amber-500 text-white scale-100'
                      : (isDarkMode ? 'border-zinc-700 bg-zinc-800/50 text-transparent hover:border-zinc-600' : 'border-zinc-300 bg-white text-transparent hover:border-zinc-400')
                    }
                  `}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>

                {/* File Icon */}
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-[#252529] border border-zinc-800' : 'bg-zinc-50 border border-zinc-100'}`}>
                  {file.type === FileType.DICOM ? (
                    <Layers className="w-4 h-4 text-blue-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-medium text-sm truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>
                      {file.name}
                    </span>
                    {/* Status Badge */}
                    {file.status === ProcessStatus.COMPLETED && (
                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        Concluído
                      </div>
                    )}
                    {file.status === ProcessStatus.ERROR && (
                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        Erro
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatBytes(file.size)}</span>
                    {file.metadata?.patientName && (
                      <span className={`flex items-center gap-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <User className="w-3 h-3" /> {file.metadata.patientName}
                      </span>
                    )}
                    {file.metadata?.modality && (
                      <span className={`px-1.5 rounded-md text-[10px] font-medium border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
                        {file.metadata.modality}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isProcessing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onPreview(index); }}
                    className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar (Per File) */}
              {file.status === ProcessStatus.PROCESSING && (
                <div className="mt-1">
                  <ProgressBar value={45} animated={true} size="sm" isDarkMode={isDarkMode} variant="warning" />
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>Processando...</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileList;

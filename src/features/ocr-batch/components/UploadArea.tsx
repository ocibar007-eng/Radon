import React, { useRef, useState } from 'react';
import { Upload, FolderInput, Loader2, Plus, FileUp, Image as ImageIcon, Keyboard } from 'lucide-react';
import { processDropItems, processZipFile, traverseFileTree } from '../utils/fileHelpers';
import { Card } from './ui/Card';

interface UploadAreaProps {
  onFilesSelected: (files: File[], groupName?: string) => Promise<void>;
  isProcessing: boolean;
  isDarkMode?: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesSelected, isProcessing, isDarkMode = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing && !isReading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing || isReading) return;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsReading(true);
      try {
        const items = Array.from(e.dataTransfer.items);

        const zipFiles: File[] = [];
        const looseFiles: File[] = [];
        const directories: { entry: FileSystemDirectoryEntry; name: string }[] = [];

        for (const item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && file.name.toLowerCase().endsWith('.zip')) {
              zipFiles.push(file);
            } else if (file) {
              const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
              if (entry && entry.isDirectory) {
                directories.push({ entry: entry as FileSystemDirectoryEntry, name: entry.name });
              } else {
                looseFiles.push(file);
              }
            }
          }
        }

        for (const zipFile of zipFiles) {
          const extracted = await processZipFile(zipFile);
          if (extracted.length > 0) {
            const groupName = zipFile.name.replace('.zip', '');
            await onFilesSelected(extracted, groupName);
          }
        }

        for (const dir of directories) {
          const dirFiles = await traverseFileTree(dir.entry);
          if (dirFiles && dirFiles.length > 0) {
            await onFilesSelected(dirFiles, dir.name);
          }
        }

        if (looseFiles.length > 0) {
          const validFiles = looseFiles.filter(f => f && f.name);
          if (validFiles.length > 0) {
            await onFilesSelected(validFiles);
          }
        }

      } catch (error) {
        console.error("Error reading drop items:", error);
      } finally {
        setIsReading(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsReading(true);
      try {
        await onFilesSelected(files);
      } finally {
        setIsReading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative overflow-hidden group h-36 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragging || isReading
          ? (isDarkMode ? 'border-amber-500 bg-amber-500/10' : 'border-amber-500 bg-amber-50')
          : (isDarkMode ? 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800' : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50')
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        multiple
        accept=".png,.jpg,.jpeg,.dcm,.dicom,.zip"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        {isReading ? (
          <>
            <Loader2 className={`w-8 h-8 animate-spin mb-3 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`} />
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Lendo arquivos...</p>
          </>
        ) : (
          <>
            <div className={`
                        p-3 rounded-full mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                        ${isDragging
                ? (isDarkMode ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white')
                : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400')
              }
                    `}>
              <Upload className="w-5 h-5" />
            </div>

            <p className={`text-sm font-medium mb-1 transition-colors ${isDragging ? 'text-amber-500' : (isDarkMode ? 'text-zinc-300' : 'text-zinc-700')}`}>
              {isDragging ? 'Solte para adicionar' : 'Clique ou arraste arquivos aqui'}
            </p>

            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              DICOM, Imagens, ZIP ou Pastas (Ctrl+V para colar)
            </p>

            <div className={`mt-3 flex items-center gap-4 text-[10px] items-center opacity-60 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span className="flex items-center gap-1"><FolderInput className="w-3 h-3" /> Múltiplas Pastas</span>
              <span className="flex items-center gap-1"><FileUp className="w-3 h-3" /> ZIP Automático</span>
            </div>
          </>
        )}
      </div>

      {/* Decorative corner accents */}
      <div className={`absolute top-0 right-0 p-4 transition-opacity duration-300 ${isDragging ? 'opacity-100' : 'opacity-0'}`}>
        <Plus className="w-6 h-6 text-amber-500 animate-pulse" />
      </div>
    </div>
  );
};

export default UploadArea;


import React, { useState, useMemo } from 'react';
import { Search, UploadCloud } from 'lucide-react';
import { ReportGroupCard } from './ReportGroupCard';
import { PdfDocumentBundle } from './PdfDocumentBundle';
import { ReportGroup, groupReportsByPdf } from '../../utils/grouping';
import { Button } from '../../components/ui/Button';
import { DocClassification } from '../../types';

interface Props {
  groups: ReportGroup[];
  onRemoveGroup: (groupId: string) => void;
  onSplitGroup?: (groupId: string, splitStartPage: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFiles?: (files: File[]) => void;
  onReclassifyDoc?: (docId: string, newType: DocClassification) => void;
}

export const PreviousReportsTab: React.FC<Props> = ({ groups, onRemoveGroup, onSplitGroup, onUpload, onDropFiles, onReclassifyDoc }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const isFileDragEvent = (event: React.DragEvent<HTMLDivElement>) => {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0 && onDropFiles) {
      onDropFiles(files);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;

    const term = searchTerm.toLowerCase();

    return groups.filter(group => {
      if (group.title.toLowerCase().includes(term)) return true;
      if (group.type?.toLowerCase().includes(term)) return true;
      if (group.date?.toLowerCase().includes(term)) return true;

      return group.docs.some(doc =>
        doc.verbatimText?.toLowerCase().includes(term) ||
        doc.source.toLowerCase().includes(term)
      );
    });
  }, [groups, searchTerm]);

  return (
    <div
      className="animate-fade-in"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={isDragOver ? { outline: '2px dashed var(--color-accent-primary)', outlineOffset: '6px' } : undefined}
    >
      {/* Search & Actions Bar */}
      <div className="flex gap-2 mb-4">
        <div className="search-container flex-1 mb-0">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar em laudos prévios (tipo, data, conteúdo)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <label>
          <Button as="span" variant="secondary" className="cursor-pointer h-full">
            <UploadCloud size={16} className="mr-2" />
            Adicionar Laudo
          </Button>
          <input
            type="file"
            multiple
            hidden
            accept="image/*,application/pdf"
            onChange={onUpload}
          />
        </label>
      </div>

      <div className="reports-grid">
        {filteredGroups.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'Nenhum laudo encontrado para sua busca.' : 'Nenhum laudo prévio identificado.'}
          </div>
        ) : (
          // Agrupa ReportGroups do mesmo PDF para exibir com abas
          groupReportsByPdf(filteredGroups).map(bundle =>
            bundle.groups.length > 1 ? (
              // Bundle com múltiplos tipos → Renderiza com abas
              <PdfDocumentBundle
                key={bundle.pdfBaseName || bundle.groups[0].id}
                groups={bundle.groups}
                onRemoveGroup={onRemoveGroup}
                onSplitGroup={onSplitGroup}
                onReclassifyDoc={onReclassifyDoc}
              />
            ) : (
              // Grupo solo → Renderiza card normal (preserva comportamento existente)
              <ReportGroupCard
                key={bundle.groups[0].id}
                group={bundle.groups[0]}
                onRemove={() => onRemoveGroup(bundle.groups[0].id)}
                onSplitGroup={onSplitGroup}
              />
            )
          )
        )}
      </div>
    </div>
  );
};

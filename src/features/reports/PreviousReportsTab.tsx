
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
  onManualGroupDocs?: (docIds: string[]) => void;
  onReprocessGroup?: (group: ReportGroup) => Promise<boolean>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFiles?: (files: File[]) => void;
  onReclassifyDoc?: (docId: string, newType: DocClassification) => void;
}

export const PreviousReportsTab: React.FC<Props> = ({
  groups,
  onRemoveGroup,
  onSplitGroup,
  onManualGroupDocs,
  onReprocessGroup,
  onUpload,
  onDropFiles,
  onReclassifyDoc
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBlankPages, setShowBlankPages] = useState(false);

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

  const blankGroups = useMemo(
    () => filteredGroups.filter(group => group.docs.every(doc => doc.classification === 'pagina_vazia')),
    [filteredGroups]
  );

  const visibleGroups = useMemo(
    () => (showBlankPages ? filteredGroups : filteredGroups.filter(group => group.docs.some(doc => doc.classification !== 'pagina_vazia'))),
    [filteredGroups, showBlankPages]
  );

  const groupedBundles = useMemo(() => groupReportsByPdf(visibleGroups), [visibleGroups]);

  const stats = useMemo(() => {
    const documents = visibleGroups.reduce((acc, group) => acc + group.docs.length, 0);
    return {
      groups: visibleGroups.length,
      documents,
      sources: groupedBundles.length
    };
  }, [visibleGroups, groupedBundles]);

  return (
    <div
      className={`reports-shell animate-fade-in ${isDragOver ? 'is-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="reports-hero">
        <div className="reports-hero-main">
          <span className="reports-hero-eyebrow">Histórico do paciente</span>
          <h3 className="reports-hero-title">Documentos Clínicos</h3>
          <p className="reports-hero-subtitle">
            Laudos, pedidos e formulários agrupados por exame para revisão rápida.
          </p>
        </div>
        <div className="reports-hero-stats">
          <div className="reports-stat">
            <span>Grupos</span>
            <strong>{stats.groups}</strong>
          </div>
          <div className="reports-stat">
            <span>Documentos</span>
            <strong>{stats.documents}</strong>
          </div>
          <div className="reports-stat">
            <span>Arquivos</span>
            <strong>{stats.sources}</strong>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="reports-toolbar">
        <div className="search-container flex-1 mb-0">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar em documentos clínicos (tipo, data, conteúdo)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {blankGroups.length > 0 && (
          <button
            type="button"
            className="text-xs text-tertiary hover:text-accent transition-colors"
            onClick={() => setShowBlankPages((prev) => !prev)}
          >
            {showBlankPages ? 'Ocultar' : 'Mostrar'} páginas em branco ({blankGroups.length})
          </button>
        )}

        <label>
          <Button as="span" variant="secondary" className="cursor-pointer h-full">
            <UploadCloud size={16} className="mr-2" />
            Adicionar Documento
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
        {visibleGroups.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'Nenhum documento encontrado para sua busca.' : 'Nenhum documento clínico identificado.'}
          </div>
        ) : (
          // Agrupa ReportGroups do mesmo PDF para exibir com abas
          groupedBundles.map(bundle =>
            bundle.groups.length > 1 ? (
              // Bundle com múltiplos tipos → Renderiza com abas
              <PdfDocumentBundle
                key={bundle.pdfBaseName || bundle.groups[0].id}
                groups={bundle.groups}
                onRemoveGroup={onRemoveGroup}
                onSplitGroup={onSplitGroup}
                onManualGroupDocs={onManualGroupDocs}
                onReprocessGroup={onReprocessGroup}
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

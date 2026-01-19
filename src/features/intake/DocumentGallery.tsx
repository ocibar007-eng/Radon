
import React, { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, FileText, Image as ImageIcon, Eye, History, Plus } from 'lucide-react';
import { AttachmentDoc, DocClassification } from '../../types';
import { ClassificationChip } from '../../components/ClassificationChip';
import type { ReportGroup } from '../../utils/grouping';
import { useGallery } from '../../context/GalleryContext';

interface Props {
  docs: AttachmentDoc[];
  reportGroups: ReportGroup[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, forcedType?: DocClassification) => void;
  onDropFiles?: (files: File[], target: DocClassification) => void;
  onRemoveDoc: (id: string) => void;
  onReclassifyDoc: (docId: string, target: DocClassification) => void;
}

export const DocumentGallery: React.FC<Props> = ({ docs, reportGroups, onUpload, onDropFiles, onRemoveDoc, onReclassifyDoc }) => {
  const { openGallery } = useGallery();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBlankPages, setShowBlankPages] = useState(false);

  const blankDocs = useMemo(() => docs.filter(doc => doc.classification === 'pagina_vazia'), [docs]);
  const visibleDocs = useMemo(
    () => (showBlankPages ? docs : docs.filter(doc => doc.classification !== 'pagina_vazia')),
    [docs, showBlankPages]
  );

  const handleDragStart = (docId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', docId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    // Check if it's a file drop
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      // Files are handled by the input onChange usually, but we need to pass them up
      // If onDropFiles is provided, use it
      if (onDropFiles) {
        onDropFiles(Array.from(event.dataTransfer.files), 'indeterminado'); // Default to AI classification
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const renderDocRow = (doc: AttachmentDoc) => {
    const isError = doc.status === 'error';
    const isPdf = doc.file?.type === 'application/pdf' || doc.source.toLowerCase().endsWith('.pdf');

    return (
      <div
        key={doc.id}
        className={`doc-row-item ${isError ? 'error' : ''} ${doc.status === 'processing' ? 'processing' : ''}`}
        draggable={!isError}
        onDragStart={handleDragStart(doc.id)}
        onClick={() => !isError && openGallery(visibleDocs, doc.id, onReclassifyDoc)}
      >
        {doc.status === 'processing' && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-accent w-full animate-progress-indeterminate z-10" />
        )}

        <div className={`doc-row-icon ${isError ? 'error' : (isPdf ? 'pdf' : 'img')}`}>
          {isError ? <AlertTriangle size={16} /> : (isPdf ? <FileText size={16} /> : <ImageIcon size={16} />)}
        </div>

        <div className="doc-row-info">
          <span className="doc-row-name" title={doc.source}>{doc.source}</span>
          <div className="doc-row-meta">
            {doc.status === 'processing' ? (
              <span className="text-accent text-[10px] font-bold uppercase animate-pulse">Processando...</span>
            ) : (
              <>
                <span className={`status-dot-mini ${doc.status}`} />
                <span style={{ textTransform: 'capitalize' }}>{doc.status === 'done' ? 'Processado' : doc.status}</span>
              </>
            )}
            {isError && <span className="text-error ml-2">{doc.errorMessage || 'Falha'}</span>}
            {!isError && doc.status === 'done' && (
              <div onClick={(e) => e.stopPropagation()}>
                <ClassificationChip
                  classification={doc.classification}
                  size="xs"
                  isRecoveredBySystem={doc.isRecoveredBySystem}
                  onChange={(newType) => onReclassifyDoc(doc.id, newType)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="doc-row-actions">
          <button className="action-btn-mini" title="Visualizar" onClick={(e) => { e.stopPropagation(); openGallery(visibleDocs, doc.id, onReclassifyDoc); }}>
            <Eye size={14} />
          </button>
          <button className="action-btn-mini" title="Remover" onClick={(e) => { e.stopPropagation(); onRemoveDoc(doc.id); }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="gallery-section">
      <div className="gallery-section-header">
        <div>
          <h4 className="gallery-section-title">Documentos do Paciente</h4>
          <span className="text-muted text-xs">Arraste arquivos para adicionar</span>
        </div>
        {blankDocs.length > 0 && (
          <button
            type="button"
            className="text-xs text-tertiary hover:text-accent transition-colors"
            onClick={() => setShowBlankPages((prev) => !prev)}
          >
            {showBlankPages ? 'Ocultar' : 'Mostrar'} páginas em branco ({blankDocs.length})
          </button>
        )}
      </div>

      <div
        className={`doc-group-card ${isDragOver ? 'drag-active-amber' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="doc-group-header doc-group-header-amber">
          <FileText size={16} />
          <span>Todos os Arquivos</span>
          <span className="doc-group-count">{visibleDocs.length}</span>
        </div>

        <div className="doc-group-content">
          {visibleDocs.length === 0 ? (
            <div className="doc-group-empty">
              Nenhum documento
            </div>
          ) : (
            visibleDocs.map(renderDocRow)
          )}
        </div>

        <label className="doc-group-add doc-group-add-amber">
          <Plus size={16} />
          <span>Adicionar Arquivos</span>
          <input
            type="file" multiple hidden accept="image/*,application/pdf"
            onChange={(e) => onUpload(e, undefined)}
          />
        </label>
      </div>
    </div>
  );
};

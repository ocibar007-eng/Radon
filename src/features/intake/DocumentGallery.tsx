
import React, { useMemo, useState } from 'react';
import { UploadCloud, Trash2, AlertTriangle, FileText, Image as ImageIcon, Eye, MoreHorizontal, History } from 'lucide-react';
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
  const [dragTarget, setDragTarget] = useState<'assistencial' | 'laudo_previo' | null>(null);
  const [fileDropTarget, setFileDropTarget] = useState<'assistencial' | 'laudo_previo' | null>(null);

  const assistencialDocs = useMemo(
    () => docs.filter(doc => doc.classification !== 'laudo_previo'),
    [docs]
  );

  const laudoDocs = useMemo(
    () => docs.filter(doc => doc.classification === 'laudo_previo'),
    [docs]
  );

  const isFileDragEvent = (event: React.DragEvent<HTMLDivElement>) => {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  const handleDragStart = (docId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', docId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (target: DocClassification) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isFileDragEvent(event)) {
      const files = Array.from(event.dataTransfer.files || []);
      if (files.length > 0 && onDropFiles) {
        onDropFiles(files, target);
      }
      setDragTarget(null);
      setFileDropTarget(null);
      return;
    }

    const docId = event.dataTransfer.getData('text/plain');
    if (docId) onReclassifyDoc(docId, target);
    setDragTarget(null);
    setFileDropTarget(null);
  };

  const handleDragOver = (target: 'assistencial' | 'laudo_previo') => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const isFile = isFileDragEvent(event);
    event.dataTransfer.dropEffect = isFile ? 'copy' : 'move';
    if (!isFile && dragTarget !== target) setDragTarget(target);
    if (isFile && fileDropTarget !== target) setFileDropTarget(target);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setFileDropTarget(null);
  };

  const renderDocRow = (doc: AttachmentDoc) => {
    const isError = doc.status === 'error';
    // Lógica de ícone corrigida: verifica MIME type do FILE ou extensão no nome
    const isPdf = doc.file?.type === 'application/pdf' || doc.source.toLowerCase().endsWith('.pdf');
    const isImage = !isPdf;

    return (
      <div
        key={doc.id}
        className={`doc-row-item ${isError ? 'error' : ''} ${doc.status === 'processing' ? 'processing' : ''}`}
        draggable={!isError}
        onDragStart={handleDragStart(doc.id)}
        onClick={() => !isError && openGallery(docs, doc.id)}
      >
        {/* Processing Progress Bar (Absolute Overlay) */}
        {doc.status === 'processing' && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-accent w-full animate-progress-indeterminate z-10" />
        )}

        {/* Icon */}
        <div className={`doc-row-icon ${isError ? 'error' : (isPdf ? 'pdf' : 'img')}`}>
          {isError ? <AlertTriangle size={16} /> : (isPdf ? <FileText size={16} /> : <ImageIcon size={16} />)}
        </div>

        {/* Info */}
        <div className="doc-row-info">
          <span className="doc-row-name" title={doc.source}>
            {doc.source}
          </span>
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
              <ClassificationChip classification={doc.classification} size="xs" isRecoveredBySystem={doc.isRecoveredBySystem} />
            )}
          </div>
        </div>

        {/* Actions (Hover only) */}
        <div className="doc-row-actions">
          <button className="action-btn-mini" title="Visualizar" onClick={(e) => { e.stopPropagation(); openGallery(docs, doc.id); }}>
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
        <h4 className="gallery-section-title">Inventário de Arquivos</h4>
        <span className="text-muted text-xs">Arraste para organizar</span>
      </div>

      <div className="doc-drop-zones">
        <div
          className={`doc-drop-zone ${fileDropTarget === 'assistencial' ? 'active' : ''}`}
          onDragOver={handleDragOver('assistencial')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('assistencial')}
        >
          <FileText size={14} />
          Solte aqui: Doc Suporte
        </div>
        <div
          className={`doc-drop-zone ${fileDropTarget === 'laudo_previo' ? 'active' : ''}`}
          onDragOver={handleDragOver('laudo_previo')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('laudo_previo')}
        >
          <History size={14} />
          Solte aqui: Laudo Prévio
        </div>
      </div>

      <div className="doc-list-container">
        {/* GRUPO 1: ASSISTENCIAIS */}
        <div
          className="doc-list-group"
          onDragOver={handleDragOver('assistencial')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('assistencial')}
        >
          <div
            className="doc-list-group-header"
            style={dragTarget === 'assistencial' || fileDropTarget === 'assistencial'
              ? { background: 'var(--status-info-bg)', color: 'var(--status-info-text)' }
              : {}}
          >
            Documentos de Suporte ({assistencialDocs.length})
          </div>

          {assistencialDocs.length === 0 ? (
            <div className="p-3 text-xs text-center text-muted italic border-b border-[var(--border-subtle)]">
              Nenhum documento.
            </div>
          ) : (
            assistencialDocs.map(renderDocRow)
          )}

          <label className="doc-list-add" title="Adicionar Assistencial">
            <UploadCloud size={14} /> Adicionar Doc Suporte
            <input
              type="file" multiple hidden accept="image/*,application/pdf"
              onChange={(e) => onUpload(e, 'assistencial')}
            />
          </label>
        </div>

        {/* GRUPO 2: LAUDOS PRÉVIOS */}
        <div
          className="doc-list-group"
          onDragOver={handleDragOver('laudo_previo')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('laudo_previo')}
        >
          <div
            className="doc-list-group-header"
            style={dragTarget === 'laudo_previo' || fileDropTarget === 'laudo_previo'
              ? { background: 'var(--status-warning-bg)', color: 'var(--accent-primary)' }
              : {}}
          >
            Exames Anteriores ({laudoDocs.length})
          </div>

          {laudoDocs.length === 0 ? (
            <div className="p-3 text-xs text-center text-muted italic border-b border-[var(--border-subtle)]">
              Nenhum laudo.
            </div>
          ) : (
            laudoDocs.map(renderDocRow)
          )}

          <label className="doc-list-add" title="Adicionar Laudo Prévio">
            <UploadCloud size={14} /> Adicionar Exame Anterior
            <input
              type="file" multiple hidden accept="image/*,application/pdf"
              onChange={(e) => onUpload(e, 'laudo_previo')}
            />
          </label>
        </div>
      </div>

      {/* Botão de Upload Genérico com mais margem */}
      <div className="mt-4 pt-2 text-right border-t border-[var(--border-subtle)]">
        <label className="text-xs text-accent cursor-pointer hover:underline flex items-center justify-end gap-1 font-medium">
          <UploadCloud size={14} /> Upload Automático (IA decide)
          <input
            type="file" multiple hidden accept="image/*,application/pdf"
            onChange={(e) => onUpload(e, undefined)}
          />
        </label>
      </div>
    </div>
  );
};

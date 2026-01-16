
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
  const [dragTarget, setDragTarget] = useState<'assistencial' | 'laudo_previo' | null>(null);

  // Tipos que vão para "Exames Anteriores" (Laudos e documentos adaptativos)
  const laudoTypes = ['laudo_previo', 'pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao'];

  const assistencialDocs = useMemo(
    () => docs.filter(doc => !laudoTypes.includes(doc.classification)),
    [docs]
  );

  const laudoDocs = useMemo(
    () => docs.filter(doc => laudoTypes.includes(doc.classification)),
    [docs]
  );

  const handleDragStart = (docId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', docId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (target: DocClassification) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const docId = event.dataTransfer.getData('text/plain');
    if (docId) onReclassifyDoc(docId, target);
    setDragTarget(null);
  };

  const handleDragOver = (target: 'assistencial' | 'laudo_previo') => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    if (dragTarget !== target) setDragTarget(target);
  };

  const handleDragLeave = () => setDragTarget(null);

  const renderDocRow = (doc: AttachmentDoc) => {
    const isError = doc.status === 'error';
    const isPdf = doc.file?.type === 'application/pdf' || doc.source.toLowerCase().endsWith('.pdf');

    return (
      <div
        key={doc.id}
        className={`doc-row-item ${isError ? 'error' : ''} ${doc.status === 'processing' ? 'processing' : ''}`}
        draggable={!isError}
        onDragStart={handleDragStart(doc.id)}
        onClick={() => !isError && openGallery(docs, doc.id)}
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
              <ClassificationChip classification={doc.classification} size="xs" isRecoveredBySystem={doc.isRecoveredBySystem} />
            )}
          </div>
        </div>

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
        <span className="text-muted text-xs">Arraste arquivos para adicionar</span>
      </div>

      {/* Layout em duas colunas para os grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GRUPO 1: DOC SUPORTE */}
        <div
          className={`doc-group-card ${dragTarget === 'assistencial' ? 'drag-active' : ''}`}
          onDragOver={handleDragOver('assistencial')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('assistencial')}
        >
          <div className="doc-group-header doc-group-header-blue">
            <FileText size={16} />
            <span>Doc Suporte</span>
            <span className="doc-group-count">{assistencialDocs.length}</span>
          </div>

          <div className="doc-group-content">
            {assistencialDocs.length === 0 ? (
              <div className="doc-group-empty">
                Nenhum documento
              </div>
            ) : (
              assistencialDocs.map(renderDocRow)
            )}
          </div>

          <label className="doc-group-add doc-group-add-blue">
            <Plus size={16} />
            <span>Adicionar</span>
            <input
              type="file" multiple hidden accept="image/*,application/pdf"
              onChange={(e) => onUpload(e, 'assistencial')}
            />
          </label>
        </div>

        {/* GRUPO 2: LAUDOS PRÉVIOS */}
        <div
          className={`doc-group-card ${dragTarget === 'laudo_previo' ? 'drag-active-amber' : ''}`}
          onDragOver={handleDragOver('laudo_previo')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('laudo_previo')}
        >
          <div className="doc-group-header doc-group-header-amber">
            <History size={16} />
            <span>Exames Anteriores</span>
            <span className="doc-group-count">{laudoDocs.length}</span>
          </div>

          <div className="doc-group-content">
            {laudoDocs.length === 0 ? (
              <div className="doc-group-empty">
                Nenhum laudo
              </div>
            ) : (
              laudoDocs.map(renderDocRow)
            )}
          </div>

          <label className="doc-group-add doc-group-add-amber">
            <Plus size={16} />
            <span>Adicionar Laudo</span>
            <input
              type="file" multiple hidden accept="image/*,application/pdf"
              onChange={(e) => onUpload(e, undefined)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

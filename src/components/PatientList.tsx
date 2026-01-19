
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Plus, AlertTriangle, ScanLine, UploadCloud, Loader2, Zap, Table, LayoutGrid, List, Archive, Lock, Unlock } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { PatientCard } from './PatientCard';
import { PatientTableRow } from './PatientTableRow';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { Modal } from './ui/Modal';
import { BatchUploadModal } from './BatchUploadModal';
import { Patient } from '../types/patient';
import { isFirebaseEnabled } from '../core/firebase';
import { extractHeaderInfo, extractBatchTable, detectIfTableImage } from '../adapters/gemini-prompts';
import { parseCSV, parseExcel, PatientBatchItem } from '../utils/batch-parsers';
import { usePasteHandler } from '../hooks/usePasteHandler';
import { useToast } from './ui/Toast';

import '../styles/patient-list.css';

interface Props {
  onSelectPatient: (patient: Patient) => void;
  onQuickStart: () => void;
}

export const PatientList: React.FC<Props> = ({ onSelectPatient, onQuickStart }) => {
  const { patients, loading, error, filter, setFilter, refresh, createPatient, createPatientsBatch, archivePatient, purgePatient } = usePatients();
  const { showToast, ToastComponent } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewLocked, setViewLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('radon:worklist:view-locked');
    return stored ? stored === 'true' : true;
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    const storedLock = window.localStorage.getItem('radon:worklist:view-locked');
    const storedMode = window.localStorage.getItem('radon:worklist:view-mode');
    const isLocked = storedLock ? storedLock === 'true' : true;
    if (isLocked && (storedMode === 'cards' || storedMode === 'table')) {
      return storedMode;
    }
    return 'cards';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showArchiveSelectedConfirm, setShowArchiveSelectedConfirm] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newOS, setNewOS] = useState('');
  const [newExamType, setNewExamType] = useState('');

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingOCR, setIsReadingOCR] = useState(false);

  // Batch Upload State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<PatientBatchItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverOCR, setIsDragOverOCR] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('radon:worklist:view-locked', String(viewLocked));
    if (!viewLocked) {
      window.localStorage.removeItem('radon:worklist:view-mode');
      return;
    }
    window.localStorage.setItem('radon:worklist:view-mode', viewMode);
  }, [viewLocked, viewMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newOS) return;
    
    setIsSubmitting(true);
    try {
      const patient = await createPatient(newName, newOS, newExamType);
      setIsCreateModalOpen(false);
      resetForm();
      
      // AUTO-OPEN
      onSelectPatient(patient); 
    } catch (err) {
      alert("Erro ao criar paciente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName(''); 
    setNewOS(''); 
    setNewExamType('');
    setIsReadingOCR(false);
  };

  const processHeaderImage = useCallback(async (file: File) => {
    setIsReadingOCR(true);
    try {
      const data = await extractHeaderInfo(file);

      // Preenche o formulário automaticamente
      if (data.paciente?.valor) setNewName(data.paciente.valor);
      if (data.os?.valor) setNewOS(data.os.valor);
      if (data.tipo_exame?.valor) setNewExamType(data.tipo_exame.valor);

      showToast('Dados extraídos com sucesso!', 'success');
    } catch (err) {
      console.error("Erro OCR:", err);
      showToast("Não foi possível ler os dados da imagem. Tente preencher manualmente.", 'error');
    } finally {
      setIsReadingOCR(false);
    }
  }, [showToast]);

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await processHeaderImage(file);
    e.target.value = '';
  };

  // Processa arquivo para batch (reutilizável para input, paste e drag & drop)
  const processFileForBatch = useCallback(async (file: File) => {
    setIsProcessingBatch(true);
    try {
      let items: PatientBatchItem[] = [];

      // Detectar tipo de arquivo (extensão ou MIME)
      const fileName = file.name || '';
      const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
      const mimeType = (file.type || '').toLowerCase();

      const isCsv = extension === 'csv' || mimeType === 'text/csv';
      const isExcel = ['xls', 'xlsx'].includes(extension || '') ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '');
      const isPdf = mimeType === 'application/pdf' || extension === 'pdf';

      let emptyMessage = 'Nenhum exame foi detectado no arquivo.';

      if (isCsv) {
        items = await parseCSV(file);
      } else if (isExcel) {
        items = await parseExcel(file);
      } else if (isImage || isPdf) {
        // Imagem ou PDF - tentar extração mesmo se a detecção falhar
        const isTable = await detectIfTableImage(file);
        items = await extractBatchTable(file);
        if (!isTable) {
          emptyMessage = 'Não foi detectada uma tabela com múltiplos exames neste arquivo.';
        }
      } else {
        showToast('Formato não suportado. Use CSV, Excel, ou imagem/PDF com tabela.', 'warning');
        return;
      }

      if (items.length === 0) {
        showToast(emptyMessage, 'warning');
        return;
      }

      // Mostrar modal de preview
      setBatchItems(items);
      setIsBatchModalOpen(true);
    } catch (error) {
      console.error('Erro ao processar batch:', error);
      showToast('Erro ao processar arquivo. Verifique o formato e tente novamente.', 'error');
    } finally {
      setIsProcessingBatch(false);
    }
  }, [showToast]);

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await processFileForBatch(file);
    e.target.value = '';
  };

  const handleBatchConfirm = async (validItems: PatientBatchItem[]) => {
    try {
      const createdIds = await createPatientsBatch(validItems);
      refresh();
      showToast(`${createdIds.length} exame(s) criado(s) com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      throw error;
    }
  };

  // Paste handler (Ctrl+V / Cmd+V)
  const handlePaste = useCallback((files: File[]) => {
    if (files.length > 0 && !isProcessingBatch) {
      processFileForBatch(files[0]); // Processa primeiro arquivo
    }
  }, [processFileForBatch, isProcessingBatch]);

  usePasteHandler({ onFilePaste: handlePaste, enabled: !isCreateModalOpen });

  // Paste handler for individual patient modal (OCR)
  const handlePasteOCR = useCallback((files: File[]) => {
    if (files.length > 0 && !isReadingOCR && isCreateModalOpen) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processHeaderImage(file);
      }
    }
  }, [processHeaderImage, isReadingOCR, isCreateModalOpen]);

  usePasteHandler({ onFilePaste: handlePasteOCR, enabled: isCreateModalOpen });

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && !isProcessingBatch) {
      await processFileForBatch(files[0]);
    }
  }, [processFileForBatch, isProcessingBatch]);

  // Drag & Drop for OCR area in modal
  const handleDragOverOCR = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverOCR(true);
  }, []);

  const handleDragLeaveOCR = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverOCR(false);
  }, []);

  const handleDropOCR = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverOCR(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && !isReadingOCR) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await processHeaderImage(file);
      } else {
        showToast('Por favor, envie apenas imagens.', 'warning');
      }
    }
  }, [processHeaderImage, isReadingOCR, showToast]);

  const isArchivedView = filter === 'archived';
  const enableSelection = !isArchivedView;
  const visibleIds = useMemo(() => patients.map(patient => patient.id), [patients]);
  const hasSelection = enableSelection && selectedIds.size > 0;
  const allSelected = enableSelection && visibleIds.length > 0 && selectedIds.size === visibleIds.length;
  const isIndeterminate = enableSelection && selectedIds.size > 0 && selectedIds.size < visibleIds.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  useEffect(() => {
    if (!selectedIds.size) return;
    const visibleSet = new Set(visibleIds);
    setSelectedIds(prev => {
      const next = new Set(Array.from(prev).filter(id => visibleSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds, selectedIds.size]);

  useEffect(() => {
    if (isArchivedView) {
      setSelectedIds(new Set());
    }
  }, [isArchivedView]);

  const handleToggleSelect = useCallback((id: string) => {
    if (!enableSelection) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [enableSelection]);

  const handleSelectAll = useCallback(() => {
    if (!enableSelection) return;
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      return new Set(visibleIds);
    });
  }, [allSelected, enableSelection, visibleIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleArchiveSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const results = await Promise.allSettled(ids.map(id => archivePatient(id)));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        showToast(`${successCount} exame(s) arquivado(s) com sucesso.`, 'success');
      }
      if (failedCount > 0) {
        showToast(`${failedCount} exame(s) não puderam ser arquivados.`, 'warning');
      }

      setSelectedIds(new Set());
    } catch (error) {
      console.error('Erro ao arquivar seleção:', error);
      showToast('Erro ao arquivar seleção. Tente novamente.', 'error');
    }
  }, [archivePatient, selectedIds, showToast]);

  const handlePurgePatient = useCallback(async (id: string) => {
    try {
      await purgePatient(id);
      showToast('Exame removido definitivamente.', 'success');
    } catch (error) {
      console.error('Erro ao excluir definitivamente:', error);
      showToast('Não foi possível remover o exame.', 'error');
      throw error;
    }
  }, [purgePatient, showToast]);

  const firebaseActive = isFirebaseEnabled();

  return (
    <div
      className="patient-list-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!firebaseActive && (
        <div className="mb-4 p-4 border border-yellow-500 bg-yellow-900/20 text-yellow-200 rounded flex items-center gap-2">
          <AlertTriangle size={20} />
          <div>
            <strong>Modo Offline (Memória Temporária)</strong>
            <p className="text-sm opacity-80">
              O Firebase não está configurado. Os pacientes criados serão perdidos ao recarregar a página (F5).
            </p>
          </div>
        </div>
      )}

      <div className="pl-header">
        <div>
          <h1 className="pl-title">Lista de <span>Trabalho</span></h1>
          <p className="pl-subtitle">Gerencie os exames e laudos em andamento.</p>
        </div>
        <div className="pl-header-actions">
          <div className="pl-view-toggle" role="tablist" aria-label="Visualização da lista">
            <button
              type="button"
              className={`pl-view-button ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid size={16} />
              Cards
            </button>
            <button
              type="button"
              className={`pl-view-button ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
            >
              <List size={16} />
              Tabela
            </button>
            <span className="pl-view-divider" aria-hidden="true" />
            <button
              type="button"
              className={`pl-view-lock ${viewLocked ? 'active' : ''}`}
              onClick={() => setViewLocked((prev) => !prev)}
              aria-pressed={viewLocked}
              title={viewLocked ? 'Visualização fixada' : 'Fixar visualização'}
            >
              {viewLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </div>

          <div className="pl-primary-actions">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Button
                variant="secondary"
                disabled={isProcessingBatch}
                isLoading={isProcessingBatch}
                onClick={() => document.getElementById('batch-upload-input')?.click()}
              >
                {!isProcessingBatch && <Table size={16} />}
                Upload em Lote
              </Button>
              <input
                id="batch-upload-input"
                type="file"
                style={{ display: 'none' }}
                accept=".csv,.xls,.xlsx,image/*,application/pdf"
                onChange={handleBatchUpload}
                disabled={isProcessingBatch}
              />
            </div>

            <Button variant="secondary" onClick={onQuickStart} title="Laudo sem cadastro">
              <Zap size={16} /> Laudo Rápido
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> Novo Paciente
            </Button>
          </div>
        </div>
      </div>

      <div className="pl-filters">
        <button
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button
          className={`filter-chip ${filter === 'waiting' ? 'active' : ''}`}
          onClick={() => setFilter('waiting')}
        >
          Aguardando
        </button>
        <button
          className={`filter-chip ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          Em Andamento
        </button>
        <button
          className={`filter-chip ${filter === 'ready' ? 'active' : ''}`}
          onClick={() => setFilter('ready')}
        >
          Pronto p/ Laudo
        </button>
        <button
          className={`filter-chip ${filter === 'done' ? 'active' : ''}`}
          onClick={() => setFilter('done')}
        >
          Finalizados
        </button>
        <button
          className={`filter-chip ${filter === 'archived' ? 'active' : ''}`}
          onClick={() => setFilter('archived')}
        >
          Arquivados
        </button>
      </div>

      {hasSelection && !isArchivedView && (
        <div className="pl-bulk-bar">
          <div className="pl-bulk-info">
            <span className="pl-bulk-count">{selectedIds.size}</span>
            selecionado(s)
          </div>
          <div className="pl-bulk-actions">
            {!allSelected && (
              <Button size="sm" variant="secondary" onClick={handleSelectAll}>
                Selecionar todos
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleClearSelection}>
              Limpar seleção
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowArchiveSelectedConfirm(true)}
              className="pl-archive-button"
            >
              <Archive size={14} />
              Arquivar selecionados
            </Button>
          </div>
        </div>
      )}

      {loading && patients.length === 0 ? (
        <div className="text-center py-10 text-muted">Carregando pacientes...</div>
      ) : error ? (
        <div className="text-center py-10 text-error">{error}</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          {isArchivedView ? 'Nenhum exame arquivado ainda.' : 'Nenhum paciente encontrado neste filtro.'}
          {!isArchivedView && (
            <>
              <br />
              Clique em "Novo Paciente" ou "Laudo Rápido" para começar.
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="pl-grid">
          {patients.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              onOpen={onSelectPatient}
              onArchive={archivePatient}
              onPurge={isArchivedView ? handlePurgePatient : undefined}
              onFinalize={() => refresh()}
              isSelected={enableSelection ? selectedIds.has(p.id) : false}
              onToggleSelect={enableSelection ? () => handleToggleSelect(p.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="pl-table">
          <div className="pl-table-header">
            <div className="pl-table-row pl-table-row-head">
              <div className="pl-table-cell pl-table-select">
                {enableSelection ? (
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="pl-checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                ) : (
                  <span className="pl-table-select-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="pl-table-cell">Paciente</div>
              <div className="pl-table-cell">Exame</div>
              <div className="pl-table-cell">Status</div>
              <div className="pl-table-cell">Docs / Áudio</div>
              <div className="pl-table-cell">{isArchivedView ? 'Arquivado em' : 'Data'}</div>
              <div className="pl-table-cell pl-table-actions-title">Ações</div>
            </div>
          </div>
          <div className="pl-table-body">
            {patients.map(p => (
              <PatientTableRow
                key={p.id}
                patient={p}
                onOpen={onSelectPatient}
                onArchive={archivePatient}
                onPurge={isArchivedView ? handlePurgePatient : undefined}
                onFinalize={() => refresh()}
                isSelected={enableSelection ? selectedIds.has(p.id) : false}
                onToggleSelect={enableSelection ? () => handleToggleSelect(p.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }} 
        title="Novo Paciente"
      >
        <div className="p-1">
          {/* ÁREA DE UPLOAD OCR */}
          <label
            className={`modal-ocr-upload ${isReadingOCR ? 'modal-ocr-loading' : ''} ${isDragOverOCR ? 'modal-ocr-drag-over' : ''}`}
            onDragOver={handleDragOverOCR}
            onDragLeave={handleDragLeaveOCR}
            onDrop={handleDropOCR}
          >
            {isReadingOCR ? (
              <>
                <Loader2 size={32} className="text-accent icon-spin" />
                <span className="modal-ocr-text text-accent">Lendo dados com IA...</span>
              </>
            ) : isDragOverOCR ? (
              <>
                <UploadCloud size={32} className="text-accent animate-bounce" />
                <span className="modal-ocr-text text-accent">Solte a imagem aqui</span>
              </>
            ) : (
              <>
                <ScanLine size={32} className="text-accent" />
                <span className="modal-ocr-text">Escanear Etiqueta / Cabeçalho</span>
                <span className="modal-ocr-subtext">Clique, arraste ou cole (Ctrl+V) uma imagem</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleHeaderUpload}
              disabled={isReadingOCR}
            />
          </label>

          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nome do Paciente *</label>
              <input 
                className="form-input" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">OS / Pedido / Atendimento *</label>
              <input 
                className="form-input" 
                value={newOS} 
                onChange={e => setNewOS(e.target.value)}
                placeholder="Ex: 123456"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Exame (Opcional)</label>
              <input 
                className="form-input" 
                value={newExamType} 
                onChange={e => setNewExamType(e.target.value)}
                placeholder="Ex: TC Crânio, RX Tórax"
              />
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={!newName || !newOS || isReadingOCR}>
                Criar Ficha
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Batch Upload Modal */}
      <BatchUploadModal
        isOpen={isBatchModalOpen}
        items={batchItems}
        onClose={() => setIsBatchModalOpen(false)}
        onConfirm={handleBatchConfirm}
      />

      <ConfirmModal
        isOpen={showArchiveSelectedConfirm}
        title="Arquivar Selecionados"
        message={`Deseja arquivar ${selectedIds.size} exame(s)? Eles sairão da lista ativa, mas continuarão salvos.`}
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          setShowArchiveSelectedConfirm(false);
          handleArchiveSelected();
        }}
        onCancel={() => setShowArchiveSelectedConfirm(false)}
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm animate-fade-in"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center">
            <UploadCloud size={64} className="mx-auto text-amber-500 mb-4 animate-bounce" />
            <p className="text-2xl font-bold text-white mb-2">Solte o arquivo aqui</p>
            <p className="text-zinc-400">CSV, Excel, ou imagem/PDF com tabela</p>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {ToastComponent}
    </div>
  );
};

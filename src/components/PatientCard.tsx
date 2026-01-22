
import React, { useState } from 'react';
import { Calendar, FileText, Mic, Archive, ArrowRight, CheckCircle, Copy, Trash2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Patient } from '../types/patient';
import { Button } from './ui/Button';
import { StatusChip } from './StatusChip';
import { PatientService } from '../services/patient-service';
import { ConfirmModal } from './ui/ConfirmModal';

interface Props {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onArchive: (id: string) => Promise<void>;
  onPurge?: (id: string) => Promise<void>;
  onFinalize?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onCopyOS?: (os: string) => void;
  openButtonVariant?: 'info' | 'infoAlt';
}

export const PatientCard: React.FC<Props> = ({
  patient,
  onOpen,
  onArchive,
  onPurge,
  onFinalize,
  isSelected = false,
  onToggleSelect,
  onCopyOS,
  openButtonVariant
}) => {
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isFinalizingPatient, setIsFinalizingPatient] = useState(false);
  const hasOS = Boolean(patient.os && patient.os.trim().length > 0);

  const handleCardClick = () => {
    if (!onToggleSelect) {
      onOpen(patient);
    }
  };

  const handleCardDoubleClick = () => {
    onOpen(patient);
  };

  const handleFinalizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFinalizeConfirm(true);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveConfirm(true);
  };

  const handlePurgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPurgeConfirm(true);
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizingPatient(true);
    try {
      const hasContent = (patient.docsCount || 0) > 0 || (patient.audioCount || 0) > 0;

      await PatientService.updatePatient(patient.id, {
        status: 'done',
        finalized: true,
        finalizedAt: Date.now(),
        hasAttachments: hasContent,
      });

      if (onFinalize) {
        onFinalize(patient.id);
      }

      setShowFinalizeConfirm(false);
    } catch (error) {
      console.error('Erro ao finalizar:', error);
    } finally {
      setIsFinalizingPatient(false);
    }
  };

  const handleConfirmArchive = async () => {
    try {
      await onArchive(patient.id);
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error('Erro ao arquivar:', error);
    }
  };

  const handleConfirmPurge = async () => {
    if (!onPurge) return;
    try {
      await onPurge(patient.id);
      setShowPurgeConfirm(false);
    } catch (error) {
      console.error('Erro ao excluir definitivamente:', error);
    }
  };

  const canFinalize = patient.status !== 'done' && patient.status !== 'processing';
  const isArchived = Boolean(patient.deletedAt);
  const canPurge = isArchived && Boolean(onPurge);

  return (
    <Card
      className={`patient-card ${isSelected ? 'is-selected' : ''}`}
      isInteractive
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
    >
      <div>
        <div className="pc-header">
          <div className="pc-info">
            <div className="pc-title">
              {onToggleSelect && (
                <label className="pc-select" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="pl-checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    aria-label={`Selecionar ${patient.name}`}
                  />
                </label>
              )}
              <h3 className="pc-name">{patient.name}</h3>
            </div>
            <div className="pc-os-row">
              <span className="pc-os">{patient.os || 'Sem OS'}</span>
              {onCopyOS && hasOS && (
                <button
                  type="button"
                  className="pc-copy-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopyOS(patient.os);
                  }}
                  title="Copiar OS"
                  aria-label={`Copiar OS de ${patient.name}`}
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
          </div>
          <StatusChip status={patient.status} />
        </div>

        <div className="pc-meta">
          <Calendar size={12} />
          <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>{patient.examType || 'Exame Geral'}</span>
        </div>
      </div>

      <div className="pc-footer">
        <div className="pc-stats">
          <span className="pc-stat-item" title="Documentos">
            <FileText size={14} /> {patient.docsCount}
          </span>
          <span className="pc-stat-item" title="Áudios">
            <Mic size={14} /> {patient.audioCount}
          </span>
        </div>

        <div
          className="pc-actions"
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          {!isArchived && (
            <button
              className="btn-icon-only"
              onClick={handleArchiveClick}
              title="Arquivar Paciente"
              aria-label={`Arquivar ${patient.name}`}
            >
              <Archive size={16} />
            </button>
          )}

          {canFinalize && !isArchived && (
            <Button
              size="sm"
              variant="success"
              onClick={handleFinalizeClick}
              title="Finalizar Exame"
            >
              <CheckCircle size={14} />
              Finalizar
            </Button>
          )}

          {canPurge && (
            <button
              className="btn-icon-only text-error"
              onClick={handlePurgeClick}
              title="Excluir definitivamente"
              aria-label={`Excluir definitivamente ${patient.name}`}
            >
              <Trash2 size={16} />
            </button>
          )}

          <Button size="sm" variant={openButtonVariant ?? 'info'} onClick={() => onOpen(patient)}>
            Abrir <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Confirm Finalize Modal */}
      <ConfirmModal
        isOpen={showFinalizeConfirm}
        title="Finalizar Exame"
        message={`Deseja finalizar o exame de ${patient.name}? Ele será marcado como concluído.`}
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={handleConfirmFinalize}
        onCancel={() => setShowFinalizeConfirm(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showArchiveConfirm}
        title="Arquivar Paciente"
        message={`Deseja arquivar "${patient.name}"? O exame sai da lista ativa, mas continua salvo.`}
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={handleConfirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showPurgeConfirm}
        title="Excluir Definitivamente"
        message={`Essa ação é irreversível e remove todos os arquivos de "${patient.name}" do sistema. Deseja continuar?`}
        confirmLabel="Excluir definitivamente"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmPurge}
        onCancel={() => setShowPurgeConfirm(false)}
      />
    </Card>
  );
};

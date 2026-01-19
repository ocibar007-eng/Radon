import React, { useState } from 'react';
import { Archive, ArrowRight, Calendar, CheckCircle, FileText, Mic, Trash2 } from 'lucide-react';
import { Patient } from '../types/patient';
import { StatusChip } from './StatusChip';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { PatientService } from '../services/patient-service';

interface Props {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onArchive: (id: string) => Promise<void>;
  onPurge?: (id: string) => Promise<void>;
  onFinalize?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const formatDisplayDate = (patient: Patient) => (
  new Date(patient.deletedAt ?? patient.createdAt).toLocaleDateString()
);

export const PatientTableRow: React.FC<Props> = ({
  patient,
  onOpen,
  onArchive,
  onPurge,
  onFinalize,
  isSelected = false,
  onToggleSelect
}) => {
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isFinalizingPatient, setIsFinalizingPatient] = useState(false);

  const canFinalize = patient.status !== 'done' && patient.status !== 'processing';
  const isArchived = Boolean(patient.deletedAt);
  const canPurge = isArchived && Boolean(onPurge);

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

  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onToggleSelect) {
      onOpen(patient);
      return;
    }

    if (event.detail > 1) return;
    onToggleSelect();
  };

  const handleRowDoubleClick = () => {
    onOpen(patient);
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

  return (
    <>
      <div
        className={`pl-table-row ${isSelected ? 'is-selected' : ''}`}
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
      >
        <div className="pl-table-cell pl-table-select" onClick={e => e.stopPropagation()}>
          {onToggleSelect ? (
            <input
              type="checkbox"
              className="pl-checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              aria-label={`Selecionar ${patient.name}`}
            />
          ) : (
            <span className="pl-table-select-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="pl-table-cell pl-table-patient">
          <div className="pl-table-name">{patient.name}</div>
          <div className="pl-table-os">{patient.os || 'Sem OS'}</div>
        </div>

        <div className="pl-table-cell pl-table-exam">
          <div className="pl-table-exam-type">{patient.examType || 'Exame Geral'}</div>
          {patient.examDate && patient.examDate.trim().length > 0 && (
            <div className="pl-table-exam-date">Exame: {patient.examDate}</div>
          )}
        </div>

        <div className="pl-table-cell pl-table-status">
          <StatusChip status={patient.status} />
        </div>

        <div className="pl-table-cell pl-table-counts">
          <span className="pl-table-count">
            <FileText size={14} /> {patient.docsCount}
          </span>
          <span className="pl-table-count">
            <Mic size={14} /> {patient.audioCount}
          </span>
        </div>

        <div className="pl-table-cell pl-table-date">
          <Calendar size={12} />
          <span>{formatDisplayDate(patient)}</span>
        </div>

        <div
          className="pl-table-cell pl-table-actions"
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
              variant="secondary"
              onClick={handleFinalizeClick}
              isLoading={isFinalizingPatient}
              title="Finalizar Exame"
            >
              <CheckCircle size={14} />
              Finalizar
            </Button>
          )}

          {canPurge && (
            <Button
              size="sm"
              variant="danger"
              onClick={handlePurgeClick}
              title="Excluir definitivamente"
            >
              <Trash2 size={14} />
              Excluir
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={() => onOpen(patient)}>
            Abrir <ArrowRight size={14} />
          </Button>
        </div>
      </div>

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
    </>
  );
};

export default PatientTableRow;

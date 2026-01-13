
import React, { useState } from 'react';
import { Calendar, FileText, Mic, Trash2, ArrowRight, CheckCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Patient } from '../types/patient';
import { Button } from './ui/Button';
import { StatusChip } from './StatusChip';
import { PatientService } from '../services/patient-service';
import { ConfirmModal } from './ui/ConfirmModal';

interface Props {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onDelete: (id: string) => void;
  onFinalize?: (id: string) => void;
}

export const PatientCard: React.FC<Props> = ({ patient, onOpen, onDelete, onFinalize }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFinalizingPatient, setIsFinalizingPatient] = useState(false);

  const handleFinalizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validação
    const hasContent = (patient.docsCount || 0) > 0 || (patient.audioCount || 0) > 0;
    if (!hasContent) {
      // Note: Removed toast - validation feedback now handled by modal state
      return;
    }

    setShowConfirm(true);
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

      setShowConfirm(false);
      // Note: Removed toast - success feedback now via status chip update
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      // Note: Removed toast - error handling via console for now
    } finally {
      setIsFinalizingPatient(false);
    }
  };

  const canFinalize = patient.status !== 'done' && patient.status !== 'processing';

  return (
    <Card className="patient-card" isInteractive onClick={() => onOpen(patient)}>
      <div>
        <div className="pc-header">
          <div className="pc-info">
            <h3 className="pc-name">{patient.name}</h3>
            <span className="pc-os">{patient.os || 'Sem OS'}</span>
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

        <div className="pc-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon-only"
            onClick={() => onDelete(patient.id)}
            title="Excluir Paciente"
          >
            <Trash2 size={16} />
          </button>

          {canFinalize && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleFinalizeClick}
              title="Finalizar Exame"
            >
              <CheckCircle size={14} />
              Finalizar
            </Button>
          )}

          <Button size="sm" variant="secondary" onClick={() => onOpen(patient)}>
            Abrir <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Finalizar Exame"
        message={`Deseja finalizar o exame de ${patient.name}? Ele será marcado como concluído.`}
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmFinalize}
        onCancel={() => setShowConfirm(false)}
      />
    </Card>
  );
};

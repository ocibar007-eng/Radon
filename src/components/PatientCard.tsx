
import React from 'react';
import { Calendar, FileText, Mic, Trash2, ArrowRight, CheckCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Patient } from '../types/patient';
import { Button } from './ui/Button';
import { StatusChip } from './StatusChip';
import { PatientService } from '../services/patient-service';

interface Props {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onDelete: (id: string) => void;
  onFinalize?: (id: string) => void;
}

export const PatientCard: React.FC<Props> = ({ patient, onOpen, onDelete, onFinalize }) => {
  const handleFinalize = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validação
    const hasContent = (patient.docsCount || 0) > 0 || (patient.audioCount || 0) > 0;
    if (!hasContent) {
      alert('⚠️ Adicione pelo menos um anexo (documento ou áudio) antes de finalizar.');
      return;
    }

    // Confirmação
    const confirmed = window.confirm(
      `Deseja finalizar o exame de ${patient.name}? Ele será marcado como concluído.`
    );
    if (!confirmed) return;

    try {
      // Atualizar patient
      await PatientService.updatePatient(patient.id, {
        status: 'done',
        finalized: true,
        finalizedAt: Date.now(),
        hasAttachments: hasContent,
      });

      // Callback opcional para refresh
      if (onFinalize) {
        onFinalize(patient.id);
      }

      alert('✅ Exame finalizado com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('❌ Erro ao finalizar exame. Tente novamente.');
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
              onClick={handleFinalize}
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
    </Card>
  );
};

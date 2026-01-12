
import React from 'react';
import { Calendar, FileText, Mic, Trash2, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Patient } from '../types/patient';
import { Button } from './ui/Button';

interface Props {
  patient: Patient;
  onOpen: (patient: Patient) => void;
  onDelete: (id: string) => void;
}

export const PatientCard: React.FC<Props> = ({ patient, onOpen, onDelete }) => {
  const statusLabels = {
    waiting: 'Aguardando',
    processing: 'Processando',
    ready: 'Pronto p/ Laudo',
    done: 'Finalizado'
  };

  return (
    <Card className="patient-card" isInteractive onClick={() => onOpen(patient)}>
      <div>
        <div className="pc-header">
          <div className="pc-info">
            <h3 className="pc-name">{patient.name}</h3>
            <span className="pc-os">{patient.os || 'Sem OS'}</span>
          </div>
          <span className={`pc-status-badge status-${patient.status}`}>
            {statusLabels[patient.status]}
          </span>
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
          
          <Button size="sm" variant="secondary" onClick={() => onOpen(patient)}>
            Abrir <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

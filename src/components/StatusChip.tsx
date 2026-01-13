
import React from 'react';
import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PatientStatus } from '../types/patient';

interface Props {
  status: PatientStatus;
  animated?: boolean;
}

export const StatusChip: React.FC<Props> = ({ status, animated = true }) => {
  const configs: Record<PatientStatus, {
    icon: React.ElementType;
    label: string;
    color: string;
    animate: boolean;
  }> = {
    waiting: {
      icon: Clock,
      label: 'Aguardando',
      color: 'amber',
      animate: animated, // Pulsante
    },
    processing: {
      icon: Loader2,
      label: 'Processando',
      color: 'purple',
      animate: true, // Spinner girando
    },
    in_progress: {
      icon: AlertCircle,
      label: 'Em Andamento',
      color: 'blue',
      animate: false,
    },
    ready: {
      icon: CheckCircle,
      label: 'Pronto',
      color: 'cyan',
      animate: false,
    },
    done: {
      icon: CheckCircle,
      label: 'Finalizado',
      color: 'green',
      animate: false,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`status-chip status-${config.color} ${config.animate ? 'animate-pulse-glow' : ''}`}>
      <Icon
        size={12}
        className={config.animate && status === 'processing' ? 'animate-spin' : ''}
      />
      {config.label}
    </span>
  );
};

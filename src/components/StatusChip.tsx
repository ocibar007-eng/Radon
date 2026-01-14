
import React from 'react';
import { Clock, Loader2, CheckCircle, AlertCircle, FileSearch } from 'lucide-react';
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
      icon: FileSearch,
      label: 'Pré-Laudo',
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap
      ${status === 'waiting' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
      ${status === 'processing' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : ''}
      ${status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
      ${status === 'ready' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : ''}
      ${status === 'done' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
    `}>
      <Icon
        size={10}
        className={config.animate && status === 'processing' ? 'animate-spin' : ''}
      />
      {config.label}
    </span>
  );
};

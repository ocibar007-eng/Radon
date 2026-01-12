
import React from 'react';
import { Bot, FileText, History, HelpCircle } from 'lucide-react';
import { DocClassification } from '../types';

interface Props {
  classification?: DocClassification;
  size?: 'sm' | 'xs';
  isRecoveredBySystem?: boolean;
}

export const ClassificationChip: React.FC<Props> = ({ classification, size = 'xs', isRecoveredBySystem = false }) => {
  if (!classification) return null;

  const config = {
    assistencial: {
      label: 'Assistencial',
      icon: FileText,
      className: 'chip-assistencial'
    },
    laudo_previo: {
      label: 'Laudo Prévio',
      icon: History,
      className: 'chip-laudo'
    },
    indeterminado: {
      label: 'Indet.',
      icon: HelpCircle,
      className: 'chip-indeterminado'
    }
  }[classification];

  const Icon = config.icon;

  return (
    <div className={`classification-chip ${config.className} size-${size}`}>
      <Icon size={size === 'xs' ? 10 : 12} />
      <span>{config.label}</span>
      {isRecoveredBySystem && (
        <span className="chip-auto">
          <Bot size={size === 'xs' ? 10 : 12} />
          <span>Auto</span>
        </span>
      )}
    </div>
  );
};

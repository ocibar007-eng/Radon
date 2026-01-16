
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
    pedido_medico: {
      label: 'Pedido Médico',
      icon: FileText,
      className: 'chip-laudo' // Reusing laudo style for now to keep it in amber theme
    },
    guia_autorizacao: {
      label: 'Guia',
      icon: FileText,
      className: 'chip-laudo'
    },
    termo_consentimento: {
      label: 'Termo',
      icon: FileText,
      className: 'chip-laudo'
    },
    questionario: {
      label: 'Questionário',
      icon: FileText,
      className: 'chip-laudo'
    },
    administrativo: {
      label: 'Admin',
      icon: FileText,
      className: 'chip-assistencial'
    },
    pagina_vazia: {
      label: 'Vazio',
      icon: HelpCircle, // Using generic icon
      className: 'chip-indeterminado'
    },
    outro: {
      label: 'Outro',
      icon: HelpCircle,
      className: 'chip-indeterminado'
    },
    indeterminado: {
      label: 'Indet.',
      icon: HelpCircle,
      className: 'chip-indeterminado'
    }
  }[classification] || { // Fallback to prevent crash if new type is added but not mapped
    label: classification,
    icon: HelpCircle,
    className: 'chip-indeterminado'
  };

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

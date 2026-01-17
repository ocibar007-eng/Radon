import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, FileText, History, HelpCircle, ChevronDown, Check, ClipboardList, Shield, FileQuestion } from 'lucide-react';
import { DocClassification } from '../types';

interface Props {
  classification?: DocClassification;
  size?: 'sm' | 'xs';
  isRecoveredBySystem?: boolean;
  onChange?: (newType: DocClassification) => void;
}

// Apenas as opções essenciais para o usuário
const ESSENTIAL_OPTIONS: { key: DocClassification; label: string; icon: any; color: string }[] = [
  { key: 'laudo_previo', label: 'Laudo Prévio', icon: History, color: 'text-amber-400' },
  { key: 'pedido_medico', label: 'Pedido Médico', icon: FileText, color: 'text-blue-400' },
  { key: 'guia_autorizacao', label: 'Guia/Autorização', icon: Shield, color: 'text-emerald-400' },
  { key: 'termo_consentimento', label: 'Termo', icon: FileText, color: 'text-purple-400' },
  { key: 'questionario', label: 'Questionário', icon: ClipboardList, color: 'text-cyan-400' },
  { key: 'assistencial', label: 'Anotação Clínica', icon: FileQuestion, color: 'text-pink-400' },
];

export const ClassificationChip: React.FC<Props> = ({ classification, size = 'xs', isRecoveredBySystem = false, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Posição do dropdown
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calcular posição quando abre
  useEffect(() => {
    if (isOpen && chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      const dropdownHeight = 300;
      const dropdownWidth = 200;

      // Decide se abre pra cima ou pra baixo
      const spaceBelow = window.innerHeight - rect.bottom;
      const openBelow = spaceBelow > dropdownHeight;

      // Calcula left garantindo que não saia da tela
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      if (left < 10) left = 10;

      setDropdownStyle({
        position: 'fixed',
        top: openBelow ? rect.bottom + 4 : 'auto',
        bottom: openBelow ? 'auto' : window.innerHeight - rect.top + 4,
        left,
        width: dropdownWidth,
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  // Fechar ao clicar fora - usa mousedown para capturar antes do click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Ignora se clicou no chip ou no dropdown
      if (chipRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;

      setIsOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    // Usa setTimeout para evitar que o mesmo clique que abriu também feche
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscape);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!classification) return null;

  const currentOption = ESSENTIAL_OPTIONS.find(o => o.key === classification);
  const displayLabel = currentOption?.label || classification;
  const DisplayIcon = currentOption?.icon || HelpCircle;
  const displayColor = currentOption?.color || 'text-zinc-400';
  const isInteractive = !!onChange;

  const handleSelect = (type: DocClassification) => {
    if (onChange) {
      onChange(type);
      setJustChanged(true);
      setTimeout(() => setJustChanged(false), 1500);
    }
    setIsOpen(false);
  };

  const handleChipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInteractive) return;

    setIsOpen(prev => !prev);
  };

  // Dropdown renderizado via Portal
  const dropdown = isOpen && isInteractive ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-[#1A1D21] border border-white/10 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden py-1"
    >
      <div className="px-3 py-2 text-[10px] uppercase text-zinc-500 font-bold tracking-wider border-b border-white/5 mb-1">
        Reclassificar como
      </div>
      <div className="max-h-60 overflow-y-auto">
        {ESSENTIAL_OPTIONS.map((opt) => {
          const isSelected = opt.key === classification;
          return (
            <button
              key={opt.key}
              className={`
                w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-all
                ${isSelected
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                }
              `}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(opt.key);
              }}
            >
              <opt.icon size={14} className={isSelected ? 'text-amber-400' : opt.color} />
              <span className="flex-1">{opt.label}</span>
              {isSelected && <Check size={12} className="text-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Chip Principal */}
      <div
        ref={chipRef}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
          border transition-all duration-200 select-none
          ${justChanged
            ? 'bg-green-500/20 border-green-500/50 text-green-300 scale-105'
            : `bg-zinc-800/80 border-white/10 ${displayColor}`
          }
          ${isInteractive ? 'cursor-pointer hover:bg-zinc-700/80 hover:border-white/20 active:scale-95' : ''}
        `}
        onClick={handleChipClick}
        role={isInteractive ? "button" : undefined}
      >
        {justChanged ? (
          <Check size={size === 'xs' ? 10 : 12} className="text-green-400" />
        ) : (
          <DisplayIcon size={size === 'xs' ? 10 : 12} />
        )}
        <span className="truncate max-w-[100px]">{justChanged ? 'Alterado!' : displayLabel}</span>

        {isRecoveredBySystem && !isOpen && !justChanged && (
          <Bot size={size === 'xs' ? 8 : 10} className="opacity-50" />
        )}

        {isInteractive && !justChanged && (
          <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`} />
        )}
      </div>

      {/* Dropdown via Portal */}
      {dropdown}
    </>
  );
};

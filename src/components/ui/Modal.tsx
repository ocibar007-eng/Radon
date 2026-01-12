import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isDarkMode?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isDarkMode = true
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={`
          relative w-full mx-4 p-6 rounded-2xl shadow-2xl
          animate-fade-in-scale
          ${sizeClasses[size]}
          ${isDarkMode
            ? 'bg-zinc-900 border border-zinc-800'
            : 'bg-white border border-zinc-200'
          }
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className={`
                p-1.5 rounded-lg transition-colors hover-scale
                ${isDarkMode
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }
              `}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        {children}
      </div>
    </div>
  );
};

export default Modal;

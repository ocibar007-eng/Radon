import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog Content */}
      <div
        className="relative w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl bg-zinc-900 border border-zinc-800 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          {variant === 'danger' ? (
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white mb-1">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

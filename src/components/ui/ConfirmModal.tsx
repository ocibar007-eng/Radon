import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    // Handle ESC key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onCancel]);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content"
                style={{ maxWidth: '400px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        {variant === 'danger' && (
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <AlertTriangle size={20} className="text-red-400" />
                            </div>
                        )}
                        <h3 className="modal-title">{title}</h3>
                    </div>
                    <button className="modal-close-btn" onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="text-secondary text-sm leading-relaxed mb-6">{message}</p>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={onCancel}>
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={variant === 'danger' ? 'danger' : 'primary'}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

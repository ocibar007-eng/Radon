import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-green-900/90 border-green-700 text-green-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-[300]
        flex items-center gap-3
        px-4 py-3 rounded-xl
        border backdrop-blur-sm
        shadow-2xl
        animate-slide-in-right
        max-w-md
        ${styles[type]}
      `}
      onClick={onClose}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

// Hook simples para gerenciar toasts
export const useToast = () => {
  const [toast, setToast] = React.useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  ) : null;

  return { showToast, ToastComponent };
};

import { useEffect } from 'react';

/**
 * Hook para capturar Ctrl+V / Cmd+V e processar arquivos colados
 */
export const usePasteHandler = ({
  onFilePaste,
  enabled = true,
}: {
  onFilePaste: (files: File[]) => void;
  enabled?: boolean;
}) => {
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Imagem colada
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
        // Arquivo colado
        else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        onFilePaste(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFilePaste, enabled]);
};

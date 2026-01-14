import { useEffect } from 'react';
import { BatchFile } from '@/types';

interface UseKeyboardShortcutsOptions {
  onPasteFromClipboard: () => void;
  onStartProcessing: () => void;
  onExportJson: () => void;
  onSelectAll: (select: boolean) => void;
  onToggleSelection: (fileId: string) => void;
  onToggleShortcutsHint: () => void;
  files: BatchFile[];
  isProcessing: boolean;
  isConverting: boolean;
  viewerIndex: number | null;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    onPasteFromClipboard,
    onStartProcessing,
    onExportJson,
    onSelectAll,
    onToggleSelection,
    onToggleShortcutsHint,
    files,
    isProcessing,
    isConverting,
    viewerIndex
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if viewer is open (it has its own handlers)
      if (viewerIndex !== null) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + V - Paste from clipboard
      if (modKey && e.key === 'v') {
        e.preventDefault();
        onPasteFromClipboard();
        return;
      }

      // Ctrl/Cmd + Enter - Start processing
      if (modKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isProcessing && !isConverting) {
          onStartProcessing();
        }
        return;
      }

      // Ctrl/Cmd + S - Export JSON
      if (modKey && e.key === 's') {
        e.preventDefault();
        onExportJson();
        return;
      }

      // Ctrl/Cmd + A - Select all
      if (modKey && e.key === 'a') {
        e.preventDefault();
        onSelectAll(true);
        return;
      }

      // Escape - Deselect all
      if (e.key === 'Escape') {
        onSelectAll(false);
        return;
      }

      // Arrow keys - Navigate files
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (files.length > 0) {
          const selectedIndex = files.findIndex(f => f.isSelected);
          let newIndex = selectedIndex;

          if (e.key === 'ArrowDown') {
            newIndex = selectedIndex < files.length - 1 ? selectedIndex + 1 : 0;
          } else {
            newIndex = selectedIndex > 0 ? selectedIndex - 1 : files.length - 1;
          }

          onSelectAll(false);
          onToggleSelection(files[newIndex].id);
        }
        return;
      }

      // ? - Show shortcuts hint
      if (e.key === '?') {
        onToggleShortcutsHint();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewerIndex,
    files,
    isProcessing,
    isConverting,
    onPasteFromClipboard,
    onStartProcessing,
    onExportJson,
    onSelectAll,
    onToggleSelection,
    onToggleShortcutsHint
  ]);
};

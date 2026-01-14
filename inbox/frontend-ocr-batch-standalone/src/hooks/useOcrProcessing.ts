import { useRef, useCallback, useState } from 'react';
import { BatchFile, FileType, ProcessStatus, OcrResult } from '@/types';
import { runGeminiOcr } from '@/adapters/ocr/gemini';

interface UseOcrProcessingOptions {
  onSessionStatusChange: (sessionId: string, status: 'idle' | 'processing' | 'completed') => void;
  onSessionProgressUpdate: (sessionId: string, current: number, total: number) => void;
  onFileStatusChange: (fileId: string, status: ProcessStatus, sessionId: string) => void;
  onFileCompleted: (fileId: string, ocrResult: OcrResult, sessionId: string) => void;
  onFileError: (fileId: string, errorMessage: string, sessionId: string) => void;
  onError: (message: string) => void;
  onComplete: (sessionId: string) => void;
}

interface UseOcrProcessingReturn {
  startProcessing: (files: BatchFile[], sessionId: string) => Promise<void>;
  abortProcessing: (sessionId: string) => void;
  isProcessing: (sessionId: string) => boolean;
}

const CONCURRENCY_LIMIT = 8;

export const useOcrProcessing = (options: UseOcrProcessingOptions): UseOcrProcessingReturn => {
  const {
    onSessionStatusChange,
    onSessionProgressUpdate,
    onFileStatusChange,
    onFileCompleted,
    onFileError,
    onError,
    onComplete
  } = options;

  const abortControllersRef = useRef<Map<string, boolean>>(new Map());
  const activeSessionsRef = useRef<Set<string>>(new Set());

  const abortProcessing = useCallback((sessionId: string) => {
    abortControllersRef.current.set(sessionId, true);
    activeSessionsRef.current.delete(sessionId);
    onSessionStatusChange(sessionId, 'idle');
  }, [onSessionStatusChange]);

  const isProcessing = useCallback((sessionId: string) => {
    return activeSessionsRef.current.has(sessionId);
  }, []);

  const startProcessing = useCallback(async (files: BatchFile[], sessionId: string) => {
    // Filter only selected and ready/error files
    const pendingFiles = files.filter(f =>
      f.isSelected && (f.status === ProcessStatus.READY || f.status === ProcessStatus.ERROR)
    );

    if (pendingFiles.length === 0) {
      onError('Selecione arquivos para processar');
      return;
    }

    // Initialize abort controller and mark session as active
    abortControllersRef.current.set(sessionId, false);
    activeSessionsRef.current.add(sessionId);

    // Update session status
    onSessionStatusChange(sessionId, 'processing');
    onSessionProgressUpdate(sessionId, 0, pendingFiles.length);

    let index = 0;
    let completedCount = 0;

    const processItem = async (fileToProcess: BatchFile) => {
      const isAborted = abortControllersRef.current.get(sessionId);
      if (isAborted) return;

      // Mark file as processing
      onFileStatusChange(fileToProcess.id, ProcessStatus.PROCESSING, sessionId);

      try {
        // Use converted file if available (DICOM → PNG), otherwise original
        const inputPayload = fileToProcess.convertedFile || fileToProcess.originalFile;
        const ocrResult = await runGeminiOcr(inputPayload);

        const isAbortedNow = abortControllersRef.current.get(sessionId);
        if (!isAbortedNow) {
          onFileCompleted(fileToProcess.id, ocrResult, sessionId);
        }
      } catch (error: any) {
        const isAbortedNow = abortControllersRef.current.get(sessionId);
        if (!isAbortedNow) {
          onFileError(fileToProcess.id, error.message, sessionId);
          onError(`Erro OCR: ${fileToProcess.name}`);
        }
      } finally {
        completedCount++;
        onSessionProgressUpdate(sessionId, completedCount, pendingFiles.length);
      }
    };

    const next = async () => {
      const isAborted = abortControllersRef.current.get(sessionId);
      if (index >= pendingFiles.length || isAborted) return;

      const file = pendingFiles[index++];
      await processItem(file);

      const isAbortedNow = abortControllersRef.current.get(sessionId);
      if (index < pendingFiles.length && !isAbortedNow) {
        await next();
      }
    };

    // Spawn concurrent workers
    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, pendingFiles.length); i++) {
      workers.push(next());
    }

    await Promise.all(workers);

    // Cleanup and mark as completed (if not aborted)
    const wasAborted = abortControllersRef.current.get(sessionId);
    if (!wasAborted) {
      onSessionStatusChange(sessionId, 'completed');
      onComplete(sessionId);
    }

    activeSessionsRef.current.delete(sessionId);
    abortControllersRef.current.delete(sessionId);
  }, [
    onSessionStatusChange,
    onSessionProgressUpdate,
    onFileStatusChange,
    onFileCompleted,
    onFileError,
    onError,
    onComplete
  ]);

  return {
    startProcessing,
    abortProcessing,
    isProcessing
  };
};

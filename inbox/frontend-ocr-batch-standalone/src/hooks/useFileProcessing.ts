import { useRef, useCallback, useState } from 'react';
import { BatchFile, FileType, ProcessStatus, SortMethod } from '@/types';
import { createBatchFile } from '@/utils/fileHelpers';
import { extractMetadata } from '@/core/metadata';
import { processDicom } from '@/core/dicom';
import { sortFiles, enumerateFiles } from '@/core/sorting';

interface UseFileProcessingOptions {
  onFilesAdded: (files: BatchFile[], sessionId: string) => void;
  onFileUpdated: (fileId: string, updates: Partial<BatchFile>, sessionId: string) => void;
  onError: (message: string) => void;
  sortMethod: SortMethod;
}

interface UseFileProcessingReturn {
  processFiles: (rawFiles: File[], sessionId: string) => Promise<void>;
  isProcessing: boolean;
  abort: () => void;
}

const IMPORT_CONCURRENCY = 3;

export const useFileProcessing = (options: UseFileProcessingOptions): UseFileProcessingReturn => {
  const { onFilesAdded, onFileUpdated, onError, sortMethod } = options;

  const [processingCount, setProcessingCount] = useState(0);
  const abortControllerRef = useRef<boolean>(false);

  const abort = useCallback(() => {
    abortControllerRef.current = true;
  }, []);

  const processFiles = useCallback(async (rawFiles: File[], sessionId: string) => {
    setProcessingCount(prev => prev + 1);
    abortControllerRef.current = false;

    // 1. Convert raw files to BatchFile objects
    const batchCandidates = await Promise.all(rawFiles.map(createBatchFile));
    const initialBatch = batchCandidates.filter((file): file is BatchFile => file !== null);
    const skippedCount = rawFiles.length - initialBatch.length;
    if (skippedCount > 0) {
      onError(`${skippedCount} arquivo(s) ignorado(s) por formato desconhecido.`);
    }

    if (initialBatch.length === 0) {
      setProcessingCount(prev => prev - 1);
      return;
    }

    // 2. Add files to session immediately (UI feedback)
    onFilesAdded(initialBatch, sessionId);

    // 3. Process files concurrently (DICOM conversion + metadata extraction)
    let index = 0;

    const processNext = async () => {
      if (index >= initialBatch.length || abortControllerRef.current) return;
      const file = initialBatch[index++];

      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 20));

      try {
        let result: Partial<BatchFile>;

        if (file.type === FileType.DICOM) {
          result = await processDicom(file.originalFile);
        } else {
          result = await extractMetadata(file.originalFile, file.type);
        }

        if (!abortControllerRef.current) {
          onFileUpdated(file.id, {
            ...result,
            status: result.status || ProcessStatus.READY
          }, sessionId);
        }
      } catch (e) {
        if (!abortControllerRef.current) {
          onFileUpdated(file.id, {
            status: ProcessStatus.ERROR,
            errorMessage: 'Falha na conversão.'
          }, sessionId);
          onError(`Erro ao processar: ${file.name}`);
        }
      }

      if (!abortControllerRef.current) {
        await processNext();
      }
    };

    // Spawn concurrent workers
    const workers = Array(Math.min(IMPORT_CONCURRENCY, initialBatch.length))
      .fill(null)
      .map(() => processNext());

    await Promise.all(workers);
    setProcessingCount(prev => prev - 1);
  }, [onFilesAdded, onFileUpdated, onError, sortMethod]);

  return {
    processFiles,
    isProcessing: processingCount > 0,
    abort
  };
};

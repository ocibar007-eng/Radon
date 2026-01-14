import { BatchFile, SortMethod, ProcessStatus } from '@/types';

export interface BatchManifest {
  schema_version: string;
  generated_at: string;
  sort_mode: string;
  items: BatchManifestItem[];
  full_combined_text: string;
}

export interface BatchManifestItem {
  seq: number;
  original_filename: string;
  normalized_filename: string;
  captured_at: number | null;
  sort_reason: string;
  status: string;
  result: any | null; // The strict OCR extraction result
  error: string | null;
}

/**
 * Generates the strict JSON manifest for the batch.
 * This is the bridge format for "ProjetoLaudos".
 */
export const generateBatchJson = (files: BatchFile[], sortMethod: SortMethod): BatchManifest => {
  // Only include files that were successfully processed
  const processedFiles = files.filter(f => f.status === ProcessStatus.COMPLETED && f.ocrResult);

  const items: BatchManifestItem[] = processedFiles.map((file) => ({
    seq: file.orderIndex || 0,
    original_filename: file.name,
    normalized_filename: file.normalizedName || '',
    captured_at: file.timestamp || null,
    sort_reason: file.timestampSource || 'none',
    status: file.status,
    result: file.ocrResult || null,
    error: file.errorMessage || null,
  }));

  const combinedText = processedFiles
    .map(f => {
      const header = `[${String(f.orderIndex).padStart(3, '0')}] ${f.normalizedName} (Orig: ${f.name})`;
      const body = f.ocrResult?.full_text || '[NO TEXT]';
      return `${header}\n${'-'.repeat(40)}\n${body}`;
    })
    .join('\n\n');

  return {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    sort_mode: sortMethod,
    items: items,
    full_combined_text: combinedText
  };
};

/**
 * Generates a human-readable text file combining all OCR results in order.
 */
export const generateCombinedTxt = (files: BatchFile[]): string => {
  // Only include files that were successfully processed
  const processedFiles = files.filter(f => f.status === ProcessStatus.COMPLETED && f.ocrResult);

  return processedFiles.map((f) => {
    const header = `=== PAGE ${f.orderIndex} | ${f.normalizedName} ===`;
    const meta = `Original: ${f.name} | Date: ${f.timestamp ? new Date(f.timestamp).toISOString() : 'N/A'}`;
    const separator = "----------------------------------------";
    const content = f.ocrResult?.full_text || '';

    return `${header}\n${meta}\n${separator}\n${content}\n`;
  }).join('\n\n');
};

/**
 * Triggers a browser download for the given content.
 */
export const triggerDownload = (filename: string, content: string | Blob, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
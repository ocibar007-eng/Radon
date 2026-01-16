
import { BatchFile, SortMethod, FileType } from '../types';

/**
 * Assigns orderIndex (1..N) and normalizedName (001.ext) to files.
 * This should be called whenever the list order changes.
 */
export const enumerateFiles = (files: BatchFile[]): BatchFile[] => {
  return files.map((file, index) => {
    // Determine target extension.
    // Images keep their extension.
    // DICOMs (.dcm) are converted to .png, so we name them .png.
    const originalExt = file.name.split('.').pop() || '';
    const targetExt = file.type === FileType.DICOM ? 'png' : originalExt;
    
    const seqNumber = index + 1;
    const seqString = seqNumber.toString().padStart(3, '0');
    
    return {
      ...file,
      orderIndex: seqNumber,
      normalizedName: `${seqString}.${targetExt}`
    };
  });
};

/**
 * Sorts the file list based on the selected method.
 * Returns a NEW array.
 */
export const sortFiles = (files: BatchFile[], method: SortMethod): BatchFile[] => {
  // Manual sort implies we trust the current array order (drag & drop result)
  if (method === SortMethod.MANUAL) return [...files];

  const sorted = [...files].sort((a, b) => {
    
    // --- SPECIAL HANDLING FOR DICOM (PACS LOGIC) ---
    // If both files are DICOM, we prioritize internal structure (Series -> Instance)
    // regardless of whether the user clicked "Timestamp" or "Filename".
    // This provides the "Medical Order" which is almost always what is desired.
    if (a.type === FileType.DICOM && b.type === FileType.DICOM) {
        // 1. Series Number (Group by series)
        const sA = a.seriesNumber || 0;
        const sB = b.seriesNumber || 0;
        if (sA !== sB) return sA - sB;

        // 2. Instance Number (Order within series)
        const iA = a.instanceNumber || 0;
        const iB = b.instanceNumber || 0;
        if (iA !== iB) return iA - iB;

        // 3. Fallback to Timestamp if Instances are identical (rare)
        if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
            return a.timestamp - b.timestamp;
        }
    }

    if (method === SortMethod.TIMESTAMP) {
      // 1. Timestamp
      const tA = a.timestamp;
      const tB = b.timestamp;
      
      // Handle undefined timestamps (put them last)
      if (tA !== undefined && tB === undefined) return -1;
      if (tA === undefined && tB !== undefined) return 1;
      
      if (tA !== undefined && tB !== undefined && tA !== tB) {
          return tA - tB; // Oldest first
      }

      // 4. Final Fallback: Filename
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    }
    
    if (method === SortMethod.FILENAME) {
       return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    
    return 0;
  });

  return sorted;
};

/**
 * Helper to process a new batch of files:
 * 1. Merge new files
 * 2. Sort combined list
 * 3. Enumerate
 */
export const processFileUpdate = (
    currentFiles: BatchFile[], 
    newFiles: BatchFile[], 
    method: SortMethod
): BatchFile[] => {
    // If manual, we just append new files at the end
    if (method === SortMethod.MANUAL) {
        return enumerateFiles([...currentFiles, ...newFiles]);
    }
    // Otherwise, resort the whole list
    const combined = [...currentFiles, ...newFiles];
    const sorted = sortFiles(combined, method);
    return enumerateFiles(sorted);
};

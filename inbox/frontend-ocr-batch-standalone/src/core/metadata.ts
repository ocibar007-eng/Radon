import exifr from 'exifr';
import { FileType, BatchFile } from '@/types';

export const extractMetadata = async (file: File, type: FileType): Promise<Partial<BatchFile>> => {
  let timestamp = file.lastModified;
  let source: BatchFile['timestampSource'] = 'modified';

  // 1. Try EXIF for Images (JPEG/PNG/TIFF)
  if (type === FileType.IMAGE) {
    try {
      // Parse only specific tags to save memory/time
      const output = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      if (output && (output.DateTimeOriginal || output.CreateDate)) {
        const date = output.DateTimeOriginal || output.CreateDate;
        if (date instanceof Date && !isNaN(date.getTime())) {
          timestamp = date.getTime();
          source = 'exif';
        }
      }
    } catch (e) {
      // EXIF parsing failed or no EXIF data, fall through to next methods
      // console.debug('No EXIF data for', file.name);
    }
  }

  // 2. Try Filename Regex if we haven't found a better source yet (or for DICOMs lacking internal parsing for now)
  // Matches patterns like: 20230101, 2023-01-01, 2023.01.01
  // Prioritizes filename over 'modified' because file system dates are unreliable after copy/paste.
  if (source === 'modified') {
    const name = file.name;
    // Regex looks for YYYY-MM-DD or YYYYMMDD. 
    // Captures year (20xx), month (01-12), day (01-31).
    // It's a heuristic, not perfect.
    const dateMatch = name.match(/(20\d{2})[-_.]?([0-1]\d)[-_.]?([0-3]\d)/);
    
    if (dateMatch) {
       const [_, y, m, d] = dateMatch;
       // Construct date at noon to avoid timezone rollover issues
       const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
       if (!isNaN(date.getTime())) {
         timestamp = date.getTime();
         source = 'filename';
       }
    }
  }

  // 3. DICOM Specific (Stub for Stage 3)
  // In the next stage, we will use dcmjs/daikon here to read StudyDate/ContentDate.
  if (type === FileType.DICOM && source === 'modified') {
      // For now, if filename didn't work, we stick with modified.
      // But we explicitly mark it so the UI knows it's a fallback.
      source = 'modified'; 
  }

  return {
    timestamp,
    timestampSource: source
  };
};
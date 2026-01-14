
export enum FileType {
  DICOM = 'DICOM',
  IMAGE = 'IMAGE',
}

export enum ProcessStatus {
  IDLE = 'idle',
  CONVERTING = 'converting', // DICOM -> PNG/JPG
  READY = 'ready', // Ready for OCR
  PROCESSING = 'processing', // Sending to Gemini
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum SortMethod {
  FILENAME = 'filename',
  TIMESTAMP = 'timestamp',
  MANUAL = 'manual',
}

export enum OcrMode {
  DIRECT = 'direct',
  BRIDGE = 'bridge',
}

export interface BridgeConfig {
  baseUrl: string;
  endpoint: string;
  apiKey: string;
}

export interface OcrResult {
  full_text: string;
  extraction: {
    patient_name: string;
    patient_id: string;
    exam_date: string;
    measurements: string[];
    institution: string;
  };
  readability: 'READABLE' | 'PARTIAL' | 'UNREADABLE';
}

export interface TechnicalMetadata {
  transferSyntax?: string;
  transferSyntaxUID?: string;
  bitsAllocated?: number;
  photometricInterpretation?: string;
  isCompressed?: boolean;
  pixelRepresentation?: number;
  rows?: number;
  columns?: number;
}

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
}

export interface BatchFile {
  id: string;
  originalFile: File;
  name: string;
  type: FileType;
  size: number;
  techInfo?: TechnicalMetadata;
  metadata?: DicomMetadata;
  previewUrl?: string;
  convertedFile?: File;
  timestamp?: number;
  timestampSource?: 'exif' | 'dicom' | 'filename' | 'modified' | 'none';
  instanceNumber?: number;
  seriesNumber?: number;
  orderIndex?: number;
  normalizedName?: string;
  status: ProcessStatus;
  errorMessage?: string;
  ocrResult?: OcrResult;
  isSelected: boolean;
}

export interface BatchSession {
  id: string;
  name: string;
  createdAt: number;
  files: BatchFile[];
  progress: { current: number; total: number };
  status: 'idle' | 'processing' | 'completed';
}

export interface HistoryItem {
  id: string;
  createdAt: number;
  batchName: string;
  patientId: string;
  examDate: string;
  itemCount: number;
  jsonResult: any;
}

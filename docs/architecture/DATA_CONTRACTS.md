# Data Contracts

## Patient Registration
```typescript
interface PatientRegistrationDetails {
  os: string;
  patientName: string;
  examType: string;
  examDate: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string; // Snippet found in image
}
```

## Documents
```typescript
type DocClassification = 'assistencial' | 'laudo_previo' | 'indeterminado';

interface AttachmentDoc {
  id: string;
  file: File;
  previewUrl: string; // Blob URL
  status: 'pending' | 'processing' | 'done' | 'error';
  classification?: DocClassification;
  verbatimText?: string;
  metadata?: {
    reportDate?: string;
    reportType?: string;
    doctorName?: string;
  };
  summary?: string; // Short preview
}
```

## Session
```typescript
interface AppSession {
  patient: PatientRegistrationDetails | null;
  docs: AttachmentDoc[];
  audioJobs: AudioJob[];
  isProcessing: boolean;
}
```

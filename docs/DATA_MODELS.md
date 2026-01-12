
# Modelos de Dados (Types)

A aplicação gira em torno de duas estruturas de dados principais: `Patient` (Metadados) e `AppSession` (Dados de Trabalho).

## 1. Patient (`src/types/patient.ts`)
Representa o registro no banco de dados (Firestore). É leve para permitir listagem rápida.

```typescript
interface Patient {
  id: string;
  name: string;
  os: string; // Ordem de Serviço
  status: 'waiting' | 'processing' | 'ready' | 'done';
  
  // Metadados
  createdAt: number;
  updatedAt: number;
  deletedAt?: number; // Se preenchido, está na lixeira
  
  // Estatísticas
  docsCount: number;
  audioCount: number;
  hasClinicalSummary: boolean;
  
  // Opcional: Payload de trabalho (Carregado apenas ao abrir o workspace)
  workspace?: Partial<AppSession>;
}
```

## 2. AppSession (`src/types/index.ts`)
Representa o estado da memória enquanto o médico está trabalhando.

```typescript
interface AppSession {
  // Dados do Cabeçalho (OCR)
  patient: PatientRegistrationDetails | null;
  headerImage: AttachmentDoc | null;
  
  // Lista Plana de Documentos (Páginas)
  docs: AttachmentDoc[];
  
  // Lista de Trabalhos de Áudio
  audioJobs: AudioJob[];
  
  // Resumo Gerado
  clinicalMarkdown: string;
}
```

## 3. AttachmentDoc (`src/types/index.ts`)
A unidade atômica de documento (uma página de PDF ou uma imagem).

```typescript
interface AttachmentDoc {
  id: string;
  source: string; // Nome do arquivo ou origem
  previewUrl: string; // URL (Blob local ou Firebase Storage)
  
  // Estado do Processamento
  status: 'pending' | 'processing' | 'done' | 'error';
  classification: 'assistencial' | 'laudo_previo' | 'indeterminado';
  
  // Inteligência
  verbatimText?: string; // Texto OCR bruto
  reportGroupHint?: string; // Dica da IA para agrupamento (ex: "Protocolo 123")
  
  // Se for laudo prévio unificado
  detailedAnalysis?: ReportAnalysis; // Estrutura JSON com órgãos
}
```

## 4. ReportGroup (`src/utils/grouping.ts`)
Uma estrutura virtual (calculada em tempo de execução) que agrupa vários `AttachmentDoc` que pertencem ao mesmo exame físico.

```typescript
interface ReportGroup {
  id: string; // ID único do grupo
  title: string; // Título amigável (ex: "RM Crânio - 12/03/2024")
  docs: AttachmentDoc[]; // As páginas
  status: 'processing' | 'done';
}
```

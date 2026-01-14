# 🏗️ Arquitetura - OCR Batch Processor

Visão macro da arquitetura, fluxos principais e padrões de design.

---

## 📐 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│                   UI LAYER                          │
│  App.tsx, components/ (FileList, UploadArea, etc)  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 HOOKS LAYER                         │
│  useFileProcessing, useOcrProcessing,               │
│  useSessionManager, useKeyboardShortcuts            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 CORE LAYER                          │
│  dicom.ts, metadata.ts, export.ts, sorting.ts      │
│  (Lógica de negócio pura - sem React/side-effects) │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               ADAPTERS LAYER                        │
│  ocr/gemini.ts (interface com Gemini API)          │
│  (Hexagonal Architecture - portas externas)        │
└─────────────────────────────────────────────────────┘
```

### Responsabilidades de Cada Camada

**UI Layer** - Componentes React puros
- ✅ Renderização
- ✅ Event handlers (click, drag&drop)
- ✅ Estado local de UI (modals abertos, loading states)
- ❌ Não contém lógica de negócio

**Hooks Layer** - State management e orquestração
- ✅ Gerenciar estado React (useState, useEffect)
- ✅ Orquestrar chamadas ao Core e Adapters
- ✅ Callbacks para notificar UI
- ❌ Não contém lógica de negócio (delega ao Core)

**Core Layer** - Business logic pura
- ✅ Funções puras (input → output)
- ✅ Lógica de negócio (DICOM conversion, sorting, export)
- ✅ Testável sem React
- ❌ Sem React, sem side-effects

**Adapters Layer** - Interfaces externas
- ✅ Comunicação com APIs externas (Gemini)
- ✅ Transformação de dados (File → API format)
- ✅ Error handling específico de cada provider
- ❌ Não conhece a aplicação (apenas contratos)

---

## 🔄 Fluxo 1: Upload e Processamento DICOM

```
┌─────────┐       ┌──────────────────┐       ┌──────────────────┐
│  USER   │──────▶│  UploadArea.tsx  │──────▶│ App.tsx          │
│ Arrasta │       │ (onFilesSelected)│       │ handleFiles      │
│ Pasta   │       └──────────────────┘       │ Selected()       │
└─────────┘                                   └────────┬─────────┘
                                                       │
                                      ┌────────────────▼─────────────────┐
                                      │ useFileProcessing.processFiles() │
                                      └────────┬────────────┬────────────┘
                                               │            │
                              ┌────────────────▼───┐  ┌────▼──────────────┐
                              │ createBatchFile()  │  │ processDicom()    │
                              │ (utils/fileHelpers)│  │ (core/dicom.ts)   │
                              └────────────────────┘  └─────────┬─────────┘
                                                                │
                                                      ┌─────────▼──────────┐
                                                      │ dcmjs.parsePixel() │
                                                      │ canvas.toBlob()    │
                                                      │ → PNG Blob         │
                                                      └─────────┬──────────┘
                                                                │
                                      ┌─────────────────────────▼──────────┐
                                      │ onFileUpdated(fileId, {            │
                                      │   convertedFile: pngBlob,          │
                                      │   metadata: { patientName, ... },  │
                                      │   status: READY                    │
                                      │ })                                 │
                                      └────────────────────────────────────┘
```

**Passos:**
1. User arrasta pasta com DICOMs
2. `UploadArea` detecta drop → chama `onFilesSelected(File[])`
3. `App.tsx` → `useFileProcessing.processFiles(files, sessionId)`
4. Hook cria `BatchFile` objects (status=PROCESSING)
5. Para cada DICOM: `core/dicom.processDicom(file)`
   - dcmjs parseia pixel data
   - Canvas converte para PNG blob
   - Extrai metadata PACS (Patient Name, Modality, etc)
6. Hook notifica via callback `onFileUpdated(fileId, updates)`
7. App.tsx atualiza sessão com arquivo convertido

---

## 🔄 Fluxo 2: OCR Batch Processing

```
┌─────────┐       ┌──────────────────┐       ┌──────────────────┐
│  USER   │──────▶│  Botão "Iniciar" │──────▶│ App.tsx          │
│ Clica   │       │  Extração        │       │ handleStart()    │
└─────────┘       └──────────────────┘       └────────┬─────────┘
                                                       │
                                      ┌────────────────▼─────────────────┐
                                      │ useOcrProcessing.startProcessing │
                                      │ (files, sessionId)               │
                                      └────────┬────────────┬────────────┘
                                               │            │
                              ┌────────────────▼───┐  ┌────▼──────────────┐
                              │ Filter selected    │  │ Spawn 8 workers   │
                              │ files (isSelected) │  │ (concurrency pool)│
                              └────────────────────┘  └─────────┬─────────┘
                                                                │
                                                      ┌─────────▼──────────┐
                                                      │ runGeminiOcr(file) │
                                                      │ (adapters/ocr/)    │
                                                      └─────────┬──────────┘
                                                                │
                                      ┌─────────────────────────▼──────────┐
                                      │ Gemini API (generateContent)       │
                                      │ → { text, confidence, ... }        │
                                      └─────────┬──────────────────────────┘
                                                │
                                      ┌─────────▼──────────┐
                                      │ onFileCompleted(   │
                                      │   fileId,          │
                                      │   ocrResult,       │
                                      │   sessionId        │
                                      │ )                  │
                                      └────────────────────┘
```

**Passos:**
1. User clica "Iniciar Extração"
2. `App.tsx` → `useOcrProcessing.startProcessing(files, sessionId)`
3. Hook filtra apenas arquivos `isSelected=true` e `status=READY/ERROR`
4. Spawna 8 workers paralelos (pool de concorrência manual)
5. Cada worker:
   - Pega próximo arquivo da fila
   - Chama `adapters/ocr/gemini.runGeminiOcr(file)`
   - Adapter envia para Gemini API
   - Retorna `{ text, confidence, metadata }`
6. Hook notifica via `onFileCompleted(fileId, result, sessionId)`
7. App.tsx atualiza arquivo com `status=COMPLETED` e `ocrText`

**Nota:** Concorrência = 8 workers (I/O-bound). Rate limit Gemini: 15 RPM (free tier).

---

## 🔄 Fluxo 3: Gerenciamento de Sessões

```
┌─────────┐       ┌──────────────────┐       ┌──────────────────┐
│  USER   │──────▶│  Sidebar.tsx     │──────▶│ App.tsx          │
│ Cria    │       │  Nova Sessão     │       │ createSession()  │
│ Lote    │       └──────────────────┘       └────────┬─────────┘
└─────────┘                                            │
                                      ┌────────────────▼─────────────────┐
                                      │ useSessionManager.createSession  │
                                      │ (name?, initialFiles?)           │
                                      └────────┬────────────┬────────────┘
                                               │            │
                              ┌────────────────▼───┐  ┌────▼──────────────┐
                              │ crypto.randomUUID()│  │ setSessions(      │
                              │ → newId            │  │   [...prev, new]  │
                              └────────────────────┘  │ )                 │
                                                      └─────────┬─────────┘
                                                                │
                                      ┌─────────────────────────▼──────────┐
                                      │ localStorage.setItem(              │
                                      │   'ocr-batch-sessions',            │
                                      │   JSON.stringify(metadata)         │
                                      │ )                                  │
                                      └────────────────────────────────────┘
```

**Passos:**
1. User clica "Nova Sessão" na sidebar
2. `Sidebar.tsx` → `onCreateSession()`
3. `App.tsx` → `useSessionManager.createSession(name?)`
4. Hook:
   - Gera UUID para sessão
   - Cria objeto `BatchSession`
   - Adiciona ao array `sessions`
   - Persiste metadata no LocalStorage (SEM arquivos)
5. Hook atualiza `activeSessionId` para nova sessão
6. UI re-renderiza com nova sessão ativa

**Nota:** Arquivos (File objects) não são serializáveis → não vão no LocalStorage.

---

## 🎨 Padrões de Design

### 1. **Hexagonal Architecture (Adapters)**
```
Core Logic ←→ Port (interface) ←→ Adapter (Gemini/OpenAI/etc)
```
- Core não conhece Gemini
- Fácil trocar de provider (criar novo adapter)
- Testes mockam adapters

### 2. **Callback-Based Hooks**
```typescript
useFileProcessing({
  onFilesAdded: (files) => updateSession(),
  onFileUpdated: (id, updates) => updateFile(),
  onError: (msg) => showToast()
})
```
- Hook não "possui" estado
- Componente decide como reagir
- Flexível para diferentes UIs

### 3. **Worker Pool (Concorrência Manual)**
```typescript
const processNext = async () => {
  if (index >= files.length) return;
  const file = files[index++];
  await process(file);
  await processNext(); // recursão
};

// Spawn N workers
Array(CONCURRENCY).fill(null).map(() => processNext());
```
- Controle fino sobre abort
- Melhor para memória (vs Promise.all)
- Empiricamente testado: 3 workers (DICOM), 8 workers (OCR)

### 4. **Barrel Exports**
```typescript
// hooks/index.ts
export { useFileProcessing } from './useFileProcessing';
export { useOcrProcessing } from './useOcrProcessing';
// ...

// App.tsx
import { useFileProcessing, useOcrProcessing } from './hooks';
```
- Imports limpos
- API pública clara

### 5. **LocalStorage Persistence (Metadata Only)**
```typescript
// Salva apenas metadata
const toSave = sessions.map(s => ({
  id: s.id,
  name: s.name,
  createdAt: s.createdAt
  // files: [] ← NÃO SERIALIZA
}));
localStorage.setItem('sessions', JSON.stringify(toSave));
```
- Files não são serializáveis
- Trade-off: re-upload após refresh
- Alternativa futura: IndexedDB

---

## 🔐 Data Flow

### Estado Global (App.tsx)
```typescript
sessions: BatchSession[]        // Via useSessionManager
activeSessionId: string         // Via useSessionManager
sortMethod: SortMethod          // Local
viewerIndex: number | null      // Local
theme: ThemePalette             // Via useTheme
soundEnabled: boolean           // Local + LocalStorage
```

### Estado Derivado
```typescript
activeSession = sessions.find(s => s.id === activeSessionId)
files = activeSession?.files || []
isProcessing = activeSession?.status === 'processing'
```

### Props Drilling vs Context
- **Atualmente:** Props drilling (App.tsx é raiz)
- **Por que não Context?** Não há prop drilling profundo (2-3 níveis)
- **Futuro:** Se componentes crescerem, considerar Context para theme/sessions

---

## 🧪 Testabilidade

### Core Layer (Testável sem React)
```typescript
// tests/core/dicom.test.ts
import { processDicom } from '@/core/dicom';

test('converte DICOM válido para PNG', async () => {
  const mockDicomFile = new File([buffer], 'test.dcm');
  const result = await processDicom(mockDicomFile);

  expect(result.convertedFile).toBeInstanceOf(Blob);
  expect(result.metadata.patientName).toBeDefined();
});
```

### Hooks Layer (Testável com React Testing Library)
```typescript
// tests/hooks/useFileProcessing.test.ts
import { renderHook } from '@testing-library/react';
import { useFileProcessing } from '@/hooks';

test('notifica onFileUpdated após processar', async () => {
  const onFileUpdated = vi.fn();
  const { result } = renderHook(() => useFileProcessing({
    onFileUpdated,
    // ...
  }));

  await result.current.processFiles(mockFiles, 'session-1');

  expect(onFileUpdated).toHaveBeenCalled();
});
```

### Adapters Layer (Mockável)
```typescript
// tests/adapters/ocr/gemini.test.ts
vi.mock('@google/genai', () => ({
  GenerativeModel: vi.fn(() => ({
    generateContent: vi.fn().mockResolvedValue({
      text: () => 'Mock OCR text'
    })
  }))
}));
```

---

## 📊 Performance Considerations

### DICOM Processing (CPU-Bound)
- ✅ 3 workers concorrentes (empiricamente testado)
- ✅ Delay 20ms entre processamentos (evita UI freeze)
- ⚠️ Canvas → Blob é síncrono (blocking)

### OCR Processing (I/O-Bound)
- ✅ 8 workers concorrentes (network I/O)
- ⚠️ Rate limit Gemini: 15 RPM (free tier)
- 💡 Futura melhoria: exponential backoff em 429 errors

### React Re-renders
- ✅ useCallback em handlers
- ✅ Hooks isolam re-renders (não afetam App.tsx)
- ⚠️ `sessions` update re-renderiza tudo (futuro: React.memo)

---

**Última atualização:** Janeiro 2026

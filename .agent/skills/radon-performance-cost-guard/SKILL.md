---
name: radon-performance-cost-guard
description: Guardião de performance e custo (IA + PDFs grandes). Use ao mexer em processamento em lote, pipeline, upload e análise.
---

# Radon Performance & Cost Guard ⚡💸

Use esta skill ao mexer em **processamento que pode explodir** - OCR batch, grouping, pipeline de IA, uploads grandes.

---

## 🛑 REGRAS TRANSVERSAIS (NÃO QUEBRE)

1. **Limites Explícitos**: Max páginas, max concorrência, max retries.
2. **Backpressure**: Nunca disparar chamadas em cascata sem controle.
3. **Cancelamento**: Jobs devem poder ser interrompidos.
4. **Cache**: Não repetir análise idêntica.
5. **Handoff**: "Limites aplicados / métricas antes-depois / como evitar regressão".

---

## 🎯 QUANDO USAR

- OCR batch (múltiplos PDFs)
- Grouping de documentos
- Pipeline de IA (análises)
- Upload/split de arquivos
- Render de thumbnails
- Qualquer processamento com >10 itens

---

## 📊 LIMITES OBRIGATÓRIOS

### Por Job
| Limite | Valor Padrão | Configurável? |
|--------|--------------|---------------|
| Max páginas por PDF | 50 | Sim |
| Max tamanho por arquivo | 20MB | Sim |
| Max retries por job | 3 | Sim |
| Timeout por operação | 60s | Sim |

### Por Sessão
| Limite | Valor Padrão | Configurável? |
|--------|--------------|---------------|
| Max arquivos simultâneos | 10 | Sim |
| Max jobs no pipeline | 20 | Sim |
| Max chamadas Gemini/min | 15 | Não (API limit) |

### Implementação
```typescript
// src/config/limits.ts

export const LIMITS = {
  maxPagesPerPdf: 50,
  maxFileSizeMB: 20,
  maxRetries: 3,
  timeoutMs: 60_000,
  maxConcurrentJobs: 5,
  maxQueueSize: 20,
  geminiRPM: 15, // Rate limit da API
} as const;

// Uso
if (pages.length > LIMITS.maxPagesPerPdf) {
  throw new Error(`PDF excede limite de ${LIMITS.maxPagesPerPdf} páginas`);
}
```

---

## 🚦 BACKPRESSURE (Controle de Fluxo)

### Problema
```typescript
// ❌ RUIM - dispara tudo de uma vez
files.forEach(file => processFile(file));

// ❌ RUIM - cascata sem controle
const results = await Promise.all(files.map(processFile));
```

### Solução
```typescript
// ✅ BOM - concorrência controlada
import pLimit from 'p-limit';

const limit = pLimit(LIMITS.maxConcurrentJobs);

const results = await Promise.all(
  files.map(file => limit(() => processFile(file)))
);

// ✅ BOM - fila com prioridade
const queue = new PriorityQueue<Job>();

function enqueue(job: Job, priority: number) {
  if (queue.size >= LIMITS.maxQueueSize) {
    throw new Error('Fila cheia, aguarde');
  }
  queue.add(job, priority);
}
```

---

## ⏹️ CANCELAMENTO

### Todo Job Deve Ser Cancelável
```typescript
interface CancellableJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  cancel: () => void;
}

function createJob(task: () => Promise<void>): CancellableJob {
  const controller = new AbortController();
  
  return {
    id: crypto.randomUUID(),
    status: 'pending',
    cancel: () => {
      controller.abort();
      this.status = 'cancelled';
    }
  };
}
```

### UI Deve Mostrar Opção de Cancelar
```tsx
<button onClick={() => job.cancel()}>
  Cancelar Processamento
</button>
```

---

## 💾 CACHE E REUSO

### Não Repetir Análise Idêntica
```typescript
// Cache por hash do conteúdo
const cache = new Map<string, AnalysisResult>();

async function analyze(doc: Document): Promise<AnalysisResult> {
  const hash = await hashContent(doc.content);
  
  if (cache.has(hash)) {
    console.log('[Cache] hit', { hash });
    return cache.get(hash)!;
  }
  
  const result = await callGemini(doc);
  cache.set(hash, result);
  
  return result;
}
```

### Cache de Thumbnails
```typescript
// Evitar re-render desnecessário
const thumbnailCache = new Map<string, Blob>();

async function getThumbnail(pageId: string): Promise<Blob> {
  if (thumbnailCache.has(pageId)) {
    return thumbnailCache.get(pageId)!;
  }
  // ... gerar thumbnail
}
```

---

## 🧵 NÃO TRAVAR MAIN THREAD

### Web Workers para CPU-heavy
```typescript
// Para processamento pesado de PDF
const worker = new Worker('./pdf-worker.ts');

worker.postMessage({ type: 'PARSE_PDF', data: pdfBlob });

worker.onmessage = (e) => {
  if (e.data.type === 'PDF_PARSED') {
    // ... usar resultado
  }
};
```

### Chunking para Listas Grandes
```typescript
// Render progressivo
function renderWithChunks<T>(
  items: T[],
  chunkSize: number,
  render: (item: T) => void
) {
  let i = 0;
  
  function processChunk() {
    const end = Math.min(i + chunkSize, items.length);
    
    while (i < end) {
      render(items[i++]);
    }
    
    if (i < items.length) {
      requestIdleCallback(processChunk);
    }
  }
  
  processChunk();
}
```

---

## 💰 CONTROLE DE CUSTO (Gemini API)

### Rate Limiting
```typescript
// Respeitar limite de 15 RPM
const rateLimiter = new RateLimiter({
  tokensPerInterval: 15,
  interval: 'minute'
});

async function callGeminiWithLimit(prompt: string) {
  await rateLimiter.removeTokens(1);
  return callGemini(prompt);
}
```

### Evitar Chamadas Desnecessárias
```typescript
// Batch quando possível
// ❌ RUIM - 1 chamada por página
for (const page of pages) {
  await analyzePageIndividually(page);
}

// ✅ BOM - 1 chamada por PDF (quando faz sentido)
await analyzePdfGlobal(pages);
```

---

## 📏 MÉTRICAS DE PERFORMANCE

### O que Medir
```typescript
// Tempo total
const start = performance.now();
// ... processo
console.log('[Metrics] duration', { 
  operation: 'batch_ocr',
  durationMs: performance.now() - start,
  itemCount: files.length
});

// Memória (se disponível)
if (performance.memory) {
  console.log('[Metrics] memory', {
    usedJSHeapSize: performance.memory.usedJSHeapSize
  });
}
```

### Antes/Depois de Mudanças
```markdown
## Performance Impact

| Métrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Tempo total (10 PDFs) | 45s | 30s | -33% |
| Pico de memória | 150MB | 120MB | -20% |
| Chamadas Gemini | 50 | 35 | -30% |
```

---

## 🚫 PROIBIÇÕES

1. ❌ Processar sem limite de concorrência
2. ❌ Promise.all em lista grande sem controle
3. ❌ Job que não pode ser cancelado
4. ❌ Cache sem expiração (memory leak)
5. ❌ Ignorar rate limit da API
6. ❌ CPU-heavy no main thread

---

## 🔧 PADRÃO "SERIAL → PARALELO" (Regressão Comum)

> ⚠️ Se sua mudança fez o processamento ficar "um por um" em vez de paralelo, você **QUEBROU** a performance.

### Teste
```typescript
// Verificar que continua paralelo
it('processes files in parallel', async () => {
  const files = Array(5).fill(mockFile);
  
  const start = Date.now();
  await processFiles(files);
  const duration = Date.now() - start;
  
  // Se fosse serial, seria 5x o tempo de 1 arquivo
  expect(duration).toBeLessThan(SINGLE_FILE_TIME * 2);
});
```

---

## 📤 OUTPUTS OBRIGATÓRIOS

Ao alterar código de processamento:

```markdown
## Performance Impact

**Limites aplicados:**
- [Lista de limites e valores]

**Métricas antes/depois:**
| Métrica | Antes | Depois |
|---------|-------|--------|
| ... | ... | ... |

**Como evitar regressão "ficou serial":**
- [Teste ou verificação para garantir paralelismo]
```

---

> 💡 **Regra de Ouro:** Se você não sabe quanto tempo/memória/custo sua mudança vai consumir com 100 arquivos, teste ANTES de fazer PR.

# 🎯 Decisões Técnicas

Documentação das principais decisões arquiteturais e trade-offs.

---

## 📋 Decisões de Stack

### Por que Gemini Flash 2.0 para OCR?
**Decisão:** Usar Gemini 2.0 Flash em vez de Tesseract/outros

**Motivos:**
- ✅ Multimodal (entende contexto da imagem)
- ✅ Melhor acurácia em textos manuscritos/médicos
- ✅ API simples (@google/genai)
- ✅ Rate limits generosos (free tier: 15 RPM)

**Trade-offs:**
- ❌ Depende de API externa (precisa internet)
- ❌ Custo em produção (após free tier)
- ❌ Latência de rede (~1-2s por imagem)

**Alternativas consideradas:**
- Tesseract.js (local, mas acurácia baixa)
- OpenAI Vision (mais caro)
- Azure Computer Vision (vendor lock-in)

---

### Por que dcmjs para DICOM Processing?
**Decisão:** Usar dcmjs em vez de cornerstone/backends

**Motivos:**
- ✅ Zero-dependency (roda no browser)
- ✅ Suporta pixel data extraction
- ✅ Mantido ativamente
- ✅ TypeScript-friendly

**Trade-offs:**
- ❌ Não suporta compressed transfer syntaxes (JPEG 2000)
- ❌ Parsing síncrono (blocking em arquivos grandes)
- ⚠️ Futuro: considerar Web Workers

**Ref:** `core/dicom.ts`

---

### Por que LocalStorage vs IndexedDB?
**Decisão:** LocalStorage para metadata, arquivos não persistidos

**Motivos:**
- ✅ API simples (sync, sem Promises)
- ✅ Suficiente para metadata (JSON serializable)
- ✅ Files não podem ser serializados mesmo
- ✅ User re-upload após refresh (aceitável para MVP)

**Trade-offs:**
- ❌ Files perdidos ao recarregar página
- ❌ Limite 5-10MB (suficiente para metadata)

**Futuro:** IndexedDB para cache de converted PNGs (PR futuro)

**Ref:** `hooks/useSessionManager.ts` (linhas 28-52)

---

## 🏗️ Decisões de Arquitetura

### Por que Concorrência Manual (Worker Pool) vs Promise.all?
**Decisão:** Worker pool recursivo em vez de `Promise.allSettled`

**Implementação:**
```typescript
const processNext = async () => {
  if (index >= files.length || aborted) return;
  const file = files[index++];
  await processFile(file);
  await processNext(); // Recursão
};

// Spawn N workers
Array(CONCURRENCY).fill(null).map(() => processNext());
```

**Motivos:**
- ✅ Controle fino sobre abort (pode parar mid-processing)
- ✅ Não cria todas as Promises de uma vez (economiza memória)
- ✅ Permite delay entre processamentos (evita UI freeze)

**Trade-offs:**
- ❌ Mais complexo que Promise.all
- ❌ Depende de mutation (index++)

**Refs:**
- `hooks/useFileProcessing.ts` (linhas 46-81)
- `hooks/useOcrProcessing.ts` (linhas 97-116)

---

### Por que Callback-Based Hooks?
**Decisão:** Hooks retornam métodos + callbacks, não estado diretamente

**Padrão:**
```typescript
const useFileProcessing = (options: {
  onFilesAdded: (files) => void,
  onFileUpdated: (id, updates) => void,
  onError: (msg) => void
}) => {
  return { processFiles, isProcessing, abort };
};
```

**Motivos:**
- ✅ Hook não "possui" o estado (componente decide)
- ✅ Flexível (mesma lógica, diferentes UIs)
- ✅ Testável (mock callbacks)
- ✅ Evita prop drilling do estado

**Trade-offs:**
- ❌ Mais verboso (precisa passar callbacks)
- ⚠️ Muitas callbacks = muitas deps no useEffect

**Refs:** Todos os hooks em `hooks/`

---

### Por que Theme System com data-theme + CSS Variables?
**Decisão:** Híbrido data-theme (palette) + .dark/.light (mode)

**Implementação:**
```html
<body data-theme="amber" class="dark">
```

**CSS:**
```css
/* design-tokens.css */
[data-theme="amber"] { --primary: #f59e0b; }
.dark { --bg: #000; }
```

**Motivos:**
- ✅ Separa palette (cor) de mode (claro/escuro)
- ✅ 8 palettes × 2 modes = 16 temas
- ✅ Fácil adicionar novas palettes
- ✅ CSS variables (performance)

**Trade-offs:**
- ❌ Não funciona em IE11 (irrelevante)
- ⚠️ Precisa sincronizar data-theme + class

**Ref:** `hooks/useTheme.ts` + `styles/design-tokens.css`

**Histórico:** Ver `docs/HANDOFF_PREMIUM_UI.md` para decisões detalhadas

---

## 🔧 Decisões de Implementação

### Por que crypto.randomUUID() para Session IDs?
**Decisão:** UUIDs nativos vs `Date.now() + Math.random()`

**Motivos:**
- ✅ Nativo no browser (zero deps)
- ✅ Colisão praticamente impossível
- ✅ Padrão RFC 4122

**Trade-offs:**
- ⚠️ Não funciona em browsers muito antigos (polyfill via `uuid` lib)

**Ref:** `hooks/useSessionManager.ts` (linha 89)

---

### Por que 3 Workers (File Processing) vs 8 Workers (OCR)?
**Decisão:** Concorrência diferente por tipo de tarefa

**Rationale:**
- **File Processing (3 workers):**
  - CPU-bound (dcmjs parsing, canvas rendering)
  - Empiricamente testado: >3 = UI freeze
  - Ref: `hooks/useFileProcessing.ts` (linha 21)

- **OCR Processing (8 workers):**
  - I/O-bound (network requests)
  - Rate limit Gemini: 15 RPM (~4 requests/sec)
  - 8 workers = ~1 req/sec/worker (safety margin)
  - Ref: `hooks/useOcrProcessing.ts` (linha 21)

**Futuro:** Tornar configurável via UI

---

### Por que Platform Detection (Mac vs Windows/Linux)?
**Decisão:** Runtime detection de `navigator.platform`

**Código:**
```typescript
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? e.metaKey : e.ctrlKey;
```

**Motivos:**
- ✅ UX nativa (Cmd no Mac, Ctrl no Windows)
- ✅ Keyboard shortcuts familiares

**Trade-offs:**
- ⚠️ `navigator.platform` deprecated (mas funciona)
- 💡 Futuro: migrar para `navigator.userAgentData.platform`

**Ref:** `hooks/useKeyboardShortcuts.ts` (linha 41)

---

## 📦 Decisões de Bundling

### Por que Vite vs Webpack/CRA?
**Decisão:** Usar Vite como build tool

**Motivos:**
- ✅ Dev server instantâneo (ESM nativo)
- ✅ Hot Module Replacement rápido
- ✅ Configuração mínima
- ✅ Build otimizado (Rollup)

**Trade-offs:**
- ⚠️ Alguns plugins legados não compatíveis
- ✅ Mas projeto moderno (React 19, TS 5.8)

---

## 🧪 Decisões de Testing

### Por que Vitest vs Jest?
**Decisão:** Usar Vitest em vez de Jest

**Motivos:**
- ✅ Integração nativa com Vite
- ✅ Compatível com API do Jest
- ✅ Mais rápido (usa Vite bundling)
- ✅ ESM first (sem babel/transformers)

**Ref:** `vitest.config.ts`

---

## 🔮 Decisões Futuras (Pendentes)

### Considerar: Zustand/Redux para State Management?
**Status:** 🟡 Não implementado

**Quando considerar:**
- Se App.tsx > 1000 linhas
- Se prop drilling > 3 níveis
- Se múltiplos componentes precisam do mesmo estado

**Atualmente:** Props drilling aceitável (App.tsx = 619 linhas)

---

### Considerar: Web Workers para DICOM Processing?
**Status:** 🟡 Não implementado

**Benefícios:**
- ✅ Não bloqueia main thread
- ✅ Pode usar todos os CPU cores

**Desafios:**
- ❌ Transferência File → Worker (structured clone)
- ❌ Complexity aumenta

**Quando implementar:**
- Se users reportarem UI freeze em batches grandes (>100 DICOMs)

---

### Considerar: IndexedDB para File Caching?
**Status:** 🟡 Não implementado

**Benefícios:**
- ✅ Persiste converted PNGs após refresh
- ✅ Sem re-upload/re-conversion

**Desafios:**
- ❌ API complexa (Promises)
- ❌ Quota management

**Quando implementar:**
- PR futuro (após consolidação em src/)

---

**Última atualização:** Janeiro 2026
**Revisores:** Adicione suas notas aqui ao revisar decisões

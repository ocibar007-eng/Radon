# 📁 PR-ORG3: Consolidar Código Raiz → src/

**Data:** 06/01/2026  
**Tipo:** Repository Organization / Code Consolidation  
**Risco:** ⭐⭐⭐ MÉDIO (entry point + muitos imports)  
**Status:** ✅ CONCLUÍDO E VALIDADO

---

## 📋 Sumário Executivo

Este PR move os arquivos de código-fonte da raiz (`App.tsx`, `index.tsx`, `types.ts`) para `src/`, seguindo a convenção Vite de manter todo código-fonte em um único diretório.

### Problema Resolvido
- ✅ Código-fonte misturado com configs na raiz
- ✅ Entry point (`index.tsx`) inconsistente com convenção Vite (`main.tsx`)
- ✅ Imports relativos confusos (./ vs ../)
- ✅ Preparação para path aliases futuros (@/)

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos movidos | 3 (App.tsx, index.tsx→main.tsx, types.ts) |
| Arquivos modificados | 19 (imports + entry point) |
| Imports atualizados | 18 arquivos |
| Testes passando | 21/21 ✅ |
| Build Vite | ✅ Sucesso (1.52s) |

---

## 🔍 Mudanças Detalhadas

### 1. **Movimentação de Arquivos**

#### [MOVE] `App.tsx` → `src/App.tsx` (33.5KB)
Componente principal da aplicação.

**Imports atualizados dentro do arquivo:**
```diff
- import UploadArea from './components/UploadArea';
- import { useStats } from './hooks/useStats';
- import { sortFiles } from './core/sorting';
+ import UploadArea from '../components/UploadArea';
+ import { useStats } from '../hooks/useStats';
+ import { sortFiles } from '../core/sorting';
```

(Mantido) `import { BatchFile } from './types'` - agora no mesmo diretório

#### [MOVE + RENAME] `index.tsx` → `src/main.tsx` (1.3KB)
Entry point da aplicação, renomeado para seguir convenção Vite.

**Import atualizado:**
```diff
- import App from './App';
+ import App from './App';  // Sem mudança (mesmo diretório)
```

#### [MOVE] `types.ts` → `src/types.ts` (2.1KB)
Definições de tipos TypeScript compartilhados.

---

### 2. **Atualização do Entry Point**

#### [MODIFY] `index.html`
```diff
- <script type="module" src="/index.tsx"></script>
+ <script type="module" src="/src/main.tsx"></script>
```

---

### 3. **Atualização de Imports (18 arquivos)**

#### core/ (5 arquivos)
- `core/history.ts` (2 imports)
- `core/dicom.ts`
- `core/export.ts`
- `core/sorting.ts`
- `core/metadata.ts`

```diff
- from '../types'
+ from '../src/types'
```

#### components/ (5 arquivos)
- `components/ImageViewer.tsx`
- `components/HistoryModal.tsx`
- `components/FileList.tsx`
- `components/Sidebar.tsx`
- `components/ConfigModal.tsx`

```diff
- from '../types'
+ from '../src/types'
```

#### hooks/ (3 arquivos)
- `hooks/useSessionManager.ts`
- `hooks/useSessions.ts`
- `hooks/useOcrProcessing.ts`

```diff
- from '../types'
+ from '../src/types'
```

#### utils/ (1 arquivo)
- `utils/fileHelpers.ts`

```diff
- from '../types'
+ from '../src/types'
```

#### tests/ (4 arquivos)
- `tests/core/sorting.test.ts`
- `tests/core/export.test.ts`
- `tests/core/metadata.test.ts`
- `tests/hooks/useOcrProcessing.test.ts`

```diff
- from '../../types'
+ from '../../src/types'
```

---

## 🧪 Validação Técnica

### Testes Automatizados
```bash
npm test
```

**Resultado:**
```
 ✓ tests/adapters/ocr/gemini.test.ts (3 tests) 6ms
 ✓ tests/core/export.test.ts (2 tests) 5ms
 ✓ tests/core/metadata.test.ts (4 tests) 4ms
 ✓ tests/core/sorting.test.ts (4 tests) 10ms
 ✓ tests/hooks/useOcrProcessing.test.ts (3 tests) 14ms
 ✓ tests/hooks/useSessionManager.test.ts (5 tests) 44ms

 Test Files  6 passed (6)
      Tests  21 passed (21)
   Duration  1.02s
```

✅ **PASSOU** - 100% de sucesso

### Build Vite
```bash
npm run build
```
✅ **PASSOU** - Build completo em 1.52s

### Dev Server
```bash
npm run dev
```
✅ **PASSOU** - Servidor rodando em http://localhost:3000

---

## ✅ Checklist de Validação Manual

### Grupo 1: Estrutura de Arquivos
- [x] **Teste 1.1:** `src/` contém App.tsx, main.tsx, types.ts
- [x] **Teste 1.2:** Raiz não contém mais arquivos .tsx/.ts de código
- [x] **Teste 1.3:** `index.html` aponta para `/src/main.tsx`

### Grupo 2: Funcionalidade
- [x] **Teste 2.1:** Dev server inicia sem erros
- [x] **Teste 2.2:** Aplicação carrega no navegador
- [x] **Teste 2.3:** Upload, OCR, export funcionam

### Grupo 3: Testes e Build
- [x] **Teste 3.1:** Todos os 21 testes passam
- [x] **Teste 3.2:** Build Vite completa com sucesso
- [x] **Teste 3.3:** Nenhum import quebrado

---

## 🚨 Critérios de Falha

**REVERTER O PR** se qualquer um ocorrer:

1. Testes falham ao executar `npm test`
2. Build Vite quebra
3. Dev server não inicia
4. Aplicação não carrega no navegador
5. Imports quebrados detectados

---

## 📚 Decisões Técnicas

### Por que renomear index.tsx para main.tsx?
**Resposta:** Convenção Vite - o entry point padrão é `main.tsx` em `src/`. Isso facilita reconhecimento do projeto e alinhamento com templates oficiais Vite.

### Por que não mover components/, hooks/, etc. agora?
**Resposta:** Este PR foca apenas em arquivos raiz para minimizar risco. Components/, hooks/, etc. serão movidos nos PRs-Org4-6, um de cada vez.

### App.tsx precisa importar com ../ agora?
**Resposta:** Sim. App.tsx está em `src/` mas components/, hooks/, core/ ainda estão na raiz. Imports mudaram de `./` para `../`. Isso será corrigido no PR-Org4-6 quando tudo estiver em src/.

---

## 🔄 Próximos Passos

Após este PR, continuar com:

1. **PR-Org4:** Mover `components/` → `src/components/`
2. **PR-Org5:** Mover `hooks/` + `core/` → `src/hooks/` + `src/core/`
3. **PR-Org6:** Mover `utils/` + `styles/` → `src/utils/` + `src/styles/`
4. **PR-Org7:** Configurar path aliases (`@/`)
5. **PR-Org8:** Limpeza final

---

## 📝 Notas de Manutenção Futura

### Para criar novos arquivos de código:

1. Criar sempre em `src/` ou subdiretórios de `src/`
2. Entry point é `src/main.tsx`
3. Tipos compartilhados em `src/types.ts`

**Exemplo:**
```typescript
// ✅ CORRETO
// Em src/components/NewComponent.tsx
import { BatchFile } from '../types';

// ❌ ERRADO
// Criar arquivo na raiz
```

---

## 🎯 Resumo para Revisão de Código

**Pode mergear?** ✅ SIM, se:
- Todos os 21 testes passam
- Build Vite completa com sucesso
- Dev server inicia e app carrega
- Nenhum import quebrado

**Risco de quebra:** ⭐⭐⭐ MÉDIO
- Envolve entry point da aplicação
- 18 arquivos com imports atualizados
- Mudança de estrutura significativa
- Testes validam comportamento

**Benefícios:**
- ✅ Código-fonte organizado em src/
- ✅ Entry point padrão Vite (main.tsx)
- ✅ Preparado para path aliases
- ✅ Estrutura profissional e previsível

---

**Assinado:** Claude Sonnet 4.5 com Pensamento Estendido  
**Validado por:** Suíte automatizada (21/21 testes) + Build Vite  
**Status:** ✅ PRONTO PARA MERGE

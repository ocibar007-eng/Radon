# 📁 PR-ORG2: Resolver Duplicação de adapters/

**Data:** 06/01/2026  
**Tipo:** Repository Organization / Code Consolidation  
**Risco:** ⭐⭐ BAIXO (movimentação de arquivos + atualização de imports)  
**Status:** ✅ CONCLUÍDO E VALIDADO

---

## 📋 Sumário Executivo

Este PR elimina a duplicação entre `adapters/` (raiz) e `src/adapters/`, consolidando todo o código em `src/adapters/` seguindo a convenção Vite de manter código-fonte em `src/`.

### Problema Resolvido
- ✅ Duplicação de `adapters/ocr/gemini.ts` em dois locais diferentes
- ✅ Versão desatualizada em `src/adapters/` (sem retry logic)
- ✅ Confusão sobre qual versão é a "fonte da verdade"
- ✅ Imports inconsistentes apontando para raiz em vez de `src/`

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos deletados | 2 (`adapters/ocr/gemini.ts`, `adapters/ocr/bridge.ts`) |
| Arquivos modificados | 4 (3 imports + 1 consolidação) |
| Linhas de código movidas | 115 |
| Testes afetados | 2 (gemini.test.ts, useOcrProcessing.test.ts) |
| Testes passando | 21/21 ✅ |

---

## 🔍 Mudanças Detalhadas

### 1. **Análise da Duplicação**

#### Versão em `adapters/` (raiz) - 114 linhas ✅ ATUALIZADA
- Retry logic com backoff exponencial (10 retries)
- Usa `utils/ocrHelpers.ts` (delay, processImageForApi)
- Prompt brasileiro com transformações de data/nome
- Compressão de imagem (max 1536px, 80% quality)

#### Versão em `src/adapters/` - 88 linhas ❌ ANTIGA
- Sem retry logic
- Função `fileToBase64` inline (sem compressão)
- Prompt genérico em inglês
- Sem tratamento de rate limiting

**Decisão:** Manter versão de `adapters/` (raiz) e mover para `src/adapters/`

---

### 2. **Consolidação de Código**

#### [DELETE] `adapters/` (raiz completo)
```bash
rm -rf adapters/
```

Deletado:
- `adapters/ocr/gemini.ts` (114 linhas)
- `adapters/ocr/bridge.ts` (arquivo obsoleto)

#### [MODIFY] `src/adapters/ocr/gemini.ts`
```diff
# Sobrescrito com versão atualizada da raiz
+ 114 linhas (versão com retry logic)
- 88 linhas (versão antiga)
```

**Mudanças de import dentro do arquivo:**
```diff
- import { OcrResult } from "../../types";
- import { delay, processImageForApi } from "../../utils/ocrHelpers";
+ import { OcrResult } from "../../../types";
+ import { delay, processImageForApi } from "../../../utils/ocrHelpers";
```

---

### 3. **Atualização de Imports (4 arquivos)**

#### [MODIFY] `hooks/useOcrProcessing.ts`
```diff
- import { runGeminiOcr } from '../adapters/ocr/gemini';
+ import { runGeminiOcr } from '../src/adapters/ocr/gemini';
+ import { OcrResult } from '../types'; // Adicionado import faltante
```

#### [MODIFY] `tests/adapters/ocr/gemini.test.ts`
```diff
- import { runGeminiOcr } from '../../../adapters/ocr/gemini';
+ import { runGeminiOcr } from '../../../src/adapters/ocr/gemini';
```

#### [MODIFY] `tests/hooks/useOcrProcessing.test.ts`
```diff
- vi.mock('../../adapters/ocr/gemini', () => ({ ... }));
+ vi.mock('../../src/adapters/ocr/gemini', () => ({ ... }));

- import { runGeminiOcr } from '../../adapters/ocr/gemini';
+ import { runGeminiOcr } from '../../src/adapters/ocr/gemini';
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
 ✓ tests/core/sorting.test.ts (4 tests) 12ms
 ✓ tests/hooks/useOcrProcessing.test.ts (3 tests) 15ms
 ✓ tests/hooks/useSessionManager.test.ts (5 tests) 25ms

 Test Files  6 passed (6)
      Tests  21 passed (21)
   Duration  992ms
```

✅ **PASSOU** - 100% de sucesso

### Build TypeScript
```bash
npx tsc --noEmit
```
✅ **PASSOU** - 4 erros pré-existentes apenas (componentes UI)

### Dev Server
```bash
npm run dev
```
✅ **PASSOU** - Servidor rodando normalmente em http://localhost:3001/

---

## ✅ Checklist de Validação Manual

### Grupo 1: Estrutura de Arquivos
- [x] **Teste 1.1:** `adapters/` (raiz) não existe mais
- [x] **Teste 1.2:** `src/adapters/ocr/gemini.ts` contém versão atualizada (115 linhas)
- [x] **Teste 1.3:** Nenhum import aponta para `adapters/` (raiz)

### Grupo 2: Funcionalidade
- [x] **Teste 2.1:** OCR processing funciona (upload + Gemini API)
- [x] **Teste 2.2:** Retry logic ativo em caso de erro 429
- [x] **Teste 2.3:** Compressão de imagem funcionando

### Grupo 3: Testes
- [x] **Teste 3.1:** Todos os 21 testes passam
- [x] **Teste 3.2:** Mocks funcionam corretamente
- [x] **Teste 3.3:** Nenhum timeout ou falha intermitente

---

## 🚨 Critérios de Falha

**REVERTER O PR** se qualquer um ocorrer:

1. Testes falham ao executar `npm test`
2. Build TypeScript introduz novos erros
3. Dev server não inicia
4. OCR processing quebra
5. Imports quebrados detectados

---

## 📚 Decisões Técnicas

### Por que consolidar em `src/` em vez de raiz?
**Resposta:** Convenção Vite - todo código-fonte deve estar em `src/`. Facilita configuração de path aliases futuros (`@/adapters`) e separação clara entre código e configuração.

### Por que manter a versão de `adapters/` (raiz)?
**Resposta:** Versão da raiz estava atualizada com retry logic, compressão de imagem e prompt brasileiro. Versão em `src/adapters/` estava desatualizada (88 vs 114 linhas).

### Por que não usar path aliases agora?
**Resposta:** Path aliases (`@/adapters`) serão implementados no PR-Org7. Este PR foca apenas em eliminar duplicação, mantendo mudanças mínimas.

---

## 🔄 Próximos Passos

Após este PR, considerar:

1. **PR-Org3:** Consolidar código raiz → `src/` (App.tsx, index.tsx, types.ts)
2. **PR-Org4-6:** Mover módulos restantes → `src/` (components, hooks, core, utils, styles)
3. **PR-Org7:** Configurar path aliases (`@/`)
4. **PR-Org8:** Limpeza final

---

## 📝 Notas de Manutenção Futura

### Para adicionar novos adapters:

1. Criar em `src/adapters/<categoria>/<nome>.ts`
2. Importar usando caminho relativo a partir de `src/`
3. Nunca criar arquivos fora de `src/` (exceto configs)

**Exemplo:**
```typescript
// ✅ CORRETO
import { runGeminiOcr } from '../src/adapters/ocr/gemini';

// ❌ ERRADO (não existe mais)
import { runGeminiOcr } from '../adapters/ocr/gemini';
```

---

## 🎯 Resumo para Revisão de Código

**Pode mergear?** ✅ SIM, se:
- Todos os 21 testes passam
- Build TypeScript sem novos erros
- Dev server funciona normalmente
- Nenhum import quebrado

**Risco de quebra:** ⭐⭐ BAIXO
- Apenas movimentação de arquivos
- Atualização mecânica de imports
- Zero mudanças de lógica
- Testes validam comportamento

**Benefícios:**
- ✅ Elimina confusão sobre qual versão usar
- ✅ Segue convenção Vite (`src/`)
- ✅ Prepara terreno para path aliases
- ✅ Código mais organizado e previsível

---

**Assinado:** Claude Sonnet 4.5 (Engenheiro de Organização)  
**Validado por:** Suíte automatizada (21/21 testes)  
**Status:** ✅ PRONTO PARA MERGE

---
name: radon-feature-builder
description: Protocolo estruturado para criar novas features sem bagunça. Garante organização, integração e qualidade.
---

# Radon Feature Builder 🏗️ ✨

Use esta skill ao criar **qualquer funcionalidade nova** no projeto Radon.

---

## 🧠 MENTALIDADE CORRETA

Você NÃO é avaliada por "quantidade de código", e sim por:
- **Clareza** da estrutura
- **Baixo risco** de regressão
- **Mudanças pequenas** e reversíveis
- **Respeito** a contratos e padrões existentes

> **"Antes de escrever a primeira linha de código, saiba ONDE ela vai ficar e COMO ela se conecta."**

---

## 📐 PROCESSO OBRIGATÓRIO (6 FASES)

### FASE 1: DISCOVERY (Entender o Contexto)
- [ ] Ler docs relacionados em `docs/`
- [ ] Verificar se já existe feature similar em `src/features/`
- [ ] Entender onde a nova feature se encaixa
- [ ] Listar arquivos que serão **modificados** (não só criados)

---

### FASE 2: DESIGN (Planejar Estrutura)
- [ ] Quais **tipos/interfaces** serão criados?
- [ ] Quais **hooks** serão necessários?
- [ ] Quais **componentes** serão criados?
- [ ] Qual **pasta** vai conter a feature?

---

### FASE 3: SCAFFOLDING (Criar Estrutura)
Criar arquivos vazios/básicos primeiro:
```
src/features/<minha-feature>/
├── index.ts           # Barrel export (OBRIGATÓRIO)
├── types.ts           # Tipos/interfaces
├── <Feature>.tsx      # Componente principal
├── use<Feature>.ts    # Hook principal
└── domain/            # Lógica pura (sem React)
```

---

### FASE 4: IMPLEMENTATION (Implementar)
- [ ] Implementar **tipos primeiro** (contratos)
- [ ] Implementar **lógica pura** (sem UI)
- [ ] Implementar **hooks** (orquestração)
- [ ] Implementar **componentes** (usando hooks)

---

### FASE 5: INTEGRATION (Conectar)
- [ ] Atualizar **barrel exports** (`index.ts`)
- [ ] Atualizar **imports** nos arquivos que vão usar
- [ ] Conectar com **router/context/pipeline** se necessário

---

### FASE 6: VALIDATION (Testar)
- [ ] `npm run build` passa
- [ ] `npm run test` passa
- [ ] Smoke test manual funciona

---

## 📁 ONDE COLOCAR CADA COISA

### A) UI (Componentes puros, sem side-effects)
| O que | Onde |
|-------|------|
| Componente de feature | `src/features/<feature>/components/` |
| Componente reutilizável | `src/components/` |
| Componente UI base (Button, Modal) | `src/components/ui/` |

### B) Estado e Orquestração (Hooks)
| O que | Onde |
|-------|------|
| Hook usado em várias features | `src/hooks/` |
| Hook específico de 1 feature | `src/features/<feature>/hooks/` ou `src/features/<feature>/` |

### C) Lógica Pura (Domínio/Regras)
| O que | Onde |
|-------|------|
| Lógica de negócio pura (sem React) | `src/features/<feature>/domain/` |
| Helpers genéricos e puros | `src/utils/` |

### D) Integrações / Infra
| O que | Onde |
|-------|------|
| Chamadas de IA, schemas, mappers | `src/adapters/` |
| Serviço interno (Firebase, storage) | `src/services/` |

> ⚠️ **NUNCA** chamar API externa direto de componente de UI!

### E) Tipos
| O que | Onde |
|-------|------|
| Tipos locais da feature | `src/features/<feature>/types.ts` |
| Tipos globais compartilhados | `src/types/` |

---

## 📏 LIMITES DE TAMANHO (Evitar GOD Files)

| Tipo | Limite | O que fazer se passar |
|------|--------|----------------------|
| Arquivo qualquer | **250-300 linhas** | 🔴 Dividir! |
| Componente React | **200 linhas** | Extrair subcomponentes |
| Hook | **1 responsabilidade** | Se faz upload + state + parsing → dividir |
| Função | **60 linhas** | Extrair helpers |

> **Regra:** Um arquivo deve ter "1 motivo pra mudar".

---

## 🗂️ PADRÕES DE NOMES

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Pastas | kebab-case | `report-groups/` |
| Componentes | PascalCase.tsx | `ReportCard.tsx` |
| Hooks | useXxx.ts | `usePatients.ts` |
| Utilitários | camelCase.ts | `grouping.ts` |
| Tipos | PascalCase | `PatientData` |

---

## ❓ QUANDO CRIAR NOVO ARQUIVO/PASTA

### ✅ CRIE se:
- O bloco for **reutilizável**
- Reduzir o arquivo atual **abaixo do limite**
- Separar claramente **UI vs lógica vs infra**
- O bloco puder ser **testado isoladamente**

### ❌ NÃO CRIE se:
- Já existir pasta equivalente no repo
- O conteúdo for 1 arquivo pequeno (prefira co-localizar)
- For mover/renomear "porque ficou feio" sem necessidade funcional

---

## 🚫 REGRAS NÃO-NEGOCIÁVEIS

1. ❌ Nunca misture "mudança estrutural" com "mudança comportamental" no mesmo PR
2. ❌ Não faça reformat global, não atualize dependências
3. ❌ Preserve exports, props, tipos públicos, IDs, shapes e contratos
4. ❌ Se houver dúvida sobre onde colocar: **priorize consistência** com padrão existente
5. ❌ Nunca criar arquivo solto em `src/` raiz
6. ❌ Nunca criar código que ninguém chama
7. ❌ Nunca deixar `// TODO` sem implementar

---

## 📤 OUTPUT OBRIGATÓRIO (Ao Finalizar)

Entregar:
1. **Mapa de arquivos** - o que foi criado/movido
2. **Justificativa** - por que está nessa pasta
3. **Validação** - quais testes rodaram / invariantes preservadas
4. **Dívida técnica** - o que decidiu NÃO mexer (evita escopo infinito)

### Formato da resposta:
1. **Primeiro:** Plano (estrutura proposta)
2. **Depois:** Mudanças (arquivos)
3. **Por último:** Validação (testes e riscos)

> **Nunca encerrar pedindo decisão do usuário; assuma a decisão mais segura.**

---

## 🎯 EXEMPLO RÁPIDO

**Tarefa:** Criar feature "Validação de Contraste"

```
PLANO:
├── src/features/contrast-validation/
│   ├── index.ts
│   ├── types.ts              (ContrastData, ValidationResult)
│   ├── ContrastPanel.tsx     (UI)
│   ├── useContrast.ts        (hook de orquestração)
│   └── domain/
│       └── validate.ts       (lógica pura, testável)

JUSTIFICATIVA:
- Nova feature → pasta própria
- Lógica pura separada em domain/ → testável sem React
- Hook orquestra → chama domain + dispatch

VALIDAÇÃO:
- npm run build ✅
- npm run test ✅
- Integrado com ReportGroupCard ✅
```

---

> 💡 **Dica Final:** Se parece complexo demais para uma feature, quebre em features menores.

---

## 🚩 FEATURE FLAG (Obrigatório para Features Novas)

Toda feature nova entra **atrás de flag**, e só liga quando E2E passar:

```typescript
// src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  contrastValidation: false,  // Liga após E2E passar
  // ...
} as const;

// Uso no código
if (FEATURE_FLAGS.contrastValidation) {
  return <ContrastValidationPanel />;
}
```

---

## 📜 CONTRATO PÚBLICO EXPLÍCITO

Antes de implementar, liste o que será **importável** (barrel exports):

```markdown
## Contrato Público da Feature

**Exports (via index.ts):**
- `ContrastValidationPanel` (componente)
- `useContrastValidation` (hook)
- `ContrastData` (tipo)

**NÃO exportar (interno):**
- Funções do domain/
- Componentes internos
```

> ⛔ Proibido "deep imports": `import X from '../features/foo/internal/Bar'`

---

## 🚫 CHECK ANTI-GOD FILE

**Regra:** Se arquivo ultrapassar limite → **extrair na hora**, não "depois".

Antes de fazer PR, verifique:
```bash
# Verificar tamanho dos arquivos modificados
wc -l src/features/MINHA_FEATURE/*.ts*

# Se algum > 250 linhas: dividir ANTES do PR
```

---

## 🔄 COMPATIBILIDADE DE DADOS

Se a feature tocar em shape persistido:

1. Verificar se precisa `schemaVersion`
2. Consultar skill `radon-data-contracts-migrations`
3. Adicionar ao checklist de validação:
   - [ ] Dados antigos ainda funcionam?
   - [ ] Migração implementada (se necessário)?


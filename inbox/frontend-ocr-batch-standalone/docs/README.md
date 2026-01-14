# 📚 Documentação Técnica - OCR Batch Processor

Índice completo da documentação do projeto.

---

## 📖 Documentos Principais

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Visão macro da arquitetura, fluxos principais e diagramas.

**Conteúdo:**
- Arquitetura em camadas (UI → Hooks → Core → Adapters)
- Fluxo de upload e processamento DICOM
- Fluxo de OCR batch
- Gerenciamento de sessões
- Padrões de design utilizados

---

### [DECISIONS.md](./DECISIONS.md)
Decisões técnicas importantes e trade-offs.

**Conteúdo:**
- Por que Gemini Flash 2.0 para OCR
- Por que dcmjs para DICOM processing
- Estratégia de LocalStorage vs IndexedDB
- Concorrência manual vs Promise.all
- Callback-based hooks pattern
- Theme system (data-theme + CSS variables)

---

### [REFACTORING_PLAN.md](./REFACTORING_PLAN.md)
Plano de refatoração e organização do repositório.

**Conteúdo:**
- Histórico das refatorações (PR1-PR6)
- Plano de consolidação em `src/`
- Roadmap de melhorias futuras
- Links para documentos de cada PR

---

### [HANDOFF_PREMIUM_UI.md](./HANDOFF_PREMIUM_UI.md)
Handoff técnico do design system e componentes Premium UI.

**Conteúdo:**
- Theme system detalhado
- Componentes UI reutilizáveis
- Bugs corrigidos (histórico)
- Features wishlist

---

## 📂 Documentação de Refatorações

Histórico detalhado das 6 refatorações incrementais:

### [refactoring/PR1-tipos.md](./refactoring/PR1-tipos.md)
Correção de inconsistências de tipos BatchFile.

### [refactoring/PR2-file-processing.md](./refactoring/PR2-file-processing.md)
Extração do hook useFileProcessing (upload + DICOM conversion).

### [refactoring/PR3-ocr-processing.md](./refactoring/PR3-ocr-processing.md)
Extração do hook useOcrProcessing (batch OCR com concorrência).

### [refactoring/PR4-session-manager.md](./refactoring/PR4-session-manager.md)
Extração do hook useSessionManager (CRUD de sessões + LocalStorage).

### [refactoring/PR5-keyboard-shortcuts.md](./refactoring/PR5-keyboard-shortcuts.md)
Extração do hook useKeyboardShortcuts (event handling + platform detection).

### [refactoring/PR6-code-hygiene.md](./refactoring/PR6-code-hygiene.md)
Limpeza final (remover imports não usados, simplificar constantes).

---

## 🛠️ Guias de Desenvolvimento

### Como Adicionar Novo Adapter
1. Criar arquivo em `adapters/ocr/novo-provider.ts`
2. Implementar interface `OcrAdapter` (ver `adapters/ocr/bridge.ts`)
3. Exportar função `runNomeOcr(file: File): Promise<OcrResult>`
4. Atualizar `hooks/useOcrProcessing.ts` para usar novo adapter

### Como Adicionar Novo Hook
1. Criar arquivo em `hooks/useNomeDoHook.ts`
2. Seguir padrão callback-based (ver `useFileProcessing.ts`)
3. Exportar via `hooks/index.ts`
4. Adicionar testes em `tests/hooks/`

### Como Adicionar Novo Core Module
1. Criar arquivo em `core/nome-modulo.ts`
2. Exportar apenas funções puras (sem React, sem side-effects)
3. Adicionar testes em `tests/core/`

---

## 📋 Convenções de Código

### Estrutura de Arquivos
```
feature-name/
├── ComponenteName.tsx       # PascalCase para componentes
├── useFeatureName.ts        # camelCase para hooks
├── featureHelpers.ts        # camelCase para utils
└── FeatureName.test.ts      # Mesmo nome + .test
```

### Imports Order
1. React e bibliotecas externas
2. Types
3. Hooks
4. Components
5. Utils e helpers
6. Styles

### Commits
Seguir [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nova feature
- `fix:` Bug fix
- `refactor:` Refatoração sem mudança de comportamento
- `chore:` Mudanças de build/config
- `docs:` Apenas documentação

---

## 🔍 Busca Rápida

**Precisa encontrar onde...?**

| Pergunta | Arquivo |
|----------|---------|
| ...DICOM é convertido para PNG? | `core/dicom.ts` |
| ...OCR é executado? | `adapters/ocr/gemini.ts` |
| ...arquivos são ordenados? | `core/sorting.ts` |
| ...sessões são salvas no LocalStorage? | `hooks/useSessionManager.ts` |
| ...keyboard shortcuts são gerenciados? | `hooks/useKeyboardShortcuts.ts` |
| ...temas são aplicados? | `hooks/useTheme.ts` + `styles/design-tokens.css` |
| ...exportação JSON acontece? | `core/export.ts` |

---

## 📞 Suporte

Para dúvidas sobre a documentação:
1. Verifique a seção [Troubleshooting](../README.md#troubleshooting) do README
2. Consulte os documentos de decisões técnicas
3. Revise o histórico de refatorações

---

**Última atualização:** Janeiro 2026

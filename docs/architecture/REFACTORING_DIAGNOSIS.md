# Diagnóstico de Refatoração - Radon Lite

Este relatório apresenta uma análise técnica da saúde do código, focada em manutenibilidade e escalabilidade.

## 📊 Métricas de Risco (Top Suspeitos)

| Módulo/Ficheiro | Linhas | Complexidade | Veredito | Ação de Primeiro Passo |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/App.tsx` | 613 | 🔴 ALTA | **[URGENTE]** | Extrair lógica de Modals e Hydration para hooks/componentes menores. |
| `src/hooks/useWorkspaceActions.ts` | 404 | 🔴 ALTA | **[URGENTE]** | Módulo monolítico. Quebrar em `useUpload` e `useMutation`. |
| `src/components/PatientList.tsx` | 462 | 🟡 MÉDIA | **[NECESSÁRIO]** | Extrair lógica de filtragem e sub-componentes da tabela. |
| `src/features/reports/ReportGroupCard.tsx` | 301 | 🔴 ALTA | **[URGENTE]** | Grande mix de UI e lógica de split/unificação. |
| `src/hooks/usePipeline.ts` | 247 | 🔴 ALTA | **[URGENTE]** | FSM (Máquina de Estados) implícita muito complexa. |

---

## 👃 Code Smells Detectados

### 1. "God Component" (App.tsx)
- **Problema**: `App.tsx` gerencia roteamento, estado de 4+ modais, lógica de hidratação do Firebase e layout global.
- **Risco**: Qualquer alteração no layout causa re-renders em toda a cadeia de hidratação.

### 2. Mix de Lógica e UI (ReportGroupCard)
- **Problema**: O arquivo contém lógica de cópia de texto, formatação de HTML (`dangerouslySetInnerHTML`), lógica de split de páginas e renderização condicional pesada.
- **Risco**: Difícil de testar unitariamente as regras de exibição sem montar o componente.

### 3. Prop Drilling (DocumentGallery & IntakeCard)
- **Problema**: Parâmetros como `handleFileUpload`, `handleFilesUpload` e `onRemoveDoc` estão sendo passados por múltiplos níveis.
- **Risco**: Acoplamento rígido entre componentes de UI e hooks de ação.

---

## 🛠️ Plano de Ação (Prioridades)

### [URGENTE]: Refatoração do `App.tsx`
- **Por que?** É o gargalo de entendimento do projeto.
- **Ação**: Criar um `src/app/AppRouter.tsx` para views e um `src/features/workspace/WorkspaceContainer.tsx` para isolar o layout do editor.

### [URGENTE]: Decomposição do `useWorkspaceActions`
- **Por que?** Centraliza todas as mutações. Se uma função quebra, o hook inteiro falha.
- **Ação**: Extrair lógica de áudio para `useAudioActions` e upload para `useUploadManager`.

### [NECESSÁRIO]: Isolar Lógica de Renderização de Laudos
- **Por que?** `ReportGroupCard` está sobrecarregado.
- **Ação**: Criar sub-componentes para `StructuredReportView` e `VerbatimTextView`.

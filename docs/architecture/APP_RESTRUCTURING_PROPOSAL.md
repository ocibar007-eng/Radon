# App.tsx Restructuring Proposal - Phase 2

## Current Problem
[App.tsx](file:///Users/lucasdonizetecamargos/Downloads/app%20(6)/src/app/App.tsx) (613 linhas) é um "God Component" que faz:
- Roteamento (list vs workspace)
- Gerenciamento de 4+ estados de modal
- Lógica de hidratação do Firebase
- Layout do Workspace completo
- Drag & Drop handlers

## Proposed New Structure

```
src/
├── app/
│   ├── App.tsx                      # NOVO: Orquestrador limpo (~50 linhas)
│   ├── AppProviders.tsx             # NOVO: Context wrappers
│   └── AppRouter.tsx                # NOVO: Lógica de roteamento
│
├── features/
│   ├── workspace/
│   │   ├── WorkspaceLayout.tsx      # NOVO: Move do App.tsx atual
│   │   ├── WorkspaceHydration.tsx   # NOVO: Lógica de carregamento
│   │   └── WorkspaceModals.tsx      # NOVO: Modais isolados
│   │
│   └── patient-list/               # (Já existe como PatientList.tsx)
│       └── ...
│
└── (resto inalterado)
```

## Component Responsibilities

### 1. `App.tsx` (New - Clean Orchestrator)
**Responsabilidade:** Entry point minimalista
```typescript
// ~50 linhas
- Renderiza <AppProviders>
- Renderiza <AppRouter>
- Nada mais
```

### 2. `AppProviders.tsx` (New)
**Responsabilidade:** Agregação de Contexts
```typescript
// ~30 linhas
- Wraps SessionProvider
- Wraps GalleryProvider
- Exporta como um único <AppProviders>
```

### 3. `AppRouter.tsx` (New)
**Responsabilidade:** View state e navegação
```typescript
// ~80 linhas
- Estado: currentView ('list' | 'workspace')
- Estado: selectedPatient
- Lógica: handleSelectPatient, handleQuickStart
- Renderização: <Sidebar> + switch entre PatientList e WorkspaceLayout
```

### 4. `WorkspaceLayout.tsx` (Extracted)
**Responsabilidade:** Layout e lógica do editor
```typescript
// ~400 linhas (migrado do App.tsx atual)
- Recebe patient via props
- Toda a lógica de tabs, docs, áudio
- useWorkspaceActions, usePipeline, usePersistence
- DocumentGallery, ClinicalTab, etc.
```

### 5. `WorkspaceHydration.tsx` (New - Optional Refactor)
**Responsabilidade:** Isolamento da lógica de Firebase/IndexedDB
```typescript
// ~80 linhas
- useEffect para carregar sessão do IndexedDB/Firestore
- Dispatch de RESTORE_SESSION
- Pode ser um custom hook (useWorkspaceHydration)
```

### 6. `WorkspaceModals.tsx` (New - Optional Refactor)
**Responsabilidade:** Modais do workspace
```typescript
// ~60 linhas
- ConfirmModal para Clear Session
- ConfirmModal para Exit
- Estado local dos modais
```

## Migration Strategy

### Step 1: Create New Files (sem quebrar nada)
1. Criar `AppProviders.tsx`
2. Criar `AppRouter.tsx` (vazio)
3. Criar `features/workspace/WorkspaceLayout.tsx` (vazio)

### Step 2: Move Logic (um de cada vez)
1. Copiar lógica de Providers para `AppProviders.tsx`
2. Copiar lógica de roteamento para `AppRouter.tsx`
3. Copiar componente WorkspaceLayout do App.tsx para novo arquivo

### Step 3: Replace in App.tsx
1. Importar os novos componentes
2. Substituir JSX antigo pelos novos componentes
3. Deletar código movido

## Benefits

✅ **Single Responsibility**: Cada arquivo tem uma responsabilidade clara
✅ **Testabilidade**: WorkspaceLayout pode ser testado isoladamente
✅ **Manutenibilidade**: Mudanças em hidratação não tocam em routing
✅ **Legibilidade**: App.tsx vira um "índice" de 50 linhas

## Risk Mitigation

🛡️ **Sem Breaking Changes**: A API externa não muda (ainda é `<App />`)
🛡️ **Incremental**: Podemos fazer um arquivo por vez e testar
🛡️ **Rollback Fácil**: Se algo quebrar, só reverter o commit

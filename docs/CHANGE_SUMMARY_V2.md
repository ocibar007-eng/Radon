
# Handoff Técnico: Sistema Multi-Paciente (V2)

**Status:** ✅ Fase 1 (Dados) e Fase 2 (UI) Completas.
**Data:** 25/05/2024
**Arquitetura:** Firebase-First (Firestore + Storage).

Este documento serve como **Ponto de Restauração** e **Guia de Contexto** para novas iterações.

---

## 1. Mapa de Arquivos Implementados

Abaixo, a lista exata dos arquivos que compõem a nova funcionalidade. Se precisar regredir ou entender o escopo, verifique estes arquivos.

### Camada de Dados (Core & Services)
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/types/patient.ts` | **[NOVO]** Definições de tipo (`Patient`, `PatientStatus`) separadas da sessão visual. |
| `src/core/firebase.ts` | **[NOVO]** Singleton de inicialização do Firebase (Firestore/Storage). Fail-safe se sem chaves. |
| `src/services/patient-service.ts` | **[NOVO]** Lógica CRUD. Implementa **Soft Delete** e paginação básica. Fonte da verdade. |
| `src/services/patient-service.test.ts` | **[NOVO]** Testes unitários garantindo que o service trata dados corretamente. |

### Camada de UI (Components & Hooks)
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/styles/patient-list.css` | **[NOVO]** Estilos CSS puros (sem Tailwind) para a nova tela de listagem. |
| `src/hooks/usePatients.ts` | **[NOVO]** Hook React que conecta a UI ao Service. Gerencia loading/error states. |
| `src/components/PatientCard.tsx` | **[NOVO]** Card visual do paciente com status colorido e ações (abrir/excluir). |
| `src/components/PatientList.tsx` | **[NOVO]** Dashboard principal ("Lista de Trabalho") com filtros e modal de criação. |

### Integração (App Root)
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/app/App.tsx` | **[MODIFICADO]** Agora atua como **Router**. Alterna entre `<PatientList>` e `<WorkspaceLayout>`. |

---

## 2. Decisões de Arquitetura Críticas

### A. Firebase First (vs IndexedDB)
Optamos por usar o Firestore como banco primário para permitir que a **Recepção cadastre** e o **Médico laude** em computadores diferentes.
- O código verifica `isFirebaseEnabled()`. Se não houver chaves `.env`, ele roda sem erros (modo demonstração), mas avisa na UI.

### B. Soft Delete
Para conformidade médica e segurança:
- `deletePatient` no frontend chama `PatientService.softDeletePatient(id)`.
- Isso define `deletedAt: Timestamp` no Firestore.
- A query de listagem filtra automaticamente: `where('deletedAt', '==', null)`.

### C. Roteamento Simples
Não instalamos `react-router-dom` para manter o projeto leve.
- O roteamento é feito via state no `App.tsx`:
  ```typescript
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  ```

---

## 3. Snippets de Código Críticos (Para Contexto Rápido)

### Modelo de Dados (`src/types/patient.ts`)
```typescript
export type PatientStatus = 'waiting' | 'processing' | 'ready' | 'done';
export interface Patient {
  id: string;
  status: PatientStatus;
  docsCount: number;
  deletedAt?: number; // Soft delete
  // ...
}
```

### Serviço (`src/services/patient-service.ts`)
```typescript
// Exemplo de Query Segura
const constraints = [
  where('deletedAt', '==', null),
  orderBy('createdAt', 'desc'),
  limit(50)
];
```

### Integração no App (`src/app/App.tsx`)
```typescript
// O Workspace antigo foi movido para um componente interno WorkspaceLayout
// O App agora decide o que renderizar:
return (
  <SessionProvider>
    {currentView === 'list' ? (
      <PatientList onSelectPatient={handleSelectPatient} />
    ) : (
      <WorkspaceLayout 
        patient={selectedPatient} 
        onExit={handleExitWorkspace} 
      />
    )}
  </SessionProvider>
);
```

---

## 4. Próximos Passos (Para a Próxima IA)

1.  **Persistência Real do Workspace:**
    - Atualmente, ao entrar no Workspace, os dados são carregados na memória (`SessionContext`).
    - **Faltante:** Salvar os uploads de PDF/Imagens no **Firebase Storage** e vincular os URLs ao registro do paciente no Firestore.
    - *Dica:* Editar `handleFileUpload` em `App.tsx` para usar `PatientService.uploadFile` (a ser criado).

2.  **Configuração de Ambiente:**
    - Criar arquivo `.env` com as chaves do Firebase (`VITE_FIREBASE_API_KEY`, etc) para teste real de nuvem.

3.  **Deploy:**
    - O build continua via `vite build`. Nenhuma configuração extra de bundler é necessária.

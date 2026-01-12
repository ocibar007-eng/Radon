
# Arquitetura do Sistema (V4)

Este documento descreve a arquitetura de software, fluxo de dados e decisões de design do "Assistente de Laudos".

## Diagrama de Alto Nível

```mermaid
graph TD
    User[Usuário] -->|Upload/Audio| UI[React UI]
    
    subgraph "Frontend Layer"
        UI --> Hooks[Custom Hooks]
        Hooks --> Services[Service Layer]
        
        subgraph "State Management"
            SessionCtx[SessionContext (Reducer)]
            PipelineQueue[Pipeline Queue (Async)]
        end
        
        Hooks <--> SessionCtx
    end
    
    subgraph "Core Adapters"
        Gemini[Gemini Adapter]
        PDF[PDF.js Util]
        Audio[Audio Recorder]
    end
    
    subgraph "Persistence Layer"
        StorageSvc[Storage Service]
        PatientSvc[Patient Service]
        
        MemStore[In-Memory Store]
        Firebase[Firebase SDK]
    end
    
    Services --> Gemini
    Services --> PDF
    Services --> PatientSvc
    Services --> StorageSvc
    
    PatientSvc -->|Se Configurado| Firebase
    PatientSvc -->|Fallback| MemStore
    
    Gemini -->|API Call| GoogleCloud[Google Gemini API]
```

## 1. Core Concepts

### A. App Shell & Roteamento
A aplicação não usa `react-router`. O roteamento é gerenciado pelo estado `currentView` em `App.tsx`.
*   **Sidebar:** Navegação persistente à esquerda.
*   **Views:** `PatientList` (Dashboard) ou `WorkspaceLayout` (Editor).

### B. Session Context (`SessionContext.tsx`)
Quando um paciente é aberto, seus dados são carregados em memória no `SessionContext`.
*   **Hydration:** Ao montar o Workspace, o `useEffect` busca os dados no `PatientService` e dispara `RESTORE_SESSION`.
*   **Auto-Save:** O hook `usePersistence` monitora mudanças no `session` e salva no Firestore a cada 2 segundos (debounce).

### C. Pipeline de Processamento (`usePipeline.ts`)
O coração da automação. Uma fila assíncrona que processa itens sequencialmente para não sobrecarregar o navegador ou a API.
*   **Tipos de Tarefa:** `header` (Intake), `doc` (OCR/Classificação), `audio` (Transcrição), `group_analysis` (Inteligência Clínica).
*   **Lógica de Grupo:** O pipeline monitora quando todas as páginas de um exame estão prontas e dispara automaticamente uma "Análise Unificada" para gerar o laudo estruturado.

## 2. Estratégia de Dados

### Entidades Principais
1.  **Patient:** Registro leve (ID, Nome, OS, Status) usado na listagem.
2.  **AppSession (Workspace):** Payload pesado contendo todos os documentos, textos OCR e vetores da sessão de trabalho.

### Persistência Híbrida
O sistema foi desenhado para ser "Cloud-Native" mas "Local-First" em dev.
*   **Interface Abstrata:** `PatientService` e `StorageService` decidem onde salvar.
*   **Modo Online:** Usa `Firestore` (NoSQL) e `Firebase Storage` (Blob).
*   **Modo Offline:** Usa Arrays em memória e `URL.createObjectURL`. Isso permite testar a UI completa sem internet/backend configurado.

### Soft Delete
Registros nunca são apagados fisicamente de imediato. Usamos `deletedAt: timestamp` para permitir lixeiras ou auditoria futura.

## 3. Design Patterns Utilizados

*   **Optimistic UI:** Ao fazer upload, a imagem aparece imediatamente (blob local) antes mesmo do upload para a nuvem terminar.
*   **Singleton:** `getGeminiClient()` garante apenas uma instância do SDK.
*   **Adapter Pattern:** `src/adapters/` isola a lógica de prompts e schemas do resto da aplicação. Se trocarmos o Gemini pelo GPT-4, só mudamos essa pasta.
*   **Resilient Parsing:** Uso de `zod.preprocess` para limpar JSONs sujos retornados pela IA antes da validação estrita.

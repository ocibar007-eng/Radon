
# Estrutura do Projeto

```
/
├── public/              # Assets estáticos
├── src/
│   ├── adapters/        # Camada de tradução (App <-> IA)
│   │   ├── gemini/      # Prompts brutos
│   │   ├── schemas.ts   # Validação Zod (Output Parsers)
│   │   └── gemini-prompts.ts # Funções de alto nível
│   │
│   ├── app/             # Ponto de entrada React (App.tsx)
│   │
│   ├── components/      # UI Components (Presentational)
│   │   ├── ui/          # Componentes base (Button, Card, Modal)
│   │   └── ...          # Componentes de negócio (PatientList, Sidebar)
│   │
│   ├── context/         # React Contexts
│   │   └── SessionContext.tsx # Estado global do Workspace
│   │
│   ├── core/            # Configurações Singleton
│   │   ├── config.ts    # Constantes
│   │   ├── firebase.ts  # Inicialização do Firebase
│   │   └── gemini.ts    # Cliente Gemini SDK
│   │
│   ├── features/        # Módulos de Funcionalidade
│   │   ├── audio/       # Gravador e Painel de Transcrições
│   │   ├── clinical/    # Aba de Resumo Clínico
│   │   ├── intake/      # Galeria de Uploads e Header
│   │   └── reports/     # Visualização de Laudos Prévios
│   │
│   ├── hooks/           # Lógica React Reutilizável
│   │   ├── usePatients.ts    # CRUD de Pacientes
│   │   ├── usePersistence.ts # Auto-save
│   │   └── usePipeline.ts    # Fila de processamento de IA
│   │
│   ├── services/        # Camada de Dados (Agnóstica de React)
│   │   ├── patient-service.ts # Firestore Logic
│   │   └── storage-service.ts # Storage/Upload Logic
│   │
│   ├── styles/          # CSS Modules
│   │   ├── design-tokens.css # Variáveis Globais
│   │   └── ...
│   │
│   ├── types/           # Definições TypeScript (Interfaces)
│   │
│   └── utils/           # Helpers Puros
│       ├── grouping.ts  # Lógica de agrupamento de laudos
│       ├── json.ts      # Parser seguro
│       ├── pdf.ts       # Conversor PDF -> Imagem
│       └── retry.ts     # Exponential Backoff
│
└── docs/                # Esta documentação
```

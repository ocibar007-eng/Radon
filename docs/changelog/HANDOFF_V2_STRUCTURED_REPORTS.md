
# Handoff V2: Laudos Estruturados e UI Unificada

**Data:** 25/05/2024
**Status:** Implementado
**Foco:** Melhoria visual dos Laudos Prévios, Estruturação de dados por Órgãos via IA e Galeria de Imagens.

---

## 1. Visão Geral

O objetivo desta atualização foi transformar a visualização de "Laudos Prévios". Anteriormente, eram exibidos como textos corridos ou carrosséis de imagens simples. Agora:

1.  **Visual Unificado:** Páginas de um mesmo PDF/Exame são concatenadas em uma única visualização de leitura contínua.
2.  **Estruturação Inteligente:** O Gemini agora extrai achados e os organiza por **Estrutura/Órgão** (ex: Fígado, Pâncreas, Rins), facilitando a comparação evolutiva.
3.  **Galeria Modal:** Visualização de imagens originais com navegação (Anterior/Próximo) via teclado ou botões.

---

## 2. Mudanças na Arquitetura de Dados

### Tipos (`src/types/index.ts`)

Adicionamos interfaces para suportar a resposta estruturada do LLM.

```typescript
export interface StructuredFinding {
  estrutura: string; // ex: "Fígado"
  achados_literais_em_topicos: string[]; // Texto verbatim formatado
  pontos_de_comparacao: string[]; // Dicas para o médico no follow-up
}

export interface StructuredReportBody {
  tipo_exame_detectado: string;
  data_exame_detectada: string;
  indicacao_clinica: string;
  tecnica: string;
  achados_por_estrutura: StructuredFinding[];
  linfonodos?: {
    achados_literais_em_topicos: string[];
    pontos_de_comparacao: string[];
  };
  impressao_diagnostica_ou_conclusao_literal: string;
  alertas_de_fidelidade: string[]; // Avisos se a IA achou o texto ambíguo
}

// Atualização no ReportAnalysis para incluir o campo structured
export interface ReportAnalysis {
  report_metadata: ReportMetadata;
  preview: ReportPreview;
  structured?: StructuredReportBody; // <--- NOVO
  possible_duplicate: { ... };
}
```

### Schemas Zod (`src/adapters/schemas.ts`)

Garantia de tipo em tempo de execução para o JSON retornado pelo Gemini.

```typescript
const StructuredFindingSchema = z.object({
  estrutura: z.string(),
  achados_literais_em_topicos: z.array(z.string()).default([]),
  pontos_de_comparacao: z.array(z.string()).default([])
});

const StructuredReportBodySchema = z.object({
  // ... campos simples (indicação, técnica)
  achados_por_estrutura: z.array(StructuredFindingSchema).default([]),
  impressao_diagnostica_ou_conclusao_literal: z.string().default(''),
  alertas_de_fidelidade: z.array(z.string()).default([])
});
```

---

## 3. Engenharia de Prompt (`src/adapters/gemini/prompts.ts`)

O prompt `report_structured_analysis` foi reescrito para instruir o modelo a agir como um analista que estrutura texto livre em JSON.

**Destaques do Prompt:**
- **Fidelidade:** Proíbe invenção de dados ("não descrito").
- **Negrito:** Solicita que medidas (cm, mm) venham destacadas entre `***` ou `**`.
- **Segmentação:** Cria arrays de strings para cada órgão encontrado.

```typescript
report_structured_analysis: `
Você é um analista de laudos radiológicos. Sua tarefa é ler o TEXTO VERBATIM e gerar um RESUMO ESTRUTURADO POR ÓRGÃOS.

REGRAS CRÍTICAS:
1) NÃO inventar achados.
2) Preservar medidas e números exatamente como aparecem, destacando-os em ***negrito***.
3) Se houver "IMPRESSÃO DIAGNÓSTICA", extraia integralmente.

SAÍDA JSON ESPERADA:
{
  "report_metadata": { ... },
  "structured": {
    "achados_por_estrutura": [
      {
        "estrutura": "Fígado",
        "achados_literais_em_topicos": ["Dimensões aumentadas...", "Nódulo em segmento VI medindo ***2.0 cm***"],
        "pontos_de_comparacao": ["Monitorar dimensões do nódulo"]
      }
    ],
    ...
  }
}
`
```

---

## 4. Interface de Usuário (UI)

### Componente `ReportGroupCard` (`src/features/reports/ReportGroupCard.tsx`)

Este componente foi completamente refatorado para:
1.  **Renderização Condicional:** Se houver dados estruturados (`doc.detailedAnalysis.structured`), renderiza o layout de grid por órgãos. Caso contrário, faz fallback para o resumo simples.
2.  **Unificação de Texto:** Usa `useMemo` para concatenar o texto verbatim de todas as páginas do grupo (`fullReportText`).
3.  **Segurança:** Uso intensivo de *Optional Chaining* (`?.`) para evitar telas brancas se o JSON da IA vier parcial.

**Trecho de Renderização Estruturada:**

```tsx
const renderStructuredFindings = (data: StructuredReportBody) => {
  return (
    <div className="structured-report-container">
       <div className="sr-organs-grid">
         {data.achados_por_estrutura?.map((item, idx) => (
           <div key={idx} className="sr-organ-card">
             <h5 className="sr-organ-title">{item.estrutura}</h5>
             <ul className="sr-findings-list">
               {item.achados_literais_em_topicos?.map((finding, fIdx) => (
                 <li key={fIdx} dangerouslySetInnerHTML={{ __html: formatBold(finding) }} />
               ))}
             </ul>
           </div>
         ))}
       </div>
       {/* ... Conclusão e Alertas ... */}
    </div>
  );
};
```

### Modal com Galeria (`src/components/ui/Modal.tsx`)

O modal agora aceita props de navegação:

```tsx
interface ModalProps {
  // ...
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}
```

E implementa *listeners* de teclado (`ArrowLeft`, `ArrowRight`) para navegação fluida entre as páginas do laudo original.

### Gerenciamento de Estado (`src/app/App.tsx`)

O estado da galeria foi elevado para o `App.tsx` para permitir que qualquer card abra o modal global.

```tsx
const [galleryState, setGalleryState] = useState<{ docs: AttachmentDoc[], index: number } | null>(null);

const nextImage = () => galleryState && hasNext && setGalleryState({ ...galleryState, index: galleryState.index + 1 });
// ...
```

---

## 5. Estilização (`src/styles/documents.css`)

Novas classes CSS foram criadas para suportar o design system "Médico/Dark Mode".

- `.structured-report-container`: Container flex vertical.
- `.sr-organ-card`: Cards individuais para cada órgão (Fígado, Rins, etc.), com borda sutil e hover effect.
- `.sr-conclusion-box`: Caixa de destaque com borda laranja (`var(--accent-primary)`) para a conclusão do laudo.
- `.rcu-verbatim-box`: Área de texto preta (monospaced) para leitura do texto original completo.

---

## 6. Como Testar / Validar

1.  **Upload:** Faça upload de um PDF de laudo (ex: TC Abdomen).
2.  **Processamento:** Aguarde a análise do Gemini (status "Done").
3.  **Visualização:**
    - Vá na aba "Laudos Prévios".
    - Verifique se o card expande mostrando os órgãos separadamente (ex: Fígado, Pâncreas).
    - Verifique se as medidas estão em **negrito**.
4.  **Interação:**
    - Clique em "Ver Original" para abrir o Modal.
    - Use as setas do teclado para navegar entre as páginas (se o PDF tiver >1 página).
    - Clique em "Copiar" e verifique se o texto integral foi para a área de transferência.

---

**Arquivos Modificados:**
- `src/app/App.tsx`
- `src/types/index.ts`
- `src/adapters/schemas.ts`
- `src/adapters/gemini-prompts.ts`
- `src/adapters/gemini/prompts.ts`
- `src/features/reports/ReportGroupCard.tsx`
- `src/features/reports/PreviousReportsTab.tsx`
- `src/components/ui/Modal.tsx`
- `src/styles/documents.css`
- `src/styles/components.css`

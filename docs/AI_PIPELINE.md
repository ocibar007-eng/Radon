
# AI Pipeline & Engenharia de Prompts

O diferencial deste projeto não é apenas "chamar uma API", mas como orquestramos múltiplos chamados para criar consistência.

## O Pipeline (`usePipeline.ts`)

O processamento ocorre em 3 estágios:

### Estágio 1: Ingestão e OCR (Individual)
Cada arquivo (imagem ou página de PDF) entra na fila como um item `doc`.
*   **Prompt:** `doc_classify_extract`
*   **Objetivo:** Extrair texto *Verbatim* (ipsis litteris) e tentar classificar o documento (`assistencial`, `laudo_previo`).
*   **Falha Comum:** A IA às vezes classifica páginas de "Conclusão" (pouco texto) como `indeterminado`.
*   **Solução (Heurística):** O código pós-processamento verifica palavras-chave (`CRM`, `CONCLUSÃO`, `MEDINDO`) no texto bruto. Se encontrar, força a reclassificação para `laudo_previo` e marca como `isRecoveredBySystem`.

### Estágio 2: Agrupamento Lógico
O sistema não confia apenas na IA para agrupar.
*   **Algoritmo:** `src/utils/grouping.ts`
*   **Lógica:** Agrupa por:
    1.  Origem do arquivo (PDFs multipáginas ficam juntos).
    2.  `report_group_hint` (Dica da IA): Se a IA identificar "Protocolo 123" em duas fotos separadas, elas são unidas.
    3.  **Split Manual:** O usuário pode "cortar" um laudo ao meio na UI. Isso gera um hint `MANUAL_SPLIT` que o agrupador respeita.

### Estágio 3: Inteligência Clínica (Unificada)
Quando um grupo de documentos (ex: 3 páginas de uma RM de Crânio) está pronto:
*   **Trigger:** O pipeline detecta que o grupo está estável.
*   **Prompt:** `report_structured_analysis`
*   **Ação:** Envia o texto concatenado de todas as páginas.
*   **Saída:** Um JSON estruturado contendo:
    *   Metadados (Data real do exame, não a de impressão).
    *   Achados anatômicos separados por órgão (Fígado, Rins, etc.).
    *   Alertas de fidelidade (se o texto parece cortado).

## Catálogo de Prompts (`src/adapters/gemini/prompts.ts`)

| Key | Descrição | Estratégia |
|-----|-----------|------------|
| `header_ocr` | Lê o cabeçalho/etiqueta | Foco extremo em datas (DD/MM/YYYY) e conversão para ISO. |
| `doc_classify_extract` | OCR + Classificação | Solicita texto *verbatim* e um "Hint" determinístico para agrupamento. |
| `report_structured_analysis` | Estrutura laudos prévios | Pede para não alucinar e manter medidas (cm/mm) em negrito. |
| `clinical_summary_structured` | Resumo do prontuário | Ignora laudos, foca em pedidos médicos e histórico. |

## Schemas e Validação (`src/adapters/schemas.ts`)

Utilizamos **Zod** para tipagem forte da saída da IA.
Para evitar que a aplicação quebre se a IA retornar `Tipo: "RX"` em vez de `tipo: "rx"`, usamos `z.preprocess`:

```typescript
const OrigemSchema = z.preprocess(
  (val) => {
    // Normaliza input sujo da IA antes de validar
    const v = String(val).toLowerCase();
    if (v.includes('sabin')) return 'interno_sabin';
    return 'externo';
  },
  z.enum(['interno_sabin', 'externo'])
);
```

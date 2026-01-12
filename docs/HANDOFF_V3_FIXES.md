
# Handoff V3: Robustez na Classificação e Agrupamento

**Data:** 25/05/2024
**Contexto:** Correção de falhas onde páginas finais de laudos (apenas assinatura/conclusão) eram descartadas e títulos apareciam como "Não Identificado".

---

## 1. Definição do Problema

### A. O Problema da "Página 2" (Classificação Indeterminada)
**Sintoma:** Ao processar um laudo de 2 páginas, a página 1 (cabeçalho + corpo) era classificada corretamente, mas a página 2 (Conclusão + Assinatura + CRM) era classificada como `indeterminado` pela IA, pois continha pouco texto.
**Impacto:** O sistema descartava a conclusão do exame, perdendo a parte mais importante.

### B. O Problema do "Não Identificado" (Validação Estrita)
**Sintoma:** O card do exame exibia "Não identificado" ou "Data N/A" mesmo quando o OCR lia os dados.
**Causa:** O Schema de validação (Zod) esperava enums estritos (ex: `externo` minúsculo). Se a IA retornasse `Externo` (maiúsculo) ou `Sabin Diagnostico` (sem acento), o Zod falhava e descartava todo o metadado.

### C. Contagem de Exames vs Páginas
**Sintoma:** O contador mostrava "2 laudos prévios" quando na verdade havia 1 exame de 2 páginas.
**Causa:** A UI contava arquivos brutos (`AttachmentDoc`), não grupos lógicos (`ReportGroup`).

---

## 2. Soluções Implementadas

### Solução A: Heurística de Fallback (Fail-Safe)
Implementamos uma camada de lógica no código (`src/adapters/gemini-prompts.ts`) que roda **após** a resposta da IA.
Se a IA disser "Indeterminado", nós escaneamos o texto bruto procurando palavras-chave de alta relevância médica (`CRM`, `CONCLUSÃO`, `IMPRESSÃO DIAGNÓSTICA`). Se encontrarmos, **forçamos** a classificação para `laudo_previo`.

### Solução B: Schemas Zod Relaxados (`z.preprocess`)
Alteramos `src/adapters/schemas.ts` para usar `z.preprocess`. Antes de validar, normalizamos a entrada (lowercase, trim). Isso torna o sistema resiliente a variações de resposta da IA (`Alta` vs `alta`, `Sabin` vs `interno_sabin`).

### Solução C: Agrupamento Inteligente
Refinamos `src/utils/grouping.ts` para usar o `reportGroupHint` fornecido pela IA. Isso permite distinguir dois exames diferentes (ex: RX Torax e RM Cranio) mesmo que venham no mesmo upload, ou agrupar páginas soltas.

---

## 3. Código Fonte Crítico (Contexto para IA)

*Copie os blocos abaixo para fornecer contexto técnico a uma nova instância de IA.*

### Arquivo 1: Lógica de Classificação e Heurística (`src/adapters/gemini-prompts.ts`)

```typescript
// ... imports
export async function analyzeDocument(imageFile: File | Blob): Promise<{classification: DocClassification, verbatimText: string, reportGroupHint: string, summary: string}> {
  // ... chamada ao Gemini ...
  
  // 1. Confiança primária na IA
  if (result.classification === 'assistencial' || result.classification === 'laudo_previo') {
    classification = result.classification as DocClassification;
  }
  
  // 2. HEURÍSTICA DE CORREÇÃO (Fail-Safe)
  // Resolve o problema da Página 2 (Conclusão + Assinatura) ser descartada.
  if (classification === 'indeterminado' && result.texto_verbatim) {
      const upper = result.texto_verbatim.toUpperCase();
      const keywords = [
          'IMPRESSÃO DIAGNÓSTICA', 'CONCLUSÃO', 'CRM', 'ASSINADO DIGITALMENTE', 
          'RADIOLOGISTA', 'MEDINDO', 'CM', 'MM'
      ];
      
      const hasKeywords = keywords.some(k => upper.includes(k));
      if (hasKeywords && upper.length > 50) { 
          console.log("⚠️ Heurística de Correção: Reclassificando para 'laudo_previo'.");
          classification = 'laudo_previo';
      }
  }
  
  return { classification, ... };
}
```

### Arquivo 2: Validação Resiliente (`src/adapters/schemas.ts`)

```typescript
import { z } from 'zod';

// Helper de Enum Resiliente
const ConfiancaSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'baixa';
    const v = val.toLowerCase();
    if (v.includes('alta')) return 'alta';
    if (v.includes('media')) return 'media';
    return 'baixa';
  },
  z.enum(['baixa', 'media', 'alta'])
);

const OrigemSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return 'externo';
    const v = val.toLowerCase();
    if (v.includes('sabin') || v.includes('interno')) return 'interno_sabin';
    return 'externo';
  },
  z.enum(['interno_sabin', 'externo'])
);

export const ReportAnalysisSchema = z.object({
  report_metadata: z.object({
    tipo_exame: z.string().default(''), // Aceita qualquer string, não quebra se vier "RX" ou "Raio-X"
    origem: OrigemSchema, // Normaliza input
    // ...
  }),
  // ...
});
```

### Arquivo 3: Lógica de Agrupamento (`src/utils/grouping.ts`)

```typescript
export function groupDocsVisuals(docs: AttachmentDoc[]): ReportGroup[] {
  const groups = new Map<string, AttachmentDoc[]>();
  
  docs.forEach(doc => {
    const hint = doc.reportGroupHint || 'default';

    // Lógica 1: PDF Split (Nome do arquivo + Hint da IA)
    if (doc.source.includes('PDF Pg')) {
      const baseName = doc.source.split(' PDF Pg ')[0]; 
      const key = `pdf::${baseName}::${hint}`; // Agrupa por arquivo E tipo detectado
      // ...
    } 
    // Lógica 2: Hint puro (Imagens soltas)
    else if (doc.reportGroupHint && doc.reportGroupHint.length > 3) {
      const key = `hint::${doc.reportGroupHint}`;
      // ...
    }
    // Lógica 3: Avulso
    else {
      const key = `single::${doc.id}`;
      // ...
    }
  });
  // ... Retorna array de grupos
}
```

---

## 4. Próximos Passos Sugeridos

1.  **Refinar o Prompt de Hint**: Melhorar a capacidade do Gemini de gerar um `report_group_hint` consistente entre páginas do mesmo laudo (ex: sempre extrair o "Protocolo" ou "OS").
2.  **Feedback Visual**: Mostrar ao usuário quando a heurística de correção foi ativada (ex: um ícone de "Auto-Corrigido" no card).

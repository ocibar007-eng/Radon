# Handoff: Sistema de Abas Multi-Documento

**Data:** 2026-01-17  
**Status:** NÃO IMPLEMENTADO (tentativas causaram tela preta)  
**Prioridade:** Alta

---

## Objetivo

Implementar um sistema de **abas horizontais** dentro do `ReportGroupCard` para navegar entre diferentes tipos de documento quando um PDF contém múltiplos tipos (Laudo + Pedido + Guia + Questionário + Termo).

### Design Aprovado pelo Usuário

![Mockup das Abas](/Users/lucasdonizetecamargos/.gemini/antigravity/brain/717d86e0-c8f7-47a0-a11c-9f3f74c59379/tabs_design_mockup_1768675059278.png)

- Barra de abas no topo: `Laudo | Pedido | Guia | Quest. | Termo`
- Aba ativa destacada em âmbar/dourado
- Conteúdo dinâmico abaixo que muda conforme a aba selecionada
- Chips coloridos indicando tipo de documento

---

## Arquitetura Atual

### Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `src/utils/grouping.ts` | Agrupa documentos em `ReportGroup[]` |
| `src/features/reports/ReportGroupCard.tsx` | Renderiza cada grupo como card |
| `src/components/MultiDocumentTabs.tsx` | Componente de abas (já existe!) |

### Fluxo Atual

1. Upload de PDF → Cada página vira um `AttachmentDoc`
2. `groupDocsVisuals()` agrupa docs por **PDF + hint/classificação**
3. Resultado: Cada tipo vai para um **grupo separado** (Laudo = 1 grupo, Pedido = outro grupo)
4. `ReportGroupCard` renderiza cada grupo como um card independente

### Problema Central

O agrupamento atual usa a chave:
```typescript
const key = `pdf::${baseName}::${normalizedHint}`;
```

O `normalizedHint` é baseado na classificação do documento. Portanto:
- Laudo Prévio → `pdf::arquivo.pdf::laudo_previo`
- Pedido Médico → `pdf::arquivo.pdf::pedido_medico`
- Guia → `pdf::arquivo.pdf::guia_autorizacao`

**Resultado:** 3 grupos separados em vez de 1 grupo com abas.

---

## Solução Proposta

### Opção A: Mudar o Agrupamento (TENTADO - CAUSOU CRASH)

Remover o hint da chave de agrupamento:
```typescript
// ANTES
const key = `pdf::${baseName}::${normalizedHint}`;

// DEPOIS
const key = `pdf::${baseName}`;
```

**Problema:** Causou tela preta. Possivelmente porque:
1. O `useReportDisplay` hook ou outros componentes esperam grupos homogêneos
2. A lógica de `unifiedDoc` no `ReportGroupCard` falha com docs de tipos misturados
3. Algum render condicional quebra com a mudança

### Opção B: Agrupar no Nível de UI (ALTERNATIVA)

Manter o agrupamento atual, mas criar uma **camada de apresentação** que:
1. Detecta grupos que vêm do mesmo PDF (por `baseName`)
2. Junta esses grupos em um "super-grupo" visual
3. Renderiza com abas

Localização sugerida: `WorkspaceLayout.tsx` linha ~342

```typescript
// Agrupar ReportGroups que vêm do mesmo PDF para exibir como abas
const groupedByPdf = useMemo(() => {
  const pdfMap = new Map<string, ReportGroup[]>();
  
  reportGroups.forEach(group => {
    const baseName = extractPdfBaseName(group.id); // ex: "pdf::arquivo.pdf::tipo" → "arquivo.pdf"
    if (baseName) {
      const list = pdfMap.get(baseName) || [];
      list.push(group);
      pdfMap.set(baseName, list);
    }
  });
  
  return pdfMap;
}, [reportGroups]);
```

---

## Componente Existente: MultiDocumentTabs

O componente já existe e funciona! Localização: `src/components/MultiDocumentTabs.tsx`

### Props
```typescript
interface Props {
  docs: AttachmentDoc[];
  renderLaudoContent: (doc: AttachmentDoc) => React.ReactNode;
}
```

### Features
- Ordena docs por tipo (TAB_ORDER)
- Renderiza templates específicos por classificação
- Suporta: pedido_medico, guia_autorizacao, termo_consentimento, questionario, laudo_previo

### Condição Atual de Uso (ReportGroupCard.tsx:337)
```typescript
const hasAdaptive = docTypes.some(t => ['pedido_medico', 'guia_autorizacao', 'termo_consentimento', 'questionario'].includes(t));
const hasLaudo = docTypes.includes('laudo_previo');

if (hasAdaptive && hasLaudo) {
  // Renderiza MultiDocumentTabs
}
```

**Problema:** Esta condição NUNCA é satisfeita porque os docs de tipos diferentes nunca ficam no mesmo grupo!

---

## Debugging: Por que dá Tela Preta

Quando alterei o agrupamento para manter todos juntos:

1. O hook `useReportDisplay(group)` espera docs do mesmo tipo
2. `unifiedDoc` é calculado assumindo grupo homogêneo
3. `structuredData` e `meta` podem não existir para docs misturados
4. Render falha com "An error occurred in WorkspaceLayout"

### Para Debugar

1. Adicionar error boundary em `WorkspaceLayout`
2. Verificar `useReportDisplay.ts` para entender premissas
3. Verificar se `MultiDocumentTabs` lida corretamente com grupos misturados
4. Testar com console.log antes de renders condicionais

---

## Recomendação de Implementação

### Abordagem Segura

1. **NÃO alterar** `grouping.ts`
2. Criar novo componente `PdfDocumentBundle.tsx` que:
   - Recebe múltiplos `ReportGroup[]` do mesmo PDF
   - Renderiza tabs para alternar entre os grupos
   - Cada aba usa o `ReportGroupCard` existente internamente

3. Em `WorkspaceLayout.tsx`, após `reportGroups`:
   ```typescript
   // Detectar grupos do mesmo PDF
   const pdfBundles = groupReportsByPdf(reportGroups);
   
   // Renderizar bundles (com tabs) ou grupos solo
   {pdfBundles.map(bundle => 
     bundle.groups.length > 1 
       ? <PdfDocumentBundle groups={bundle.groups} />
       : <ReportGroupCard group={bundle.groups[0]} />
   )}
   ```

### Arquivos a Verificar

| Arquivo | Verificar |
|---------|-----------|
| `useReportDisplay.ts` | Premissas sobre docs homogêneos |
| `ReportGroupCard.tsx` | Lógica de unifiedDoc |
| `MultiDocumentTabs.tsx` | Se lida com grupos misturados |
| `WorkspaceLayout.tsx` | Onde renderiza reportGroups |

---

## Código Revertido

Ambos arquivos foram restaurados para versão funcional:

- `grouping.ts` - Linha 61-72: Agrupamento por PDF + hint
- `ReportGroupCard.tsx` - Linha 328-360: Condição hasAdaptive && hasLaudo

---

## Contexto Adicional

### Tipos de Documento Suportados
```typescript
type DocClassification = 
  | 'laudo_previo'
  | 'pedido_medico'
  | 'guia_autorizacao'
  | 'termo_consentimento'
  | 'questionario'
  | 'assistencial'
  | 'administrativo'
  | 'outro'
  | 'pagina_vazia'
  | 'indeterminado';
```

### Estrutura de AttachmentDoc (relevante)
```typescript
interface AttachmentDoc {
  id: string;
  source: string;           // Ex: "arquivo.pdf Pg 1"
  classification: DocClassification;
  reportGroupHint?: string; // Usado para agrupar
  verbatimText?: string;
  extractedData?: any;
  // ...
}
```

### Formato do source
O campo `source` segue o padrão: `"nome_do_arquivo.pdf Pg X"`

Exemplo: `"larissa q exame.pdf Pg 1"`, `"larissa q exame.pdf Pg 2"`

---

## Resumo Executivo

**Problema:** PDFs com múltiplos tipos de documento aparecem como cards separados em vez de um card com abas.

**Causa Raiz:** Agrupamento separa por classificação.

**Solução Recomendada:** Criar camada de UI que agrupa cards do mesmo PDF e renderiza com abas, SEM alterar lógica de agrupamento core.

**Componente Existente:** `MultiDocumentTabs.tsx` já implementa as abas, só precisa ser usado corretamente.

**Risco:** Alterar `grouping.ts` diretamente causa crash porque outros componentes dependem de grupos homogêneos.

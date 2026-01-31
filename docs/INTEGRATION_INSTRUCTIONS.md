# Instruções para Integração no Pipeline

**Para:** IA do Pipeline (via Lucas)  
**De:** IA das Recomendações  
**Data:** 2026-01-31

---

## ✅ O que eu implementei

Criei dois arquivos na pasta `src/core/reportGeneration/`:

### 1. `agents/recommendations.ts` (RecommendationsAgent)
- Função principal: `runRecommendationsAgent(ctx, report)`
- Recebe: contexto do paciente + ReportJSON com findings
- Retorna: ReportJSON enriquecido com `recommendations[]` e `references[]`
- Segue todas as regras anti-alucinação

### 2. `recommendations-guard.ts` (RecommendationsGuard)
- Função: `validateRecommendations(recommendations, payloads)`
- Verifica que não há números inventados
- Sanitiza recomendações problemáticas

---

## 📝 O que você precisa fazer

### Passo 1: Importar no Orchestrator

No arquivo `src/core/reportGeneration/orchestrator.ts`, adicione:

```typescript
import { runRecommendationsAgent, AgentContext } from './agents/recommendations';
import { validateRecommendations } from './recommendations-guard';
```

### Passo 2: Chamar o Agent (após Compute, antes de Impression)

Na sequência de chamadas do orchestrator, adicione:

```typescript
// Após Compute e Comparison, antes de Impression:

// Construir contexto do paciente (adapte conforme seu código)
const recommendationsCtx: AgentContext = {
  patient_age: extractPatientAge(report), // sua função
  risk_category: extractRiskCategory(report), // sua função
  immunosuppressed: report.patient?.immunosuppressed ?? false,
  oncologic_context: report.clinical_context?.oncologic ?? false
};

// Chamar Recommendations Agent
report = await runRecommendationsAgent(recommendationsCtx, report);

// Opcional: Validar com Guard
const guardResult = validateRecommendations(
  report.recommendations || [],
  libraryPayloadsMap // você precisa manter esse map durante o processamento
);

if (!guardResult.valid) {
  console.warn("Recommendations Guard violations:", guardResult.violations);
  report.recommendations = guardResult.sanitized_recommendations;
}

// Continuar para Impression Agent...
```

### Passo 3: Modificar o Impression Agent

O Impression Agent agora recebe `report.recommendations` já preenchido. Ele deve:

1. **NÃO inventar recomendações** - só usar o que está em `report.recommendations`
2. Inserir o texto das recomendações na conclusão
3. Respeitar o campo `conditional` para saber se precisa de ressalvas

Exemplo de lógica no prompt do Impression:

```
Se houver recomendações em report.recommendations, inclua-as na conclusão.
Use o texto EXATAMENTE como está em recommendation.text.
Se recommendation.conditional === true, mantenha a linguagem condicional.
NÃO adicione números ou intervalos que não estejam no texto original.
```

### Passo 4: Modificar o Renderer

No arquivo `src/core/reportGeneration/renderer.ts`, adicione ao final:

```typescript
// Após renderizar o laudo normal, adicionar referências:

if (report.references && report.references.length > 0) {
  // Deduplicate by key
  const uniqueRefs = Array.from(
    new Map(report.references.map(r => [r.key, r])).values()
  );
  
  markdown += '\n\n## REFERÊNCIAS\n\n';
  
  uniqueRefs.forEach((ref, index) => {
    markdown += `${index + 1}. ${ref.citation}\n`;
  });
}
```

---

## 🧪 Como testar

1. Rode um caso com nódulo pulmonar 8mm
2. Verifique que aparece recomendação do Fleischner
3. Verifique que a citação aparece em REFERÊNCIAS
4. Verifique que não há números inventados

---

## ⚠️ Regras que você DEVE respeitar

| Situação | Comportamento |
|----------|---------------|
| `recommendations` vazio | Não inventar nada |
| `conditional === true` | Manter texto condicional |
| Número não está no `text` | Não adicionar |
| `references` vazio | Não criar seção REFERÊNCIAS |

---

## Exemplo de ReportJSON após o Agent

```json
{
  "findings": [...],
  "recommendations": [
    {
      "finding_type": "pulmonary_nodule",
      "text": "CT at 6-12 months; then consider CT at 18-24 months",
      "applicability": "Adultos, não-imunossuprimidos",
      "conditional": false,
      "guideline_id": "FLEISCHNER_2017",
      "reference_key": "FLEISCHNER_2017"
    }
  ],
  "references": [
    {
      "key": "FLEISCHNER_2017",
      "citation": "MacMahon H, et al. Guidelines for Management of Incidental Pulmonary Nodules. Radiology. 2017;284(1):228-243."
    }
  ]
}
```

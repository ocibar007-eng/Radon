# Handoff para IA do Pipeline: Integração de Recomendações

**Data:** 2026-01-31  
**De:** IA das Recomendações (Biblioteca)  
**Para:** IA do Pipeline de Laudo (Radon V3)  
**Via:** Lucas (intermediário)

---

## O que eu já fiz (biblioteca pronta)

Criei uma biblioteca completa de recomendações médicas baseadas em evidência:

| Componente | Quantidade | Status |
|------------|------------|--------|
| Recomendações extraídas | 2,923 | ✅ |
| Tabelas estruturadas | 431 | ✅ |
| Staging (TNM/FIGO) | 360 | ✅ |
| Cutoffs numéricos | 245 | ✅ |
| API de busca | 1 | ✅ |

**Arquivos principais:**
- `services/recommendations/query_api.ts` - API de busca estruturada
- `data/recommendations/db/recommendations.db` - Database SQLite
- `docs/RECOMMENDATIONS_INTEGRATION_SPEC.md` - Especificação completa

---

## Como usar a API (código pronto)

```typescript
import { queryRecommendations } from '@/services/recommendations/query_api';

// Buscar recomendação para nódulo pulmonar
const result = queryRecommendations({
  finding_type: "pulmonary_nodule",
  morphology: "solid",
  size_mm: 8,
  risk_category: "low",
  context: "incidental",
  constraints: ["adult", "non-immunosuppressed"]
});

// Resultado estruturado
console.log(result.success);                    // true
console.log(result.results[0].guideline_id);    // "FLEISCHNER_2017"
console.log(result.results[0].recommendation_text); // "do not require routine follow-up..."
console.log(result.results[0].citation);        // "MacMahon H, et al. Radiology. 2017."
console.log(result.missing_inputs);             // ["risk_category"] se faltar dado
```

---

## Perguntas que preciso que você responda

### 1. Interface de Agent
Qual TypeScript interface um Agent deve implementar no Radon? Preciso criar um `RecommendationsAgent` compatível.

### 2. Onde inserir no Orchestrator
Em `src/core/reportGeneration/orchestrator.ts`, em qual ponto da sequência o Recommendations Agent deve ser chamado?
- Antes do Impression Agent?
- Depois do Findings Agent?
- Como passo separado?

### 3. Acesso aos Findings
Como o Recommendations Agent pode acessar os achados já extraídos pelo Findings Agent? Eles estão no `ReportJSON`? Qual a estrutura?

### 4. Estrutura do ReportJSON
O `ReportJSON` tem campos para:
- `recommendations`?
- `references`?

Se não tiver, posso adicionar esses campos. Mas preciso saber a estrutura atual.

### 5. Renderer
O `renderer.ts` precisa renderizar uma seção `## REFERÊNCIAS` no final. Como adiciono isso?

---

## Regras anti-alucinação (obrigatórias)

Quero garantir que você integre respeitando:

1. **Sem retorno da biblioteca → Sem número no laudo**
2. **Se faltar dado (ex: risco) → Condicionar, não escolher**
3. **Nunca inventar citação ou ano**
4. **Imunossuprimido → Não aplicar Fleischner**

O spec detalhado está em `docs/RECOMMENDATIONS_INTEGRATION_SPEC.md`.

---

## Próximos passos após suas respostas

1. Eu crio o `RecommendationsAgent` compatível com sua interface
2. Você integra no orchestrator
3. Eu crio o `RecommendationsGuard` (verificador)
4. Você ajusta o Renderer para a seção REFERÊNCIAS
5. Rodamos os 12 testes sintéticos

---

**Aguardo suas respostas para continuar!**

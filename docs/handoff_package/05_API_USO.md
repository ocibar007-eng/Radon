# Como Usar a API de Busca de Recomendações

## Importação

```typescript
import { 
  queryRecommendations, 
  queryPulmonaryNodule,
  queryHepaticLesion,
  queryRenalCyst 
} from '@/services/recommendations/query_api';
```

---

## Uso Básico

### Query Genérica

```typescript
const result = queryRecommendations({
  finding_type: "pulmonary_nodule",   // OBRIGATÓRIO
  morphology: "solid",                 // opcional
  size_mm: 8,                          // opcional
  count: "single",                     // opcional
  patient_age: 55,                     // opcional
  risk_category: "low",                // "low" | "high" | "unknown"
  context: "incidental",               // "incidental" | "symptomatic" | "oncologic"
  constraints: ["adult", "non-immunosuppressed"]  // opcional
});
```

### Resultado

```typescript
interface QueryResponse {
  success: boolean;              // true se encontrou algo
  query: QueryParams;            // query original
  results: RecommendationResult[];  // array ordenado por score
  warnings: string[];            // avisos (ex: "dado faltante")
  missing_inputs: string[];      // inputs que faltam
}
```

---

## Funções de Conveniência

### Nódulo Pulmonar (Fleischner)

```typescript
const result = queryPulmonaryNodule(
  8,           // size_mm
  "solid",     // morphology: "solid" | "subsolid" | "ground-glass"
  "single",    // count: "single" | "multiple"
  "low"        // risk: "low" | "high" | "unknown"
);
```

### Lesão Hepática (LI-RADS)

```typescript
const result = queryHepaticLesion(
  20,          // size_mm
  "LR-4"       // liRadsCategory (opcional)
);
```

### Cisto Renal (Bosniak)

```typescript
const result = queryRenalCyst("IIF");  // bosniakCategory
```

---

## Estrutura do Resultado

```typescript
interface RecommendationResult {
  guideline_id: string;        // "FLEISCHNER_2017"
  source_id: string;           // ID do documento fonte
  finding_type: string;        // tipo de achado
  
  applicability: {
    age_group: "adult" | "pediatric" | "any";
    immunosuppressed_excluded: boolean;
    oncologic_context_required: boolean;
  };
  
  inputs_required: string[];   // ["size_mm", "risk_category"]
  recommendation_text: string; // texto pronto para usar
  numerical_rules: NumericalRule[];
  citation: string;            // citação formatada
  version_date: string;
  confidence: number;          // 0.0-1.0
  match_score: number;         // relevância da busca
}
```

---

## Exemplo Completo de Integração

```typescript
// No Recommendations Agent
async function getRecommendationForFinding(finding: Finding) {
  // 1. Normalizar achado
  const params = normalizeFindingToQuery(finding);
  
  // 2. Consultar biblioteca
  const result = queryRecommendations(params);
  
  // 3. Verificar se encontrou
  if (!result.success) {
    return {
      hasRecommendation: false,
      text: "Considerar correlação clínica.",
      reference: null
    };
  }
  
  // 4. Verificar inputs faltantes
  if (result.missing_inputs.length > 0) {
    return {
      hasRecommendation: true,
      conditional: true,
      text: `Conforme ${result.results[0].guideline_id}, a conduta depende de: ${result.missing_inputs.join(', ')}`,
      reference: result.results[0].citation
    };
  }
  
  // 5. Retornar recomendação
  const top = result.results[0];
  return {
    hasRecommendation: true,
    conditional: false,
    text: top.recommendation_text,
    reference: top.citation,
    applicability: top.applicability
  };
}
```

---

## Regras de Uso (CRÍTICO)

| ❌ Nunca faça | ✅ Sempre faça |
|---------------|----------------|
| Inventar número | Usar só o que veio da API |
| Inferir risco | Perguntar ou condicionar |
| Modificar citação | Copiar exatamente |
| Aplicar sem checar | Verificar applicability |

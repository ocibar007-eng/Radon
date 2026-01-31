---
description: Integra recomendações baseadas em evidência ao pipeline de laudo, com regras anti-alucinação
---

# Radon Recommendations Integrator

## Contexto

Este skill gerencia a integração do banco de recomendações (`recommendations.db`) com o pipeline de geração de laudo do Radon. O usuário NÃO é desenvolvedor e atua como **intermediário** entre esta IA e a IA responsável pelo pipeline principal.

## Regra Fundamental

> **"Recomendação só entra no laudo se for recuperada da biblioteca + aplicável ao caso"**

## Arquivos da Biblioteca (meu domínio)

```
data/recommendations/
├── db/recommendations.db          # SQLite com 2,923 recs + 431 tabelas + 360 staging + 245 cutoffs
├── sources/                       # PDFs originais
├── normalized_text/               # Texto OCR processado
└── reports/                       # Relatórios de progresso

services/recommendations/
├── query_api.ts                   # API de busca estruturada
├── table_extractor.ts             # Extrator de tabelas
├── llm_extractor.ts               # Extrator LLM principal
└── ...

scripts/recommendations/           # Scripts de batch processing
```

## Arquivos do Pipeline (domínio da OUTRA IA)

```
src/core/reportGeneration/
├── orchestrator.ts                # Orquestra todos os agentes
├── agents/
│   ├── findings.ts                # Gera achados
│   ├── impression.ts              # Gera impressão
│   └── ...
├── impression-guard.ts            # Valida impressões
└── renderer.ts                    # Converte para Markdown
```

## Workflow de Colaboração

### Quando EU (IA das recs) preciso de algo do pipeline:

1. Formulo a pergunta de forma clara
2. Usuário copia e cola para a outra IA
3. Outra IA responde
4. Usuário me passa a resposta

**Exemplo de pergunta para a outra IA:**
```
Para a IA do Pipeline Radon:

Preciso integrar o Recommendations Agent. Por favor me diga:
1. Qual é a assinatura esperada de um Agent? (interface/tipo)
2. Onde no orchestrator.ts devo inserir a chamada?
3. O ReportJSON tem campo para recommendations/references?
```

### Quando a OUTRA IA precisa de algo da biblioteca:

Use a API de busca:
```typescript
import { queryRecommendations } from '@/services/recommendations/query_api';

const result = queryRecommendations({
  finding_type: "pulmonary_nodule",
  morphology: "solid",
  size_mm: 8,
  risk_category: "low"
});

// result.results[0].recommendation_text -> texto pronto
// result.results[0].citation -> citação formatada
// result.missing_inputs -> dados faltantes
```

## Anti-Alucinação: Regras Duras

| Situação | Comportamento |
|----------|---------------|
| Sem retorno da biblioteca | → SEM número no laudo |
| Retorno mas falta variável | → Condicionar ("depende do risco") |
| Múltiplas diretrizes | → Preferir mais recente OU listar opções |
| Risco não informado | → É "desconhecido", nunca inferir |
| Paciente imunossuprimido | → NÃO aplicar Fleischner |

## Formato de Saída no Laudo

```markdown
## Impressão

[...texto normal...]

**Recomendação baseada em diretrizes:** Seguimento com TC de tórax em 6-12 meses.
*Aplicabilidade:* Adultos, achado incidental, baixo risco.

## Referências

1. MacMahon H, et al. Guidelines for Management of Incidental Pulmonary Nodules. Radiology. 2017.
```

## Checklist de Integração

- [x] Biblioteca de recomendações populada (2,923 recs)
- [x] API de busca estruturada criada
- [x] Especificação de integração documentada
- [ ] Recommendations Agent implementado (precisa info do pipeline)
- [ ] Guard de verificação implementado
- [ ] Testes dos 12 casos sintéticos
- [ ] Formatador de citações no Renderer

## Perguntas Pendentes para a Outra IA

1. **Interface de Agent:** Qual TypeScript interface um Agent deve implementar?
2. **ReportJSON schema:** Onde colocar recommendations e references?
3. **Ordem no orchestrator:** Recommendations vem antes ou depois do Impression?
4. **Acesso a achados:** Como o Recommendations Agent recebe os findings já extraídos?

## Documentos de Referência

- `docs/RECOMMENDATIONS_INTEGRATION_SPEC.md` - Especificação completa com 10 regras
- `docs/HANDOFF_FULL_2026-01-30.md` - Contexto do pipeline atual
- `data/recommendations/PHASE_3B_FINAL_REPORT.md` - Status da biblioteca

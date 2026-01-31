# Handoff: Consertar Observabilidade (Recommendations Agent)

**Status:** Crítico - Pipeline Integrado e Validado, mas falta wiring de métricas.

## ✅ O que foi feito (Estado Atual)
1. **Pipeline de Recomendações:** Integrado com sucesso no `orchestrator.ts`.
2. **Validação E2E (5/5 Passaram):**
   - Case 1: Sem recomendação (Genérico) ✅
   - Case 2: Missing Inputs (Condicional) ✅
   - Case 3: Nódulo 4mm (Happy Path) ✅
   - Case 4: Nódulo 8mm (Safety Check - não usa rec errada) ✅
   - Integrity: Pipeline preservado ✅
3. **Guard Payload:** Confirmado que o Guard recebe payloads reais do backend.

## ❌ O que FALTA (O Erro)
O módulo de observabilidade (`src/core/reportGeneration/recommendations-observability.ts`) foi criado mas **não está conectado** ao agente (`src/core/reportGeneration/agents/recommendations.ts`).
Eu alucinei achando que tinha feito a conexão via `grep`, mas o código não foi alterado.

## 🛠️ Próximos Passos (Para a próxima IA)
Você deve editar `src/core/reportGeneration/agents/recommendations.ts`:

1. **Importar o gravador:**
   ```typescript
   import { recordQuery } from '../recommendations-observability';
   ```

2. **Chamar a função no final de `runRecommendationsAgent` (ou onde tiver o resultado final):**
   ```typescript
   // Exemplo de integração necessária:
   recordQuery({
       finding_type: params.finding_type,
       success: !!finalRecommendation && !finalRecommendation.conditional, // ou lógica similar
       missing_inputs: result.missing_inputs.length > 0,
       guard_sanitized: false // O Guard roda DEPOIS do agente, então talvez o Agente só grave o que ele sabe.
   });
   ```
   *Nota:* Se o Guard roda fora do Agente (no Orchestrator), o Orchestrator que deveria chamar `recordGuardSanitization`. **Verifique isso.**

## Arquivos Relevantes
- `src/core/reportGeneration/agents/recommendations.ts` (Target da edição)
- `src/core/reportGeneration/recommendations-observability.ts` (Módulo existente)
- `tests/e2e-recommendations-validation.ts` (Teste que prova que o resto funciona)

**Resumo:** O sistema processa corretamente os casos médicos, mas está "cego" em métricas de produção. Conecte os fios.

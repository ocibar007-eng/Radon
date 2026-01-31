# Handoff: Próximos Passos - Sistema 3 Trilhas

**Data:** 2026-01-31
**Status Atual:** ✅ Estrutura implementada, aguardando ajustes finos

---

## 🎯 O Que Foi Feito

✅ **Sistema de 3 trilhas implementado:**
- TRILHA 1 (LAUDO): Somente biblioteca + aplicável
- TRILHA 2 (CONSULTA): Web evidence (NÃO entra no laudo)
- TRILHA 3 (CURADORIA): Candidatos staging

✅ **Componentes criados:**
- WebEvidenceAgent com allowlist forte
- Testes E2E (3 casos)
- Documentação completa
- Feature flag RADON_WEB_EVIDENCE

✅ **Integração completa:**
- Types, Orchestrator, Renderer modificados
- Pipeline funcional
- Guard Layer integrado

---

## 🔴 PRÓXIMOS PASSOS URGENTES

### 1. Corrigir Guard Payload Tracking (30 min)

**Problema:** `_libraryPayloads` Map vazio, Guard sanitizando recomendações válidas

**Ação:**
```typescript
// Em recommendations.ts, verificar estrutura real de RecommendationResult
// Adicionar TODOS os campos numéricos ao payload:

libraryPayloadsMap.set(topResult.guideline_id, {
    recommendation_text: topResult.recommendation_text,
    // Incluir campos numéricos da API:
    size_min_mm: topResult.size_min_mm,
    size_max_mm: topResult.size_max_mm,
    follow_up_months: topResult.follow_up_months,
    // Serializar para JSON antes de armazenar
    full_result_json: JSON.stringify(topResult)
});
```

**Comando:**
```bash
# 1. Ver estrutura real da API
cat services/recommendations/query_api.ts | grep "export interface RecommendationResult"

# 2. Ajustar payload tracking
# 3. Rodar testes
npx tsx tests/e2e-three-tracks-validation.ts
```

---

### 2. Validar com Caso Real (15 min)

**Ação:**
```bash
# Rodar pipeline completo com caso real do Radon
# Verificar integração SQLite + Guard + Renderer

npx tsx tests/recommendations-smoke-tests.ts  # Testes originais
```

**Checklist:**
- [ ] Biblioteca SQLite conecta corretamente
- [ ] Guard não sanitiza recomendações válidas
- [ ] Renderer ignora consult_assist
- [ ] Referências aparecem no final do laudo

---

## 🟡 PRÓXIMOS PASSOS MÉDIO PRAZO

### 3. Integrar Web Search Real (1-2h)

**Onde:** `src/core/reportGeneration/agents/web-evidence.ts:88`

**Ação:**
```typescript
import { WebSearch } from '@anthropic-ai/sdk';

export async function searchWebEvidence(params: WebSearchParams) {
    const query = buildSearchQuery(params);

    // WebSearch com allowlist
    const results = await WebSearch({
        query,
        allowed_domains: getAllowedDomains()
    });

    // Filtrar e extrair
    for (const result of results) {
        const sourceType = isSourceAllowed(result.url);
        if (sourceType === 'blocked') continue;

        // Extrair evidências...
    }
}
```

**Teste:**
```bash
RADON_WEB_EVIDENCE=1 npx tsx tests/e2e-three-tracks-validation.ts
```

---

### 4. Expandir Evidências Conhecidas (1h)

**Onde:** `src/core/reportGeneration/agents/web-evidence.ts:149`

**Adicionar:**
- Li-RADS (lesões hepáticas)
- TI-RADS (nódulos tireoide)
- O-RADS (massas ovarianas)
- PI-RADS (lesões prostáticas)

**Template:**
```typescript
if (finding_type === 'hepatic_lesion') {
    return {
        finding_id: 'web_evidence_placeholder',
        title: 'Classificação LI-RADS',
        summary: '...',
        sources: [{ /* ACR LI-RADS */ }],
        // ...
    };
}
```

---

## 🟢 PRÓXIMOS PASSOS LONGO PRAZO

### 5. Expor consult_assist para Médico (2h)

**Opção A: Arquivo JSON Separado**
```typescript
// No orchestrator ou handler
if (report.consult_assist?.length) {
    fs.writeFileSync(
        `./output/${report.case_id}_medical_consult.json`,
        JSON.stringify(report.consult_assist, null, 2)
    );
    console.log(`💡 Consulta disponível: ${report.case_id}_medical_consult.json`);
}
```

**Opção B: Seção HTML no Dashboard**
```html
<div class="tabs">
    <div class="tab active">LAUDO OFICIAL</div>
    <div class="tab">ASSISTÊNCIA MÉDICA</div>
</div>
```

---

### 6. Sistema de Curadoria (4-8h)

**Pipeline:**
```
library_ingestion_candidates
    ↓
Fila de Revisão Humana
    ↓
Aprovado → INSERT INTO recommendations.db
Rejeitado → Log/descarta
```

**Interface:**
```typescript
interface CurationQueue {
    pending: LibraryIngestionCandidate[];
    approved: LibraryIngestionCandidate[];
    rejected: LibraryIngestionCandidate[];
}

async function approveCandiate(id: string) {
    // INSERT INTO recommendations
    // UPDATE curation_queue SET status='approved'
}
```

---

## 📝 Comandos Rápidos

```bash
# Rodar testes E2E
npx tsx tests/e2e-three-tracks-validation.ts

# Rodar com web evidence
RADON_WEB_EVIDENCE=1 npx tsx tests/e2e-three-tracks-validation.ts

# Ver outputs
cat test-output-case1.json | jq .

# Commit
git add .
git commit -m "feat: implement 3-track recommendations system"
git push
```

---

## 🎯 Ordem de Execução Recomendada

**Hoje (2-3h):**
1. ✅ Corrigir Guard payload tracking (30 min)
2. ✅ Validar com caso real (15 min)
3. ✅ Testar pipeline completo (15 min)
4. ✅ Ajustar testes se necessário (30 min)
5. ✅ Merge para main (se tudo passar)

**Semana 1 (4-6h):**
6. Integrar web search real
7. Expandir evidências conhecidas
8. Testes com casos reais variados

**Semana 2 (6-10h):**
9. Expor consult_assist (UI ou arquivo)
10. Começar sistema de curadoria
11. Métricas e monitoramento

---

## 🔍 Debugging

**Se Guard sanitizar recomendações válidas:**
```typescript
// Em orchestrator.ts, adicionar debug:
console.log('Library payloads:', libraryPayloadsMap.size);
console.log('Payload keys:', Array.from(libraryPayloadsMap.keys()));
console.log('Sample payload:', libraryPayloadsMap.values().next().value);
```

**Se web evidence não aparecer:**
```bash
# Verificar flag
echo $RADON_WEB_EVIDENCE

# Habilitar
export RADON_WEB_EVIDENCE=1
```

**Se biblioteca não retornar resultados:**
```bash
# Verificar banco
sqlite3 data/recommendations/db/recommendations.db
SELECT COUNT(*) FROM recommendations;
SELECT * FROM recommendations WHERE finding_type='pulmonary_nodule' LIMIT 5;
```

---

## 📚 Documentação

- [THREE_TRACKS_RECOMMENDATIONS.md](./THREE_TRACKS_RECOMMENDATIONS.md) - Visão completa
- [IMPLEMENTATION_REPORT_3_TRACKS.md](./IMPLEMENTATION_REPORT_3_TRACKS.md) - Status atual
- [HANDOFF_NEXT_STEPS.md](./HANDOFF_NEXT_STEPS.md) - Este documento

---

**Pronto para começar? Execute o passo 1 (Guard payload) primeiro! 🚀**

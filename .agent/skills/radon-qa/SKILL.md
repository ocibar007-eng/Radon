---
name: radon-qa
description: Especialista em Garantia de Qualidade, Estratégia de Testes e Quality Gates. Use para criar planos de teste e validar releases.
---

# Radon QA Specialist 🕵️‍♂️ ✅

Use esta skill para garantir que o software não apenas "compile", mas funcione para o usuário final.

---

## 📋 CRITICAL USER JOURNEYS (Lista Fixa)

Estes fluxos DEVEM funcionar antes de qualquer release:

| # | Journey | Criticidade |
|---|---------|-------------|
| 1 | Upload PDF → OCR → Texto extraído | 🔴 Crítico |
| 2 | Edição manual de campos → Salvar | 🔴 Crítico |
| 3 | Agrupamento automático de laudos | 🔴 Crítico |
| 4 | Análise estruturada (laudo prévio) | 🔴 Crítico |
| 5 | Resumo clínico automático | 🟡 Alto |
| 6 | Upload batch (múltiplos PDFs) | 🟡 Alto |
| 7 | Modo offline (Firebase indisponível) | 🟡 Alto |
| 8 | Export/Download de laudo | 🟢 Médio |

---

## 🧪 TESTES DE CARACTERIZAÇÃO (Áreas Sagradas)

Para áreas críticas, criar "golden tests" ANTES de modificar:

```typescript
// tests/characterization/grouping.test.ts
describe('Grouping Characterization', () => {
  it('groups pages by PDF source', () => {
    const input = require('./fixtures/multi-page-pdf.json');
    const result = groupDocsVisuals(input);
    
    // Golden: comportamento atual documentado
    expect(result).toMatchSnapshot();
  });
});
```

### Áreas que EXIGEM Characterization Test
- `grouping.ts` - qualquer mudança
- `usePipeline.ts` - qualquer mudança
- `patient-service.ts` - mudanças de persistência
- Prompts de IA - qualquer mudança

---

## ✅ E2E COMO GATE OBRIGATÓRIO

Referência: `docs/testing/E2E_TESTING_GUIDE.md`

```bash
# Antes de qualquer merge
npx playwright test e2e/critical-journeys.spec.ts

# Se falhar: NÃO FAZER MERGE
```

---

## 🚫 POLÍTICA ANTI-FLAKINESS

### Proibido
```typescript
// ❌ NUNCA usar sleep fixo
await page.waitForTimeout(3000);

// ❌ NUNCA ignorar falha intermitente
test.skip('flaky test');
```

### Obrigatório
```typescript
// ✅ Sempre usar condição
await page.waitForSelector('[data-testid="result"]');

// ✅ Retries controlados
await expect(element).toBeVisible({ timeout: 10000 });
```

---

## 🧹 SANITIZAÇÃO DE FIXTURES

### Regra
> **ZERO PHI em fixtures de teste.** Sempre dados sintéticos.

```typescript
// ❌ PROIBIDO
const fixture = {
  patientName: "João da Silva",  // Dado real
  os: "12345"
};

// ✅ CORRETO
const fixture = {
  patientName: "Test Patient Alpha",
  os: "TEST-001"
};
```

### Checklist de Fixtures
- [ ] Nomes são sintéticos (Test Patient A, B, C)
- [ ] IDs são genéricos (TEST-001, MOCK-002)
- [ ] Não há dados copiados de produção

---

## Estratégia de Testes (Mínimo Viável)

Não queremos testes frágeis. Queremos confiança.

### 1. E2E Critical User Journeys (Playwright)
- Upload de PDF -> OCR -> Edição Manual -> Laudo Final.
- Cenário Offline (Interrupção de rede no meio do upload).
- Cenário "Arquivo Corrompido".

### 2. Testes de Unidade (Vitest)
- Foco em **Regras de Negócio** (ex: `patient-service.ts`, `grouping.ts`).
- Não teste detalhes de implementação de UI (ex: "se o botão é azul").

---

## Quality Gates (Antes de Merge)

- [ ] **Lint:** Zero erros de ESLint.
- [ ] **Typecheck:** Zero erros de TypeScript (`tsc --noEmit`).
- [ ] **Smoke Test Manual:** O fluxo principal ("Happy Path") funciona no preview?
- [ ] **E2E Critical:** Playwright passa nos journeys críticos.
- [ ] **Characterization:** Se tocou em área sagrada, golden tests passam.

---

## Protocols

### 🐛 Protocolo "Bug para Teste"
Se encontrou um bug:
1. Crie um teste que falha (reprodução).
2. Conserte o bug.
3. Garanta que o teste passa.
4. (Opcional) Adicione ao suite de regressão.

### 🚬 Smoke Tests (Roteiro Rápido)
1. Abrir App -> Upload de 1 PDF.
2. Verificar se OCR extraiu nome.
3. Editar um campo -> Salvar.
4. Gerar Laudo -> Download PDF.

**Se qualquer um falhar, o Release é abortado.**

---

## 📊 MÉTRICAS DE QUALIDADE

| Métrica | Target |
|---------|--------|
| E2E Critical Pass Rate | 100% |
| Flaky Test Rate | 0% |
| Coverage em áreas críticas | >80% |
| Fixtures com PHI | 0 |


---
name: radon-qa
description: Especialista em Garantia de Qualidade, Estratégia de Testes e Quality Gates. Use para criar planos de teste e validar releases.
---

# Radon QA Specialist 🕵️‍♂️ ✅

Use esta skill para garantir que o software não apenas "compile", mas funcione para o usuário final.

## Estratégia de Testes (Mínimo Viável)
Não queremos testes frágeis. Queremos confiança.
1. **E2E Critical User Journeys (Playwright):**
   - Upload de PDF -> OCR -> Edição Manual -> Laudo Final.
   - Cenário Offline (Interrupção de rede no meio do upload).
   - Cenário "Arquivo Corrompido".

2. **Testes de Unidade (Vitest):**
   - Foco em **Regras de Negócio** (ex: `patient-service.ts`, `grouping.ts`).
   - Não teste detalhes de implementação de UI (ex: "se o botão é azul").

## Quality Gates (Antes de Merge)
- [ ] **Lint:** Zero erros de ESLint.
- [ ] **Typecheck:** Zero erros de TypeScript (`tsc --noEmit`).
- [ ] **Smoke Test Manual:** O fluxo principal ("Happy Path") funciona no preview?

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

# AI Playbook: Google Sheet Sync (Worklist <-> Radon)

Data: 2026-03-02

## Objetivo

Evitar regressao da integracao Google Sheet <-> Radon durante mudancas feitas por outra IA (ou novo dev), especialmente regressao de:

- menu lateral `Planilha` no app;
- endpoints `api/worklist/google-sheet/*`;
- espelhamento de finalizacao e ingestao da worklist.

## Problema historico (incidente real)

Em 2026-03-02 houve deploy em producao com base sem commits da integracao. Sintomas:

- item `Planilha` sumiu da barra lateral;
- app deixou de receber exames da worklist;
- endpoints de sync nao estavam no build publicado.

## Regra nao negociavel

Antes de QUALQUER deploy de producao, a IA deve executar:

```bash
bash scripts/verify_google_sheet_sync_guardrails.sh --ref origin/main
```

Se retornar `FAILED`, proibido deployar.

## Checklist obrigatorio (pre-deploy)

1. Atualizar refs remotas:
   - `git fetch origin`
2. Rodar guardrails na branch alvo:
   - `bash scripts/verify_google_sheet_sync_guardrails.sh --ref <branch-ou-ref>`
3. Rodar guardrails no `origin/main` (estado que vai para producao):
   - `bash scripts/verify_google_sheet_sync_guardrails.sh --ref origin/main`
4. Se o repositorio estiver em branch com worktree sujo, usar worktree limpa para deploy.

## Checklist obrigatorio (post-deploy)

1. Verificar deployment `Ready` no Vercel.
2. Verificar endpoints:
   - `POST /api/worklist/google-sheet/webhook` responde `401 Unauthorized` sem token (isso indica endpoint publicado).
3. Verificar UI:
   - Sidebar mostra `Pacientes` e `Planilha`.
4. Verificar sync operacional:
   - linha elegivel `Lucas + azul` entra no app;
   - finalizar no app espelha `LIBERADO` na planilha.

## Arquivos sentinela (devem existir)

- `api/worklist/google-sheet/webhook.ts`
- `api/worklist/google-sheet/finalize.ts`
- `api/worklist/google-sheet/_firebase.ts`
- `src/services/google-sheet-sync-client.ts`
- `src/components/Sidebar.tsx` com `Planilha` + `Pacientes`
- `.gitmodules` com submodulo `Google_sheet`

## Politica de merge/deploy para agentes

1. Nao fazer deploy de branch sem rodar guardrails.
2. Nao fazer deploy se `main` local divergir de `origin/main`.
3. Se faltar qualquer sentinela, recuperar via merge/cherry-pick ANTES do deploy.

## Procedimento de recuperacao rapida

Se menu `Planilha` sumir ou sync cair:

1. Confirmar ausencia dos arquivos sentinela.
2. Restaurar commits de integracao Google Sheet para `main`.
3. Re-publicar no Vercel.
4. Rodar checklist post-deploy.

## Observacao sobre submodulo Google_sheet

Toda mudanca em `Google_sheet` exige dois commits:

1. Commit dentro do submodulo.
2. Commit no repo pai atualizando o ponteiro do submodulo.

Sem isso, a producao pode apontar para versao errada do submodulo.


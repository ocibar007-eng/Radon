# HANDOFF: Integração Google Sheet ↔ Radon (Worklist)

Data: 02/03/2026

## 1) Escopo Entregue

Integração bidirecional entre a Worklist no Google Sheets e a lista de trabalho do app Radon:

1. Planilha -> App:
   - Sync por webhook para casos elegíveis `Lucas + azul lógico`.
   - Backfill completo.
   - Arquivamento no app quando perder elegibilidade.
2. App -> Planilha:
   - Finalização no app espelha para planilha:
     - `Status = LIBERADO`
     - `Liberar ✅ = true`
     - `Entrega = hoje`
3. Reconciliação de exclusões:
   - Exclusão de linha na planilha passa a remover (arquivar) do app automaticamente.

## 2) Mudanças Implementadas

### 2.1 Apps Script (submodule `Google_sheet`)

Arquivos:
- `Google_sheet/apps_script_v2/Code.gs`
- `Google_sheet/apps_script_v2_sandbox/Code.gs`

Principais mudanças:

1. Menu reorganizado em submenus (menos poluído):
   - `👨‍⚕️ Atribuir Medico` (mantido no topo)
   - `📄 Enviar PDF` (item de destaque)
   - `⚡ Fluxo Diário`
   - `🛠️ Manutenção`
   - `🧭 Navegação`
   - `📊 BI`
   - Sandbox também recebeu organização equivalente + submenu de ferramentas sandbox.

2. Triggers:
   - `ON_EDIT` instalável (`gatilhoAoEditar`) para sync autorizado.
   - `ON_CHANGE` instalável (`gatilhoAoAlterarEstrutura_`) para capturar `REMOVE_ROW`.
   - Criação automática via `menuAtivarAutoSync`.

3. Permissões:
   - Novo item de menu `🔐 Autorizar Sync Radon` para conceder escopo `UrlFetchApp`.
   - Evita erro de permissão no `onEdit` simples.

4. Finalize mirror robusto:
   - Busca de linha por `Chave Exame`.
   - Fallback por `OS + Procedimento` quando chave está vazia/desalinhada.

5. Reconciliação de snapshot:
   - Novo item `🧹 Reconciliar Radon (snapshot)`.
   - Ao excluir linha da planilha, a chave sai do snapshot e o backend arquiva no app.

### 2.2 API Radon (Vercel)

Arquivos:
- `api/worklist/google-sheet/webhook.ts`
- `api/worklist/google-sheet/_firebase.ts`
- `api/worklist/google-sheet/finalize.ts`

Principais mudanças:

1. Webhook aceita dois modos:
   - `records[]` (upsert/archive por evento)
   - `presentExternalKeys[]` (reconcile de snapshot)

2. Novo reconcile no backend:
   - Compara docs `integrationSource = google_sheet_v3` com snapshot atual.
   - Arquiva o que não existe mais na planilha elegível.

3. Finalize mirror:
   - Mantido com validações e auditoria.

### 2.3 Frontend Radon

Arquivos:
- `src/components/PatientCard.tsx`
- `src/components/PatientTableRow.tsx`
- `src/components/Sidebar.tsx`
- `src/styles/layout.css`
- `.env.example`

Principais mudanças:

1. UX de finalização:
   - Modal fecha imediatamente após finalizar localmente.
   - Espelho para planilha roda em background (não bloqueia UI).

2. Sidebar esquerda:
   - Item `Lista` renomeado para `Pacientes` (ícone alterado).
   - Novo item `Planilha` com ícone próprio e abertura direta da Worklist Google.
   - URL configurável por `VITE_WORKLIST_SHEET_URL`.

## 3) Dificuldades Encontradas e Resolução

1. `UrlFetchApp.fetch` sem permissão no log:
   - Causa: execução por `onEdit` simples.
   - Correção: trigger instalável + menu de autorização explícita.

2. `radon_mirror_finalize | linha_nao_encontrada`:
   - Causa: dependência exclusiva de `Chave Exame`.
   - Correção: fallback por `OS + Procedimento`.

3. Exclusão de linha não removia do app:
   - Causa: remoção estrutural não passava pelo fluxo de elegibilidade.
   - Correção: trigger `ON_CHANGE` + reconcile snapshot.

4. Build/deploy Vercel com import interno:
   - Causa: resolução de módulo no ambiente serverless.
   - Correção: módulo compartilhado em `api/worklist/google-sheet/_firebase.ts` e ajustes de import.

## 4) Operação (passo a passo para uso)

1. Na planilha, rodar uma vez:
   - `🔐 Autorizar Sync Radon`
   - `⏱️ Ativar Auto Sync 5 min`

2. Se quiser alinhar estado imediatamente:
   - `🧹 Reconciliar Radon (snapshot)`

3. Fluxo esperado:
   - Marca linha elegível -> entra no app.
   - Remove elegibilidade ou exclui linha -> sai/arquiva no app.
   - Finaliza no app -> atualiza planilha para `LIBERADO`.

## 5) Deploy/Publicação Aplicados

1. Apps Script:
   - Push + deploy em `apps_script_v2` e `apps_script_v2_sandbox`.
2. Vercel:
   - Deploy de produção com endpoints atualizados.

## 6) Observações de Submodule (Git)

Como `Google_sheet` é submodule:

1. Commit dentro do submodule:
   - `cd Google_sheet`
   - `git add ...`
   - `git commit ...`

2. Commit no repositório pai:
   - `cd ..`
   - `git add Google_sheet`
   - `git commit ...`

Isso garante que o ponteiro do submodule fique correto no projeto principal.

## 7) Guardrails para outras IAs (anti-regressao)

Para evitar que outra IA remova a integracao por engano em deploy futuro:

1. Rodar o verificador automatizado antes de deploy:
   - `bash scripts/verify_google_sheet_sync_guardrails.sh --ref origin/main`
2. Se o resultado for `FAILED`, nao deployar.
3. Restaurar commits sentinela da integracao e rodar novamente.

Playbook completo para agentes:
- `docs/AI_PLAYBOOK_GOOGLE_SHEET_SYNC.md`

Esse fluxo foi criado apos incidente real em 2026-03-02 (menu `Planilha` sumiu e sync caiu por deploy de base antiga).

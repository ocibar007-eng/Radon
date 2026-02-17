# Handoff — Sandbox + Pipeline (Vercel) — Estado Atual

## Resumo rápido (para outra IA)
Temos uma **Sandbox no frontend** que chama uma **pipeline rodando no Vercel**.
A pipeline usa **Gemini** nas etapas iniciais e **OpenAI** só em **Impressão** e **Render**.
Quando OpenAI cai (502), o sistema **não quebra** — usa fallback determinístico.
O maior problema atual é **achados inconsistentes** em alguns ditados; foi adicionado um **fallback local** que lê o ditado e tenta gerar achados por órgão caso o Gemini falhe.

---

## O que foi implementado

### Frontend
- Sandbox em `src/features/sandbox/SandboxPage.tsx`
- Input texto/JSON
- Campo de token
- Botões de copiar/baixar
- Visualização “Visual” (renderiza Markdown com `react-markdown`)
- Auditoria interna + bloco “Consulta Web (verificar)”
- Estilos: `src/features/sandbox/styles/sandbox.css`
- Rotas e menu:
- `src/app/AppRouter.tsx`
- `src/components/Sidebar.tsx`

### Pipeline (Vercel Functions)
- Endpoint:
- `api/pipeline/run.ts`
- `api/pipeline/health.ts`
- Bundle server-side:
- `scripts/build_pipeline_bundle.mjs`
- `src/server/pipeline-bundle-entry.ts`
- Gera `api/pipeline/bundle.cjs` (ignorado no git)
- `package.json` `prebuild`: roda o bundle automaticamente

### Gemini / OpenAI
- Gemini:
- `src/adapters/gemini-prompts.ts` (remove thinkingConfig se `GEMINI_ENABLE_THINKING` não estiver ligado)
- `src/core/config.ts` (flag `ENABLE_THINKING`)
- OpenAI:
- `src/adapters/openai/client.ts` agora expõe `err.status`
- `src/core/reportGeneration/agents/impression.ts` com try/catch (fallback local)
- `src/core/reportGeneration/agents/comparison.ts` com try/catch (fallback local)
- `src/core/reportGeneration/renderer.ts` com fallback determinístico se OpenAI falhar

### Achados / Correções
- `src/core/reportGeneration/agents/findings.ts`
- Limpa o ditado (remove timestamps/ruído)
- Retry se JSON inválido
- Fallback local: parsing simples por órgão se Gemini falhar
- `src/core/reportGeneration/orchestrator.ts`
- `TCABT` mapeado para “Tomografia Computadorizada de Abdome Total”
- Detecta comparação por “USG” no resumo clínico e cria resumo automático

### Firebase
- `src/core/firebase.ts`
- Só liga se config está completa
- Persistência opcional via `FIREBASE_PERSISTENCE=1`

---

## Como rodar local (rápido)
1. `npm install`
2. `npm run dev`
3. Abrir `/sandbox`

Se quiser testar a pipeline local:
- `node scripts/build_pipeline_bundle.mjs` (gera bundle)
- Rodar a app e usar `/api/pipeline/run` via Vercel local ou build.

---

## Deploy (Vercel)
Tudo está no mesmo projeto Vercel (`app-ocr-v6`).
O alias oficial é:
- `https://app-ocr-v6.vercel.app`

### Variáveis obrigatórias
- `API_KEY` (Gemini)
- `OPENAI_API_KEY` (OpenAI)
- `PIPELINE_TOKEN` (proteção simples do endpoint)

### Opcionais
- `OPENAI_MODEL_IMPRESSION`
- `OPENAI_MODEL_RENDERER`
- `GEMINI_ENABLE_THINKING=1` (somente se o modelo suportar)
- Firebase (se usar): `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN` etc.

### WebSearch (Consulta)
Para ativar o websearch (apenas para consulta/auditoria):
- `RADON_WEB_EVIDENCE=1`
- `SEARCH_API_PROVIDER` (`serpapi`, `bing`, `google_cse`, `brave`)
- Chave do provider:
- `SERPAPI_API_KEY` ou
- `BING_SEARCH_KEY` ou
- `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` ou
- `BRAVE_SEARCH_API_KEY`

Observação: WebSearch **não entra no laudo**, só aparece na auditoria como “Consulta Web (verificar)”.

---

## Arquivos importantes (entrada/saída)
- Pipeline API: `api/pipeline/run.ts`
- Bundle: `scripts/build_pipeline_bundle.mjs`, `src/server/pipeline-bundle-entry.ts`
- Findings: `src/core/reportGeneration/agents/findings.ts`
- Renderer: `src/core/reportGeneration/renderer.ts`
- Orchestrator: `src/core/reportGeneration/orchestrator.ts`
- Sandbox UI: `src/features/sandbox/SandboxPage.tsx`

---

## Status atual (problemas conhecidos)
1. Achados às vezes não são extraídos corretamente do ditado.
- Fallback local foi implementado (melhorou, mas pode errar).
2. OpenAI 502
- Resolvido com fallback local (não quebra a pipeline).
3. Comparação
- Se o resumo clínico cita USG, agora gera comparação automática.

---

## Próximos passos recomendados
1. Subir modelo Gemini mais forte nas etapas Clinical/Findings/Technical.
2. Ajustar dicionário de órgãos/regex do fallback com exemplos reais.
3. Se desejar recomendações automáticas, criar regras internas para hérnia ventral e bexiga.

---

## Como testar rápido
1. Abrir `https://app-ocr-v6.vercel.app`
2. Hard refresh
3. Token em `inbox/PIPELINE_TOKEN.txt`
4. Colar input e clicar **Rodar**
5. Comparar saída e ver auditoria

---

## Observação de segurança
Nunca expor API keys no chat.
Tokens ficam em `inbox/PIPELINE_TOKEN.txt` (gitignored).

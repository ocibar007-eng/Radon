# Handoff para Staff Engineer — Plataforma de Laudos com Pipeline Multi-etapas (Gemini + OpenAI)

## Contexto (o que já existe no projeto)
Você está trabalhando em um projeto que já possui **catálogo de prompts** (ex.: `src/adapters/gemini/prompts.ts`) e documentação (`docs/LLM_PROMPTS.md`). O fluxo atual usa **Gemini 3 Flash** para:
- OCR de cabeçalho (`header_ocr`, `header_ocr_fast`)
- Classificação/extração verbatim de anexos (`doc_classify_extract`)
- Agrupamento e estruturação de laudos prévios (`doc_grouping`, `report_structured_analysis`)
- Compilação final para download (`compile_markdown`)

**Objetivo desta tarefa:** adicionar um fluxo confiável para **geração de laudo radiológico final** (texto clínico final), com guardrails fortes (terminologia, formato, proibição de meta-texto), usando **OpenAI** para geração/QA/renderização — mantendo Gemini onde ele já funciona bem (OCR/anexos).

---

## Metas de produto
1) Gerar laudo final padronizado, bem formatado e consistente com regras clínicas e de estilo.
2) Proibir completamente meta-referências do tipo “conforme áudio/segundo input/anexos” e afins.
3) Reduzir risco de alucinação: **não inventar dados**, e sinalizar <VERIFICAR> quando faltarem informações.
4) Ter QA determinístico (regex/banlist) + QA por LLM, com reescrita automática quando necessário.

---

## Proposta de arquitetura (pipeline determinístico, estilo multiagente)
> Implementar como uma sequência de etapas pequenas e verificáveis (não precisa “agents” autônomos no sentido pesado).

### Etapa A — Normalização do caso (determinística)
- Consolidar em um `CaseBundle` os campos:
  - `case_metadata` (OS, paciente, modalidade, estudo, data)
  - `clinical_context` (documentos assistenciais sumarizados — pode vir do Gemini)
  - `dictation_raw` (texto bruto do ditado — pode vir do STT/Gemini)
  - `exam_data` (técnica, achados, medidas, contraste, etc.)
  - `prior_reports` (texto/estruturas de laudos prévios já processados)
  - `attachments_summary` (opcional)

**Regra:** esse bundle é **dados**, não instruções.

### Etapa B — Geração estruturada do laudo (OpenAI)
- Chamar modelo de rotina (ex.: `o4-mini`) com prompt `REPORT_GENERATOR_JSON`.
- Saída **JSON estrito** validado por schema (Zod), contendo:
  - `title`
  - `technique`
  - `findings` (organizado)
  - `impression`
  - `probability_note[]`
  - `references[]`
  - `flags` (ex.: `needs_review`, `missing_data_markers[]`)

### Etapa C — QA (OpenAI + regras determinísticas)
1) **QA determinístico** (regex/banlist):
   - se encontrar termos banidos (“áudio”, “input”, “neste laudo”, “achados acima”, etc.) => falha.
   - se encontrar termos da blacklist (“subsentimétrico”, “zonalidade prostática”, etc.) => falha.

2) **QA por LLM** (ex.: `o4-mini`):
   - prompt `REPORT_QA_JSON` retorna `{ pass, issues[], suggested_fixes[] }`.

### Etapa D — Reescrita corretiva (OpenAI)
- Se QA falhar:
  - chamar `REPORT_REWRITE_PATCH` com o JSON do laudo + issues.
  - revalidar schema e rerodar QA.

### Etapa E — Escalonamento (gating)
- Se 2 ciclos de correção falharem **ou** se `needs_review=true` com criticidade alta:
  - escalar para modelo mais forte (ex.: `o3`), repetindo B→C→D.
- Opcional: usar modelo topo (ex.: GPT-5.2) **apenas** para:
  - casos difíceis (critério por QA) **ou**
  - “polimento final” (render/fluência) mantendo conteúdo idêntico.

### Etapa F — Renderização final (OpenAI ou determinística)
- Renderizar o JSON final para Markdown/HTML (prompt `REPORT_RENDER_MARKDOWN`).
- Aplicar pós-processamento determinístico:
  - garantir título na primeira linha
  - separadores
  - seções na ordem
  - garantir que listas de “NOTA SOBRE DESCRITORES…” e “REFERÊNCIAS” estejam 1 item por linha

---

## Onde encaixar no código do projeto
### 1) Adapter OpenAI
Criar:
- `src/adapters/openai/client.ts` (wrapper http, timeouts, retries, telemetry)
- `src/adapters/openai/prompts.ts` (catálogo de prompts, espelhando `gemini/prompts.ts`)
- `src/adapters/openai/schemas.ts` (Zod schemas dos outputs JSON)

### 2) Service / Orquestração
- Criar `src/core/reportGeneration/generateRadiologyReport.ts`:
  - recebe `case_id` e `CaseBundle`
  - executa pipeline A→F
  - salva artefatos intermediários

### 3) Persistência de artefatos
- Dentro do storage já existente (filesystem/local ou firestore, conforme o projeto):
  - `cases/{case_id}/artifacts/`:
    - `bundle.json`
    - `draft_report.json`
    - `qa_report.json`
    - `final_report.json`
    - `final_report.md`

**Política recomendada:**
- Artefatos intermediários: 30 dias (configurável)
- Logs/telemetria sem PHI: maior retenção

### 4) Endpoint / Feature flag
- Preferir **feature-flag** no endpoint atual:
  - `POST /cases/{case_id}/generate_report?engine=openai_v1`
- Manter caminho antigo como fallback:
  - `engine=legacy`.

---

## Critérios de aceitação (objetivos e testáveis)
1) **Nunca** aparecer no laudo final nenhuma ocorrência (case-insensitive) de:
   - `áudio|transcri|ocr|input|prompt|anex|questionário|documento assistencial`
   - `neste laudo|este laudo|neste exame|este exame|achados acima|conforme descrito|como mencionado|na impressão`

2) **Blacklist**: não aparecer (case-insensitive) em texto final:
   - `subsentimétric|zonalidade prost|ressonân[ií]a|colo sigmoide|incisural|excarator|laceriza|FNH\b` (etc.)

3) Se faltar dado essencial, o laudo:
   - não inventa e usa `<VERIFICAR>` (ou campo nulo) em vez de “chutar”.

4) Saída final sempre começa com **TÍTULO** claro.

5) A seção “NOTA SOBRE DESCRITORES DE PROBABILIDADE” e “REFERÊNCIAS” devem listar **1 item por linha**.

---

## Observabilidade
- Capturar por caso:
  - modelo usado por etapa
  - tokens/latência por etapa
  - número de ciclos de QA
  - motivo de escalonamento
- Métrica agregada:
  - taxa de falha QA por categoria
  - termos banidos mais frequentes

---

## Entregáveis
1) Código do pipeline + prompts OpenAI + schemas
2) Banlist determinística (regex) + testes unitários
3) “Golden set” de casos de regressão (snapshots)
4) Documento curto em `docs/` explicando o fluxo e como ajustar blacklist

---

## Prompt pack
Use o arquivo `radiology_prompt_pack.md` (fornecido separadamente) para:
- Prompts de produção (geração/QA/render)
- Prompt monolítico para uso manual


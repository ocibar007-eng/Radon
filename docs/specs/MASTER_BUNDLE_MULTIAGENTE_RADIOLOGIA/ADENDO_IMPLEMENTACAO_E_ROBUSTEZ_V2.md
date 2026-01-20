# ADENDO DE IMPLEMENTAÇÃO E ROBUSTEZ (V2)

**Versão:** 2.0

**Data:** 20/01/2026

**Status:** Proposta (não altera o plano original; apenas acrescenta)

**Escopo:** Endurecer o sistema multi-agente em **determinismo de I/O**, **anti-alucinação**, **melhoria contínua (feedback)**, **sandbox para radiologista**, **observabilidade simples** e **regressão/privacidade/latência**, com foco em **alto custo-benefício** e **baixa manutenção**.

---

## Checklist de aceitação (objetivo do V2)

- [ ] A saída **sempre** valida em **ReportJSON (Zod)** e o laudo final segue uma **ordem fixa de seções**.
- [ ] O laudo final **nunca** contém meta-texto: “conforme áudio”, “segundo input”, “neste laudo”, “achados acima”, etc.
- [ ] Cálculos (washout, CSI/SII, volumes, índices) **nunca** são feitos por LLM: sempre pelo **Calculator Python** (whitelist).
- [ ] Existe um **Golden Set** (10→50→200 casos) com **snapshot tests** que rodam em CI.
- [ ] Existe um **Sandbox UI** (Streamlit/Gradio) rodando com **um comando**, com botões Aprovar/Reprovar, nota 0–10 e salvamento de “Ouro”.
- [ ] Existe um **log simples** (SQLite arquivo único + export CSV) registrando input/output/custo/latência/QA/nota.
- [ ] Existe um “motor infinito”: correções do radiologista viram **exemplos recuperáveis** para few-shot automático.
- [ ] Existe plano simples de **privacidade (LGPD)** e **limites de custo/latência**.

---

## 1) Consistência e Determinismo (Input/Output)

### 1.1 Contrato de saída (o que torna o output previsível)

**Regra-mãe:** nenhum agente escreve o laudo final “livre”. O pipeline é:

1) **CaseBundle normalizado** (entrada)
2) Agentes geram **somente JSON** (sem Markdown), validado por schema
3) QA determinístico + QA LLM sobre o JSON
4) Renderer determinístico converte JSON → Markdown/PDF

**Contrato:**
- `bundle.json` (CaseBundle)
- `draft_report.json` (ReportJSON)
- `qa_report.json` (QAIssues + flags)
- `compute_requests.json` / `compute_results.json`
- `final_report.json` + `final_report.md`

### 1.2 Anti-alucinação médica (guardrails)

**Guardrails obrigatórios (baixo custo, alta efetividade):**

1) **Banlist/Blacklist determinística (regex + substituições)**
   - Banlist: meta-texto e termos proibidos (ex.: “conforme áudio”, “neste laudo”, “input”, “anexo”, “achados acima”).
   - Blacklist: correções terminológicas (ex.: “subsentimétrico→subcentimétrico”, “zonalidade→zonagem”, etc.).

2) **Regras de “não inventar” com fallback**
   - Se um dado essencial não existir no CaseBundle: **usar `<VERIFICAR>`**.
   - Nunca “completar” lateralidade, medidas, segmentos, datas, ou classificações.

3) **Detector de contradições (determinístico + LLM)**
   - Exemplos: rim direito vs esquerdo; medida diferente em achados e impressão; “sem cálculos” mas há números.

4) **Self-healing loop** (já previsto):
   - MAX_ATTEMPTS=2
   - Se falhar novamente: marcar `needs_review: true` e priorizar segurança (menos assertivo) sem inventar.

### 1.3 Parâmetros exatos por etapa (temperatura/top_p etc.)

**Objetivo:** reduzir variância e impedir “criatividade” onde não cabe.

| Etapa | Saída | Temperatura | top_p | freq_penalty | presence_penalty | Retries | Timeout | Observação |
|------|------|-------------|-------|--------------|------------------|--------|---------|-----------|
| Extração/Parsing p/ JSON (Clinical/Technical/Findings) | JSON estrito | **0.0** | 1.0 | 0 | 0 | 2 | 30s | Se houver `response_format=json_schema`, usar “strict”. |
| QA LLM (checar consistência/contradição/banlist) | JSON issues | **0.0** | 1.0 | 0 | 0 | 1 | 25s | Saída curta e objetiva. |
| Reescrita corretiva (self-healing) | JSON corrigido | **0.1** | 0.2 | 0 | 0 | 2 | 35s | Só corrigir o que falhou no QA. |
| Render final (Markdown) | Markdown | **0.1** | 0.3 | 0 | 0 | 1 | 25s | Nada de fatos novos; só formatação/estilo. |

**Seed (se disponível no SDK):** fixe um seed (ex.: `seed=42`) nas etapas estruturadas para reduzir variância.

### 1.4 Ordem fixa de seções + regras de quebra de linha

Definir “contrato de layout” para o renderer (determinístico):

1) **TÍTULO**
2) **INDICAÇÃO**
3) **TÉCNICA**
4) **COMPARAÇÃO** (se aplicável)
5) **ACHADOS** (ordem de órgãos fixa)
6) **IMPRESSÃO / CONCLUSÃO**
7) **NOTA SOBRE DESCRITORES DE PROBABILIDADE** (itens em linhas separadas)
8) **REFERÊNCIAS** (itens em linhas separadas)

Regras:
- Uma linha em branco entre seções.
- Listas com um item por linha (sem “parágrafo único”).
- Proibir auto-referência: “neste laudo”, “na impressão”, etc.

### 1.5 Canonicalizer (pós-processamento determinístico)

Antes do snapshot test e antes de mostrar ao médico, rodar um canonicalizer que:
- normaliza quebras de linha (\r\n → \n)
- remove espaços duplos
- remove linhas vazias repetidas
- aplica substituições blacklist simples (se “seguro”)

**Por quê:** isso torna o layout testável e reduz “drift cosmético”.

---

## 2) O “Motor Infinito” (Feedback / Active Learning)

### 2.1 O que salvar automaticamente quando houver correção

Quando o radiologista corrigir:
- `input_bundle` (anonimizado) + hash
- `final_report.md` (IA)
- `final_report_corrected.md` (médico)
- `score_0_10`
- `tags` (ex.: meta_texto, termo_blacklist, omissão, contradição, medida, lateralidade)
- `modalidade`, `protocolo`, `modelo`, `prompt_version`
- `qa_issues`

**Banco recomendado (simples e robusto):** SQLite arquivo único (`data/metrics.sqlite`).

### 2.2 Esquema mínimo (SQLite)

```sql
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  case_id TEXT,
  created_at TEXT,
  modality TEXT,
  model_path TEXT,
  prompt_version TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  qa_pass INTEGER,
  risk_score TEXT,
  rating INTEGER,
  tags TEXT,
  artifacts_path TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT,
  corrected_md_path TEXT,
  diff_summary TEXT,
  notes TEXT,
  created_at TEXT
);
```

### 2.3 Como usar correções para few-shot automático (sem manutenção pesada)

**Ideia:** cada correção vira um “exemplo Ouro”. Na geração de novos casos, selecionar automaticamente 2–4 exemplos mais parecidos e inserir como few-shot.

Opções simples (começar pela mais fácil):
1) **Similarity por texto (TF-IDF / cosine)** em cima de “indicação + técnica + achados brutos”
2) Se já houver embeddings no projeto, usar embeddings para top-k

**Critério de segurança:** exemplos inseridos são apenas **estilo/estrutura e correções de linguagem**, não “fatos”.

### 2.4 Quando faz sentido fine-tuning

Só considerar fine-tuning quando:
- Golden set ≥ **200** casos com alta qualidade
- Taxa de falhas repetidas em problemas específicos (ex.: meta-texto, termos proibidos) ainda alta
- Você já tem logs de custos/latência e quer reduzir chamadas

Até lá, **few-shot + guardrails** tende a ser melhor custo-benefício.

---

## 3) Interface de Testes (Sandbox para o Radiologista)

### 3.1 Objetivo
Um app independente (Streamlit ou Gradio) para:
- colar input
- rodar pipeline
- ver outputs por agente (JSON)
- ver QA (pass/fail + motivos)
- Aprovar/Reprovar + nota 0–10
- salvar correção como Ouro

### 3.2 Estrutura de pastas sugerida

```
/ tools/
  /sandbox/
    app.py
    README.md
/ scripts/
  setup.sh
  run_sandbox.sh
  run_pipeline.sh
  run_golden_tests.sh
  export_metrics_csv.sh
/ data/
  metrics.sqlite
  /cases/
    <case_id>/...
```

### 3.3 Streamlit (mínimo) — esqueleto

```python
# tools/sandbox/app.py
import streamlit as st
import json
from pathlib import Path

st.set_page_config(page_title="Radon Sandbox", layout="wide")
st.title("Sandbox — Laudos Multi-Agente")

col1, col2 = st.columns(2)
with col1:
    raw = st.text_area("Cole o input (bundle/ditado/dados)", height=300)
    run = st.button("Rodar pipeline")

with col2:
    st.markdown("### Resultado")

if run and raw.strip():
    # Aqui você chama o orchestrator do projeto (via função ou HTTP local)
    # Retorne: report_json, qa_json, final_md, custos
    st.info("(Integração) chamar orchestrator e mostrar outputs")

st.markdown("---")
st.markdown("### Avaliação")
rating = st.slider("Nota (0 a 10)", 0, 10, 8)
comment = st.text_input("Comentário (opcional)")

approve = st.button("Aprovar")
reject = st.button("Reprovar")

if approve or reject:
    st.success("Salvo no log (SQLite/CSV)")
```

### 3.4 Rodar com um comando

```bash
./scripts/run_sandbox.sh
```

---

## 4) Catalogação e Observabilidade (A “Caixa Preta”)

### 4.1 O mínimo que vale a pena logar (e que você consegue gerenciar)

- `case_id` (hash) + timestamp
- modelos usados (ex.: o4-mini → o3)
- tokens/custo estimado
- latência total + por etapa
- QA pass/fail + motivos
- risk_score (S1/S2/S3)
- nota 0–10 e tags

### 4.2 Dashboard simples

Duas visões (sem infra pesada):
1) Streamlit “Observability” lendo o SQLite
2) Export CSV para Excel/Sheets

### 4.3 Alertas simples (sem DevOps)

- “Custo por laudo > X” (ex.: p95 de custo)
- “Falha QA repetida” (ex.: 5 falhas seguidas)
- “Latência p95 > Y segundos”

Implementável como script diário (`scripts/drift_sentinel.sh`) que imprime um resumo.

---

## 5) Prevenção de Dores de Cabeça Futuras (Regressão, Privacidade, Velocidade)

### 5.1 Testes automatizados (o pacote essencial)

**A) Golden set snapshot (regressão de output):**
- Para cada caso em `tests/golden-set/`:
  - roda pipeline
  - canonicaliza markdown
  - compara com snapshot esperado

**B) Contrato de JSON (schema):**
- toda saída JSON deve validar Zod/Pydantic
- se falhar, o teste quebra

**C) Testes adversariais (prompt injection):**
- inputs contendo: “ignore regras”, “faça X”, “mude o formato”
- esperado: output não muda e banlist passa

**D) Property-based no calculator:**
- valores aleatórios dentro de faixa
- checar: não crash, não NaN, arredondamento correto

**E) Regressão terminológica:**
- procurar termos blacklist no `final_report.md`

### 5.2 Rollout seguro (sem complexidade)

- **Shadow mode (opcional):** roda novo prompt/modelo em paralelo e compara QA/score, sem mostrar ao médico.
- **Canary:** 5–10% dos casos reais com novo prompt; se piorar, rollback.

### 5.3 Privacidade (LGPD) — o que não pode faltar

- **Anonimização antes de enviar a LLM externa** (remover nome, ID, datas diretas, etc.)
- Artefatos com PHI (se existirem) **criptografados localmente**
- Política de retenção (ex.: apagar inputs após X dias; manter apenas métricas)

### 5.4 Latência e custo

- Cache de “prompts + schemas” (evita recomputar strings)
- Limitar concorrência (fila simples)
- Timeouts + retries controlados
- Gating: só escalar para modelo caro quando QA falhar ou caso for S2/S3

---

## 6) Implementação prática (Nível não-dev)

### 6.1 Passo-a-passo “faça funcionar”

1) Criar pastas:
```bash
mkdir -p tools/sandbox scripts data/cases tests/golden-set
```

2) Criar SQLite:
```bash
python - <<'PY'
import sqlite3
con = sqlite3.connect('data/metrics.sqlite')
cur = con.cursor()
cur.executescript('''
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  case_id TEXT,
  created_at TEXT,
  modality TEXT,
  model_path TEXT,
  prompt_version TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  qa_pass INTEGER,
  risk_score TEXT,
  rating INTEGER,
  tags TEXT,
  artifacts_path TEXT
);
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT,
  corrected_md_path TEXT,
  diff_summary TEXT,
  notes TEXT,
  created_at TEXT
);
''')
con.commit(); con.close()
print('OK: data/metrics.sqlite')
PY
```

3) Rodar sandbox:
```bash
./scripts/run_sandbox.sh
```

4) Rodar testes do golden set:
```bash
./scripts/run_golden_tests.sh
```

### 6.2 Scripts plug-and-play (templates)

**scripts/setup.sh**
```bash
#!/usr/bin/env bash
set -euo pipefail
python -m venv .venv || true
source .venv/bin/activate
pip install -U pip
pip install streamlit sqlite-utils

echo "OK: ambiente pronto"
```

**scripts/run_sandbox.sh**
```bash
#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate
streamlit run tools/sandbox/app.py --server.port 8501
```

**scripts/export_metrics_csv.sh**
```bash
#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate
sqlite-utils rows data/metrics.sqlite runs --csv > data/runs.csv
sqlite-utils rows data/metrics.sqlite feedback --csv > data/feedback.csv
echo "OK: data/runs.csv e data/feedback.csv"
```

### 6.3 Operação diária (checklist do radiologista)

- [ ] Colar input no sandbox e rodar
- [ ] Se o resultado estiver bom: **Aprovar + Nota**
- [ ] Se tiver erro: corrigir no editor e **Salvar como Ouro**
- [ ] Uma vez por semana: exportar CSV e olhar:
  - top 10 erros por tag
  - custo p95
  - falhas QA repetidas

---

## Checklist de PRs sugeridos (curto)

1) PR: `qa-banlist-blacklist` (banlist meta-texto + blacklist terminológica)
2) PR: `golden-set-snapshot-tests` (10 casos + canonicalizer + CI)
3) PR: `sandbox-streamlit` (UI + salvar rating/feedback no SQLite)
4) PR: `feedback-flywheel` (few-shot retrieval com exemplos Ouro)
5) PR: `observability-sqlite-export` (logs + export CSV + alertas simples)

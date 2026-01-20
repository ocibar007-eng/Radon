# Plano Consolidado: Sistema Multi-Agente para Laudos Radiológicos

**Versão:** 1.0 CONSOLIDADA
**Data:** 20 de Janeiro de 2026
**Status:** APROVADO PARA EXECUÇÃO
**Perfil do Usuário:** Radiologista (não-desenvolvedor)

---

# RESUMO EXECUTIVO (1 PÁGINA)

## O que EU (radiologista) faço no dia a dia

| Ação | Frequência | Tempo estimado |
|------|------------|----------------|
| Colar input no Sandbox e clicar "Rodar" | Por caso | 10 segundos |
| Revisar laudo gerado | Por caso | 1-3 minutos |
| Aprovar (nota 0-10) ou Corrigir e salvar | Por caso | 30 segundos |
| Olhar fila S1 (vermelha) primeiro | Sempre que abrir | - |
| Exportar CSV semanal e checar top erros | 1x por semana | 5 minutos |

## O que o SISTEMA faz sozinho

| Função | Automação |
|--------|-----------|
| Gerar laudo estruturado a partir do ditado/OCR | 100% automático |
| Fazer todos os cálculos (volumes, índices, washout) | 100% automático via Python |
| Bloquear termos proibidos (meta-texto, blacklist) | 100% automático |
| Tentar corrigir erros (até 2x) | 100% automático |
| Classificar risco (S1/S2/S3) | 100% automático |
| Logar custos, latência, erros | 100% automático |
| Rodar testes de regressão toda noite | 100% automático (cron) |

## Quando vira "caso difícil" (vai pra minha fila S1)

- Termo proibido não foi corrigido após 2 tentativas
- Lateralidade suspeita de inversão (direita/esquerda)
- Sistema detectou possível alucinação (achado sem evidência no input)
- Múltiplos campos com `<VERIFICAR>` (dados faltantes)
- Classificação de alto risco clínico (LI-RADS ≥4, PI-RADS ≥4, novas lesões RECIST)

## Ferramentas que vou usar

| Ferramenta | Para quê | Comando |
|------------|----------|---------|
| **Sandbox Streamlit** | Testar casos, aprovar/reprovar | `./scripts/run_sandbox.sh` |
| **SQLite + CSV** | Ver métricas, exportar relatório | `./scripts/export_metrics_csv.sh` |
| **Golden Set** | Garantir que mudanças não quebram | `./scripts/run_golden_tests.sh` |

---

# PARTE A — ARQUITETURA APROVADA

> **Referência completa:** `PLANO_ARQUITETURA_MULTI_AGENTE_RADIOLOGIA.md` (1550 linhas)
> **Status:** APROVADO — NÃO ALTERAR

## Resumo da Arquitetura (6 Camadas)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & PRIVACY FABRIC                     │
│         [Anonimização] [Criptografia] [Audit Trail]             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 0: OBSERVABILIDADE                                         │
│ [Trace ID] [Métricas] [Logs SQLite] [Alertas]                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: INPUT & PREPROCESSING                                   │
│ [Áudio/STT] [OCR] [DICOM] → [Orchestrator] → [CaseBundle]       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: AGENTES ESPECIALIZADOS                                  │
│ [Clinical] [Technical] [Findings] [Comparison] [Oncology]       │
│                    [Calculator Python]                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: SÍNTESE + CONSENSO                                      │
│ [Impression] [Recommendations] [Arbiter] → Feedback Loop        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3.5: ESCALATION GATEWAY (HITL)                             │
│ [Risk Scorer S1/S2/S3] → [Review Queue]                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: QUALITY & FORMATTING                                    │
│ [Banlist] [Blacklist] [Schema Zod] [QA LLM] [Canonicalizer]     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: OUTPUT                                                  │
│ [ReportJSON] → [Markdown] → [PDF]                               │
│ Artefatos: bundle.json, qa_report.json, final_report.md         │
└─────────────────────────────────────────────────────────────────┘
```

## Decisões Técnicas Aprovadas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Backend | Node.js/TypeScript | IO-bound, compartilha tipos com frontend |
| Cálculos | Python FastAPI | Determinístico, LLM nunca calcula |
| Storage (MVP) | SQLite arquivo único | Zero infra, operável por não-dev |
| QA primário | Regex determinístico | Custo $0, latência 1ms |
| QA secundário | LLM sob demanda | Complemento, não substituto |
| Frontend | React + Vite | Já existe no projeto |
| Sandbox | Streamlit | 1 arquivo, 1 comando |

## Regras Clínicas Invioláveis

1. **LLM nunca calcula** — sempre via Calculator Python
2. **Zero meta-texto** — proibido "conforme áudio", "neste laudo", etc.
3. **Dado faltante = `<VERIFICAR>`** — nunca inventar
4. **MAX_ATTEMPTS = 2** — depois vira S1 para humano
5. **Ordem fixa de seções** — renderer determinístico

---

# PARTE B — ADENDO V2 (ROBUSTEZ E MELHORIA CONTÍNUA)

> **Referência completa:** `ADENDO_IMPLEMENTACAO_E_ROBUSTEZ_V2.md`
> **Status:** APROVADO — NÃO ALTERAR

## Pilar 1: Consistência e Determinismo

### Parâmetros por Etapa (fixos)

| Etapa | Temperatura | top_p | Timeout | Retries |
|-------|-------------|-------|---------|---------|
| Extração JSON | **0.0** | 1.0 | 30s | 2 |
| QA LLM | **0.0** | 1.0 | 25s | 1 |
| Self-healing | **0.1** | 0.2 | 35s | 2 |
| Render Markdown | **0.1** | 0.3 | 25s | 1 |

### Contrato de Saída (ordem fixa)

1. TÍTULO
2. INDICAÇÃO
3. TÉCNICA
4. COMPARAÇÃO (se aplicável)
5. ACHADOS (órgãos em ordem fixa)
6. IMPRESSÃO
7. NOTA SOBRE DESCRITORES DE PROBABILIDADE
8. REFERÊNCIAS

### Canonicalizer (pós-processamento)

- Normaliza `\r\n` → `\n`
- Remove espaços duplos
- Remove linhas vazias repetidas
- Aplica blacklist segura

## Pilar 2: Motor Infinito (Feedback Loop)

### O que salvar quando eu corrigir

```
input_bundle (anonimizado) + hash
final_report.md (IA)
final_report_corrected.md (eu)
score_0_10
tags (meta_texto, lateralidade, calculo, etc.)
modalidade, modelo, prompt_version
```

### Schema SQLite (já pronto)

```sql
CREATE TABLE runs (
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

CREATE TABLE feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT,
  corrected_md_path TEXT,
  diff_summary TEXT,
  notes TEXT,
  created_at TEXT
);
```

### Few-shot automático

- Correções viram "exemplos Ouro"
- Seleção por similaridade (TF-IDF simples)
- Inserir 2-4 exemplos mais parecidos no prompt

## Pilar 3: Sandbox para Radiologista

### Funções mínimas

- Colar input / carregar arquivo
- Rodar pipeline
- Ver outputs por agente (JSON)
- Ver QA (pass/fail + motivos)
- Aprovar/Reprovar + nota 0-10
- Salvar correção como Ouro

### Comando único

```bash
./scripts/run_sandbox.sh
# Abre http://localhost:8501
```

## Pilar 4: Observabilidade Simples

### O que logar (automático)

- `case_id` (hash) + timestamp
- modelos usados
- tokens/custo estimado
- latência total + por etapa
- QA pass/fail + motivos
- risk_score (S1/S2/S3)
- nota e tags do radiologista

### Exportar relatório

```bash
./scripts/export_metrics_csv.sh
# Gera: data/runs.csv, data/feedback.csv
```

## Pilar 5: Prevenção de Dores de Cabeça

### Golden Set (testes de regressão)

- 10 casos → 50 → 200 (progressivo)
- Snapshot de Markdown (diff linha-a-linha)
- Schema JSON (Zod/Pydantic)
- Banlist/blacklist
- Prompt injection (adversarial)

### Rollback

1. Kill switch: parar container
2. `git revert` no prompt/config
3. Fallback para versão anterior
4. Notificar sobre casos afetados

---

# PARTE C — ROADMAP SIMPLIFICADO (CUSTO-BENEFÍCIO)

## Fase 1: MVP FUNCIONAL (4 semanas)

**Objetivo:** Sistema rodando end-to-end com 1 modalidade (TC Abdome)

| Entregável | Critério de Aceitação | Custo |
|------------|----------------------|-------|
| Calculator Python | 18 fórmulas passando testes unitários | Baixo |
| Agente Clinical | Gera INDICAÇÃO correta em 10/10 casos teste | Baixo |
| Agente Technical | Gera TÉCNICA correta (equipamento, contraste fixos) | Baixo |
| Agente Findings | Gera ACHADOS com lista de órgãos completa | Médio |
| QA Determinístico | Bloqueia 100% dos termos banlist/blacklist | Baixo |
| Self-healing | Corrige em até 2 tentativas | Baixo |
| Sandbox Streamlit | Roda com 1 comando, salva no SQLite | Baixo |
| Golden Set v1 | 10 casos TC Abdome com snapshots | Baixo |

**Critério de saída MVP:**
- [ ] 10 casos do Golden Set passando 100%
- [ ] Zero meta-texto no output
- [ ] Todos os cálculos vindo do Python
- [ ] Sandbox operável pelo radiologista

## Fase 2: ESTABILIZAÇÃO (4 semanas)

**Objetivo:** Sistema confiável para uso diário com múltiplas modalidades

| Entregável | Critério de Aceitação | Custo |
|------------|----------------------|-------|
| Agente Comparison | Cenários: sem prévio, mesmo serviço, externo | Médio |
| Agente Oncology | RECIST, iRECIST, Choi, Lugano funcionando | Médio |
| Sistema S1/S2/S3 | Classificação automática correta | Baixo |
| Impression Synthesizer | Léxico de certeza padronizado | Médio |
| Parser Sujo JSON | Não crasha com output mal-formado | Baixo |
| Golden Set v2 | 50 casos (TC, RM, USG) com snapshots | Médio |
| Export CSV | Relatório semanal exportável | Baixo |
| Testes adversariais | Prompt injection não afeta output | Médio |

**Critério de saída Estabilização:**
- [ ] 50 casos do Golden Set passando 100%
- [ ] 3 modalidades funcionando (TC, RM, USG)
- [ ] Taxa de S1 < 10%
- [ ] Latência p95 < 30s

## Fase 3: MELHORIA CONTÍNUA (ongoing)

**Objetivo:** Sistema que aprende e melhora com o tempo

| Entregável | Critério de Aceitação | Custo |
|------------|----------------------|-------|
| Few-shot automático | Exemplos Ouro inseridos automaticamente | Médio |
| Drift Sentinel | Detecta novos termos semanalmente | Baixo |
| Nightly Regression | Golden Set roda toda noite (cron) | Baixo |
| Golden Set v3 | 200 casos estratificados | Alto |
| Dashboard métricas | Streamlit lendo SQLite | Baixo |
| Alertas simples | Script diário imprime anomalias | Baixo |
| Shadow mode | Nova versão roda em paralelo antes de promover | Médio |

**Critério de saída (trimestral):**
- [ ] Taxa de reprovação < 5%
- [ ] Custo médio por laudo estável
- [ ] Top 5 erros com tendência de queda

---

# CHECKLIST DE IMPLEMENTAÇÃO (30 itens)

## Setup (5 itens)

- [ ] Criar branch `feature/multi-agent-v3`
- [ ] Criar estrutura: `src/core/reportGeneration/`, `services/calculator/`, `tools/sandbox/`
- [ ] Setup Python venv + FastAPI + Pydantic
- [ ] Criar `data/metrics.sqlite` com schema
- [ ] Coletar 10 casos anonimizados para Golden Set v1

## Calculator Python (5 itens)

- [ ] Implementar 18 fórmulas whitelist
- [ ] Testes unitários com valores conhecidos
- [ ] Teste de divisão por zero
- [ ] API `/compute` + `/health`
- [ ] Cliente TypeScript

## Agentes Core (6 itens)

- [ ] Clinical Agent + testes
- [ ] Technical Agent + regras fixas (equipamento, contraste)
- [ ] Findings Agent + lista de órgãos
- [ ] Integração Findings ↔ Calculator
- [ ] Impression Synthesizer + léxico de certeza
- [ ] Orchestrator chamando sequência completa

## QA e Self-healing (5 itens)

- [ ] Banlist (frases específicas, não palavras soltas)
- [ ] Blacklist terminológica
- [ ] Self-healing loop (MAX_ATTEMPTS=2)
- [ ] Parser Sujo para JSON da LLM
- [ ] Risk Scorer (S1/S2/S3)

## Sandbox e Observabilidade (5 itens)

- [ ] Streamlit app.py básico
- [ ] Botões Aprovar/Reprovar + nota
- [ ] Salvar no SQLite
- [ ] Script `export_metrics_csv.sh`
- [ ] Script `run_golden_tests.sh`

## Testes e Segurança (4 itens)

- [ ] Golden Set v1 (10 casos) + snapshots
- [ ] Testes adversariais (prompt injection)
- [ ] Anonimização de PHI antes de LLM
- [ ] Plano de rollback documentado

---

# CHECKLIST DE OPERAÇÃO (RADIOLOGISTA)

## Diário

- [ ] Abrir Sandbox (`./scripts/run_sandbox.sh`)
- [ ] Processar casos começando pela fila S1 (vermelha)
- [ ] Para cada caso: revisar → aprovar/corrigir → nota
- [ ] Se corrigir: salvar como Ouro

## Semanal

- [ ] Exportar CSV (`./scripts/export_metrics_csv.sh`)
- [ ] Abrir `data/runs.csv` no Excel/Sheets
- [ ] Checar: top 10 erros por tag, custo p95, falhas QA repetidas
- [ ] Se padrão de erro repetido: abrir issue para dev

## Quando algo quebrar

- [ ] Parar de usar até resolver
- [ ] Rodar `./scripts/run_golden_tests.sh`
- [ ] Se testes falharem: reverter última mudança
- [ ] Se persistir: chamar suporte técnico

---

# O QUE NÃO SERÁ FEITO AGORA

## Fase MVP (excluído)

| Item | Motivo | Quando considerar |
|------|--------|-------------------|
| Fine-tuning de modelo | Caro, precisa de 200+ casos | Fase 3 |
| Dashboard customizado React | Streamlit resolve | Se Streamlit não escalar |
| Banco de dados PostgreSQL | SQLite resolve até 50k laudos | Se volume explodir |
| Kubernetes/Docker Swarm | Overkill para MVP | Se precisar multi-instância |
| CI/CD completo | Testes manuais no MVP | Fase 2 |
| Integração RIS/PACS | Foco no core primeiro | Após estabilização |
| App mobile | Web resolve | Demanda específica |
| Multi-idioma | Português BR apenas | Expansão internacional |

## Decisões adiadas

| Decisão | Status | Revisar quando |
|---------|--------|----------------|
| Qual modelo usar em produção | Testar o4-mini vs Gemini Flash | Final do MVP |
| Cache de embeddings | Não implementar agora | Se latência > 30s |
| Fila com Redis | Não implementar agora | Se rate limit > 100 RPM |
| Audit trail completo | Básico no SQLite | Requisito compliance |

## Fora de escopo permanente

- Diagnóstico autônomo sem revisão humana
- Integração com prontuário eletrônico (fora do sistema)
- Geração de imagens/figuras
- Tradução automática de laudos

---

# ESTRUTURA DE ARQUIVOS FINAL

```
radon-lite/
├── src/
│   ├── core/
│   │   └── reportGeneration/
│   │       ├── agents/
│   │       │   ├── clinical.ts
│   │       │   ├── technical.ts
│   │       │   ├── findings.ts
│   │       │   ├── comparison.ts
│   │       │   ├── oncology.ts
│   │       │   └── impression.ts
│   │       ├── qa/
│   │       │   ├── deterministic.ts   # banlist/blacklist
│   │       │   ├── llm-qa.ts
│   │       │   └── self-healing.ts
│   │       ├── orchestrator.ts
│   │       ├── risk-scorer.ts
│   │       └── renderer.ts            # JSON → Markdown
│   ├── services/
│   │   └── calculator-client.ts
│   ├── types/
│   │   ├── report-json.ts
│   │   ├── compute-request.ts
│   │   └── qa-result.ts
│   └── utils/
│       ├── banlist.ts
│       ├── blacklist.ts
│       └── llm-json-parser.ts
├── services/
│   └── calculator/
│       ├── main.py                    # FastAPI
│       ├── formulas.py                # 18 fórmulas
│       ├── schemas.py                 # Pydantic
│       └── tests/
│           └── test_formulas.py
├── tools/
│   └── sandbox/
│       └── app.py                     # Streamlit
├── scripts/
│   ├── setup.sh
│   ├── run_sandbox.sh
│   ├── run_golden_tests.sh
│   ├── export_metrics_csv.sh
│   └── nightly_regression.sh
├── data/
│   ├── metrics.sqlite
│   └── cases/
│       └── <case_id>/...
├── tests/
│   └── golden-set/
│       ├── cases.json
│       └── snapshots/
└── docs/
    └── specs/
        ├── PLANO_ARQUITETURA_MULTI_AGENTE_RADIOLOGIA.md
        ├── ADENDO_IMPLEMENTACAO_E_ROBUSTEZ_V2.md
        └── PLANO_CONSOLIDADO_MULTIAGENTE_V1.md  # ESTE DOCUMENTO
```

---

# PRÓXIMO PASSO IMEDIATO

```bash
# Hoje — criar estrutura base
git checkout -b feature/multi-agent-v3

mkdir -p src/core/reportGeneration/agents
mkdir -p src/core/reportGeneration/qa
mkdir -p services/calculator
mkdir -p tools/sandbox
mkdir -p scripts
mkdir -p data/cases
mkdir -p tests/golden-set

# Setup Python
cd services/calculator
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic pytest httpx

# Criar SQLite
python - <<'PY'
import sqlite3
con = sqlite3.connect('../../data/metrics.sqlite')
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
con.commit()
con.close()
print('OK: data/metrics.sqlite criado')
PY

# Primeiro commit
git add .
git commit -m "feat: scaffold multi-agent architecture v3"
```

---

**Documento consolidado por Staff Engineer**
**Aprovado para execução**
**Foco: Alto custo-benefício, baixa manutenção, operável por radiologista**

# Plano de Execução Detalhado: Arquitetura Multi-Agente Radon V3

**Versão:** 1.0.0
**Data:** 20 de Janeiro de 2026
**Autor:** Staff Engineer
**Projeto:** radon-lite → Radon V3 Industrial Evolution
**Status:** PRONTO PARA EXECUÇÃO

---

## 1. Análise do Estado Atual

### 1.1 Inventário do Codebase Existente

```
radon-lite/
├── src/
│   ├── adapters/           ✅ Já existe (Gemini, schemas, prompts)
│   ├── features/
│   │   ├── ocr-batch/      ✅ Completo (OCR pipeline)
│   │   ├── audio/          ✅ Existe (AudioRecorder, transcription)
│   │   ├── workspace/      ✅ Existe
│   │   ├── clinical/       ✅ Existe (ClinicalTab)
│   │   ├── reports/        ✅ Existe (ReportGroupCard)
│   │   └── checklist/      ✅ Existe
│   ├── hooks/
│   │   └── pipeline/       ✅ Existe (reducer, types)
│   ├── utils/              ✅ Existe (retry, json, similarity)
│   └── components/         ✅ Existe (templates, UI)
├── Stack: React 19 + Vite 7 + TypeScript + Zod + Gemini API
└── Testes: Vitest + Playwright
```

### 1.2 O Que Já Temos vs O Que Falta

| Componente | Status | Ação Necessária |
|------------|--------|-----------------|
| OCR Pipeline | ✅ Completo | Integrar com Layer 1 |
| Audio Transcription | ✅ Completo | Integrar com Layer 1 |
| Gemini Adapter | ✅ Existe | Expandir para multi-agent |
| Zod Schemas | ✅ Existe | Adicionar ReportJSON, ComputeRequest |
| Calculator Service | ❌ Não existe | **CRIAR** (Python/FastAPI) |
| Multi-Agent Pipeline | ❌ Não existe | **CRIAR** (core/reportGeneration) |
| QA Determinístico | ❌ Não existe | **CRIAR** (banlist/blacklist) |
| Review Dashboard | ❌ Não existe | **CRIAR** (frontend) |
| Risk Scoring (S1/S2/S3) | ❌ Não existe | **CRIAR** |

### 1.3 Decisão Arquitetural: Onde Implementar

```
OPÇÃO ESCOLHIDA: Monorepo com serviço Python separado

radon-lite/
├── src/                    # Frontend React (existente)
├── services/
│   └── calculator/         # 🆕 Python FastAPI (novo)
└── server/                 # 🆕 Node.js Express (novo, opcional)
```

---

## 2. Roadmap de Execução (12 Semanas)

### SPRINT 0: Setup e Preparação (Dias 1-3)

#### Dia 1: Infraestrutura Base
- [ ] Criar branch `feature/multi-agent-v3`
- [ ] Criar estrutura de diretórios:
  ```bash
  mkdir -p src/core/reportGeneration/agents
  mkdir -p src/core/reportGeneration/qa
  mkdir -p services/calculator
  mkdir -p tests/golden-set
  ```
- [ ] Configurar Python environment:
  ```bash
  cd services/calculator
  python -m venv venv
  pip install fastapi uvicorn pydantic pytest
  ```

#### Dia 2: Schemas Fundamentais
- [ ] Criar `src/types/report-json.ts`:
  ```typescript
  // Ver especificação completa no PLANO_ARQUITETURA
  export const ReportJSONSchema = z.object({...})
  ```
- [ ] Criar `src/types/compute-request.ts`
- [ ] Criar `src/types/qa-result.ts`
- [ ] Criar `services/calculator/schemas.py`

#### Dia 3: Golden Set Inicial
- [ ] Coletar 10 casos reais de referência (anonimizados)
- [ ] Criar `tests/golden-set/cases.json` com:
  - 3 casos USG simples
  - 3 casos TC com contraste
  - 2 casos com cálculos (washout, volume)
  - 2 casos oncológicos (RECIST)
- [ ] Documentar output esperado para cada caso

**Critério de Saída Sprint 0:**
- [ ] Branch criada e estrutura de pastas existe
- [ ] Schemas TypeScript e Python compilando
- [ ] Golden Set com 10 casos documentados

---

### SPRINT 1: Calculator Service (Semana 1)

#### Dias 4-5: Core Calculator
- [ ] Implementar `services/calculator/formulas.py`:
  ```python
  # Fórmulas whitelist (ver PLANO_ARQUITETURA Parte 3.4)
  def volume_ellipsoid(d1, d2, d3): return 0.52 * d1 * d2 * d3
  def resistive_index(vps, vd): return (vps - vd) / vps
  def adrenal_washout(hu_pre, hu_portal, hu_delayed): ...
  def steatosis_grade(liver_hu): ...
  # ... todas as 18 fórmulas
  ```

#### Dias 6-7: API FastAPI
- [ ] Implementar `services/calculator/main.py`:
  ```python
  @app.post("/compute")
  def compute(batch: CalcBatch) -> List[CalcResult]: ...

  @app.get("/health")
  def health(): ...
  ```
- [ ] Testes unitários com valores conhecidos
- [ ] Testes de divisão por zero

#### Dia 8: Cliente TypeScript
- [ ] Implementar `src/services/calculator-client.ts`:
  ```typescript
  export async function computeFormulas(requests: ComputeRequest[]): Promise<ComputeResult[]>
  ```
- [ ] Configurar variável `CALC_URL` no `.env`

**Critério de Saída Sprint 1:**
- [ ] `pytest services/calculator/` passa 100%
- [ ] Calculator rodando em `localhost:8081`
- [ ] Cliente TS consegue chamar e receber resultados

---

### SPRINT 2: Agentes Core - Clinical & Technical (Semana 2)

#### Dias 9-10: Clinical Agent
- [ ] Criar `src/core/reportGeneration/agents/clinical.ts`:
  ```typescript
  export async function processClinicalIndication(input: CaseBundle): Promise<ClinicalOutput>
  ```
- [ ] Prompt especializado (faixa etária OMS, terminologia)
- [ ] Testes com 5 casos do Golden Set

#### Dias 11-12: Technical Agent
- [ ] Criar `src/core/reportGeneration/agents/technical.ts`:
  ```typescript
  export async function generateTechniqueSection(input: CaseBundle): Promise<TechnicalOutput>
  ```
- [ ] Regras fixas: equipamento, contraste Henetix®
- [ ] Mapear modalidade → protocolo

#### Dia 13: Integração Layer 1
- [ ] Criar `src/core/reportGeneration/orchestrator.ts`:
  ```typescript
  export async function processCase(bundle: CaseBundle): Promise<ReportJSON>
  ```
- [ ] Integrar OCR existente como input
- [ ] Integrar Audio existente como input

**Critério de Saída Sprint 2:**
- [ ] Clinical + Technical agents funcionando isoladamente
- [ ] Orchestrator chamando sequencialmente
- [ ] 5 casos do Golden Set passando (seções INDICAÇÃO e TÉCNICA)

---

### SPRINT 3: Findings Agent + Calculator Integration (Semana 3)

#### Dias 14-16: Findings Agent (Complexo)
- [ ] Criar `src/core/reportGeneration/agents/findings.ts`:
  ```typescript
  export async function generateFindings(
    input: CaseBundle,
    clinicalContext: ClinicalOutput
  ): Promise<FindingsOutput>
  ```
- [ ] Lista sistemática de órgãos (17 itens)
- [ ] Geração de `compute_requests[]` quando necessário
- [ ] Marcador `<VERIFICAR>` para dados ausentes

#### Dias 17-18: Integração Calculator
- [ ] Pipeline: Findings → compute_requests → Calculator → compute_results
- [ ] Injeção de compute_results no output final
- [ ] Teste com caso de washout adrenal
- [ ] Teste com caso de volume prostático

**Critério de Saída Sprint 3:**
- [ ] Findings Agent gerando seção ACHADOS completa
- [ ] Cálculos vindo do Python (não do LLM)
- [ ] 7 casos do Golden Set passando

---

### SPRINT 4: Synthesis + QA Determinístico (Semana 4)

#### Dias 19-20: Impression Synthesizer
- [ ] Criar `src/core/reportGeneration/agents/impression.ts`
- [ ] Léxico de certeza padronizado
- [ ] Estrutura: diagnóstico principal, diferenciais, recomendações

#### Dias 21-22: QA Determinístico
- [ ] Criar `src/core/reportGeneration/qa/deterministic.ts`:
  ```typescript
  export function checkBanlist(text: string): QAResult
  export function checkBlacklist(text: string): QAResult
  export function checkStructure(report: ReportJSON): QAResult
  ```
- [ ] Implementar BANLIST_CORRECT (frases específicas, não palavras soltas)
- [ ] Implementar BLACKLIST terminológica

#### Dias 23: Self-Healing Loop
- [ ] Implementar `src/core/reportGeneration/qa/self-healing.ts`:
  ```typescript
  const MAX_ATTEMPTS = 2;
  export async function healReport(draft: ReportJSON, qaResult: QAResult): Promise<ReportJSON>
  ```
- [ ] Prompt de feedback injetado
- [ ] Flag S1 se falhar após 2 tentativas

**Critério de Saída Sprint 4:**
- [ ] Laudo completo sendo gerado (todas as seções)
- [ ] QA bloqueando termos proibidos
- [ ] Self-healing corrigindo em até 2 tentativas
- [ ] 9 casos do Golden Set passando

---

### SPRINT 5: Comparison + Oncology Agents (Semana 5)

#### Dias 24-25: Comparison Agent
- [ ] Criar `src/core/reportGeneration/agents/comparison.ts`
- [ ] Cenários: sem prévio, mesmo serviço, externo, filme, USG vs TC
- [ ] Cálculo de variação percentual para RECIST

#### Dias 26-27: Oncology Agent
- [ ] Criar `src/core/reportGeneration/agents/oncology.ts`
- [ ] RECIST 1.1, iRECIST, Choi, Lugano
- [ ] Formatação de lesões-alvo/não-alvo
- [ ] Categorização automática (CR, PR, SD, PD)

#### Dia 28: Integração
- [ ] Orchestrator chamando Comparison e Oncology quando aplicável
- [ ] Teste com 2 casos oncológicos do Golden Set

**Critério de Saída Sprint 5:**
- [ ] Agentes especializados funcionando
- [ ] 10/10 casos do Golden Set passando
- [ ] Casos oncológicos com categorização correta

---

### SPRINT 6: Risk Scoring + Review Dashboard (Semana 6)

#### Dias 29-30: Sistema de Filas S1/S2/S3
- [ ] Criar `src/core/reportGeneration/risk-scorer.ts`:
  ```typescript
  export function classifyRisk(report: ReportJSON, telemetry: Telemetry): RiskLevel
  ```
- [ ] Critérios S1: hard gate fail, lateralidade, alucinação
- [ ] Critérios S2: auto-fix, latência alta, múltiplos VERIFICAR
- [ ] Critérios S3: passou tudo

#### Dias 31-32: Review Dashboard (Frontend)
- [ ] Criar `src/features/review/ReviewDashboard.tsx`
- [ ] Tabs por nível de risco (S1 vermelha, S2 laranja, S3 verde)
- [ ] Lista de casos pendentes de revisão

#### Dia 33: Tags de Feedback
- [ ] Criar `src/features/review/FeedbackTags.tsx`
- [ ] Checkboxes: Terminologia, Lateralidade, Medidas, Alucinação, etc.
- [ ] Salvar feedback estruturado

**Critério de Saída Sprint 6:**
- [ ] Casos sendo classificados em S1/S2/S3 automaticamente
- [ ] Dashboard mostrando filas
- [ ] Feedback sendo coletado com tags

---

### SPRINT 7: QA LLM + Shadow Critic (Semana 7)

#### Dias 34-35: QA por LLM
- [ ] Criar `src/core/reportGeneration/qa/llm-qa.ts`:
  ```typescript
  export async function semanticQA(report: ReportJSON): Promise<QAResult>
  ```
- [ ] Prompt de auditoria (style guide, léxico, completude)
- [ ] Executar APÓS QA determinístico

#### Dias 36-37: Shadow Critic
- [ ] Criar `src/features/review/ShadowCritic.tsx`
- [ ] Botão "Auditar com IA"
- [ ] Chamada sob demanda (não automática)
- [ ] Exibição de feedback do segundo modelo

#### Dia 38: Gating (Escalação de Modelo)
- [ ] Criar `src/core/reportGeneration/gating.ts`
- [ ] Lógica: Flash → Pro → Humano
- [ ] Contagem de tentativas por tier

**Critério de Saída Sprint 7:**
- [ ] QA LLM detectando problemas semânticos
- [ ] Shadow Critic funcionando sob demanda
- [ ] Gating escalando corretamente

---

### SPRINT 8: Consensus Arbiter + HITL Gateway (Semana 8)

#### Dias 39-40: Consensus Arbiter
- [ ] Criar `src/core/reportGeneration/consensus.ts`
- [ ] Detecção de discordância entre agentes
- [ ] Terceiro agente "juiz" se threshold excedido

#### Dias 41-42: Escalation Gateway
- [ ] Criar `src/core/reportGeneration/escalation.ts`
- [ ] Critérios de HITL: LI-RADS ≥4, PI-RADS ≥4, novas lesões
- [ ] Integração com Review Dashboard

#### Dia 43: Review Queue
- [ ] Fila de casos aguardando revisão humana
- [ ] Workflow: revisar → aprovar/rejeitar → feedback
- [ ] Notificação quando caso entra em S1

**Critério de Saída Sprint 8:**
- [ ] Discordâncias sendo detectadas e arbitradas
- [ ] Casos de alto risco escalando para humano
- [ ] Workflow de revisão completo

---

### SPRINT 9: Parser Sujo + Observabilidade (Semana 9)

#### Dias 44-45: Parser Sujo para JSON
- [ ] Criar `src/utils/llm-json-parser.ts`:
  ```typescript
  export function parseGeminiJSON(raw: string): any {
    // Remove ```json, prefixos, sufixos
  }
  ```
- [ ] Testes com outputs reais mal-formados

#### Dias 46-47: Telemetria e Logs
- [ ] Criar `src/core/reportGeneration/telemetry.ts`
- [ ] Trace ID por caso
- [ ] Métricas: latência por agente, tokens, taxa de erro
- [ ] Logs estruturados (sem PHI)

#### Dia 48: Artefatos por Caso
- [ ] Salvar: bundle.json, agent_outputs/, compute_*.json, qa_reports/, final_report.*
- [ ] Implementar política de retenção (30 dias intermediários)

**Critério de Saída Sprint 9:**
- [ ] Parser não crashando com outputs mal-formados
- [ ] Trace ID aparecendo em todos os logs
- [ ] Artefatos sendo salvos corretamente

---

### SPRINT 10: Segurança + LGPD (Semana 10)

#### Dias 49-50: Anonimização de PHI
- [ ] Criar `src/core/security/anonymizer.ts`:
  ```typescript
  export function anonymizeBundle(bundle: CaseBundle): AnonymizedBundle
  ```
- [ ] Remover: nome, CPF, data nascimento
- [ ] Manter: faixa etária, sexo, contexto clínico sanitizado

#### Dias 51-52: Audit Trail
- [ ] Criar `src/core/security/audit.ts`
- [ ] Registrar: timestamp, action, case_id, user_id, agent_chain
- [ ] Storage imutável (append-only)

#### Dia 53: Controle de Acesso
- [ ] Roles: médico, técnico, admin, auditor
- [ ] Permissões por role (ver PLANO_ARQUITETURA 7.3)

**Critério de Saída Sprint 10:**
- [ ] PHI nunca enviado para LLM externo
- [ ] Audit trail completo para cada caso
- [ ] Acesso controlado por role

---

### SPRINT 11: Scripts Operacionais (Semana 11)

#### Dias 54-55: Nightly Regression
- [ ] Criar `scripts/nightly_regression.py`:
  ```python
  def run_golden_set():
      for case in load_golden_set():
          result = process_case(case)
          compare_with_expected(result, case.expected)
  ```
- [ ] Paralelismo com ThreadPoolExecutor
- [ ] Relatório de regressões

#### Dias 56-57: Drift Sentinel
- [ ] Criar `scripts/drift_sentinel.py`
- [ ] Detectar novos termos não previstos
- [ ] Sugerir atualizações de glossário
- [ ] Alerta se frequência de termo anômala

#### Dia 58: Weekly Report
- [ ] Criar `scripts/weekly_exec_report.py`
- [ ] Métricas: volume, taxa S1/S2/S3, termos mais corrigidos
- [ ] Formato executivo para gestão

**Critério de Saída Sprint 11:**
- [ ] Scripts rodando em cron
- [ ] Regressões sendo detectadas automaticamente
- [ ] Relatório semanal sendo gerado

---

### SPRINT 12: Testes E2E + Deploy (Semana 12)

#### Dias 59-60: Testes E2E com Playwright
- [ ] Criar `e2e/report-generation.spec.ts`
- [ ] Fluxo completo: upload → processamento → revisão → aprovação
- [ ] Testes de regressão visual

#### Dias 61-62: Testes de Carga
- [ ] Criar `scripts/load_test.py`
- [ ] Simular 100 casos simultâneos
- [ ] Identificar gargalos (rate limit Gemini?)
- [ ] Implementar fila se necessário

#### Dia 63: Documentação Final
- [ ] Atualizar README.md
- [ ] Documentar API contracts
- [ ] Criar guia de troubleshooting

#### Dia 64-65: Deploy Staging
- [ ] Configurar ambiente staging
- [ ] Deploy Calculator Service (container Python)
- [ ] Deploy Frontend (Vercel/similar)
- [ ] Smoke tests em staging

**Critério de Saída Sprint 12:**
- [ ] Testes E2E passando
- [ ] Sistema funcionando em staging
- [ ] Documentação completa

---

## 3. Métricas de Sucesso (KPIs)

### 3.1 Métricas de Qualidade

| Métrica | Target | Medição |
|---------|--------|---------|
| Taxa QA pass (1º ciclo) | > 85% | `qa_passed / total_reports` |
| Taxa QA pass (após correção) | > 99% | `qa_passed_final / total_reports` |
| Zero meta-texto | 100% | `reports_without_metatext / total` |
| Zero blacklist | 100% | `reports_without_blacklist / total` |
| Cálculos corretos | 100% | `correct_calculations / total_calculations` |

### 3.2 Métricas de Performance

| Métrica | Target | Medição |
|---------|--------|---------|
| Latência E2E (p95) | < 30s | Telemetria |
| Latência Calculator | < 100ms | Telemetria |
| Taxa de escalação HITL | < 5% | `s1_cases / total_cases` |
| Throughput | > 100 laudos/hora | Contagem por hora |

### 3.3 Métricas de Operação

| Métrica | Target | Medição |
|---------|--------|---------|
| Disponibilidade | > 99.5% | Uptime monitor |
| Taxa de erro | < 1% | `errors / requests` |
| Tempo médio de revisão | < 2 min | Analytics frontend |

---

## 4. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rate limit Gemini | Alta | Médio | Implementar fila (BullMQ) |
| Alucinação em massa | Baixa | Crítico | Kill switch, rollback, Golden Set |
| Falsos positivos na banlist | Média | Médio | Usar frases específicas, não palavras |
| Latência alta | Média | Médio | Cache de prompts, modelo Flash para estilo |
| Dados de teste insuficientes | Alta | Alto | Coletar mais casos reais anonimizados |

---

## 5. Próximo Passo Imediato (Hoje)

### Checklist do Dia 1:

```bash
# 1. Criar branch
git checkout -b feature/multi-agent-v3

# 2. Criar estrutura
mkdir -p src/core/reportGeneration/agents
mkdir -p src/core/reportGeneration/qa
mkdir -p services/calculator
mkdir -p tests/golden-set

# 3. Setup Python
cd services/calculator
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic pytest httpx

# 4. Criar arquivos base
touch src/types/report-json.ts
touch src/types/compute-request.ts
touch services/calculator/main.py
touch services/calculator/formulas.py
touch services/calculator/schemas.py

# 5. Primeiro commit
git add .
git commit -m "feat: scaffold multi-agent architecture v3"
```

---

## 6. Checklist de Validação Final

### Antes de ir para Produção:

- [ ] Golden Set com 20+ casos passando 100%
- [ ] Nenhum termo da blacklist no output
- [ ] Nenhum meta-texto no output
- [ ] Todos os cálculos vindo do Calculator (não do LLM)
- [ ] Sistema de filas S1/S2/S3 funcionando
- [ ] Review Dashboard operacional
- [ ] Tags de feedback coletando dados
- [ ] Audit trail completo
- [ ] PHI anonimizado antes de LLM
- [ ] Plano de rollback testado
- [ ] Documentação atualizada
- [ ] Treinamento da equipe concluído

---

**Documento elaborado por Staff Engineer**
**Aprovação pendente**
**Início de execução: Dia 1 - Setup inicial**

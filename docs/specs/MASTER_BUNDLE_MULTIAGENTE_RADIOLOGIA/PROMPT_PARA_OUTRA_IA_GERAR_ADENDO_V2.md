# PROMPT PARA OUTRA IA — ADENDO DE IMPLEMENTAÇÃO E ROBUSTEZ (V2)

## Contexto
Você é uma IA atuando como **Staff Engineer** para um sistema multi-agente de geração de laudos radiológicos. Eu (usuário) sou **radiologista** (não desenvolvedor). Já existe um **plano arquitetural** e um **plano de execução** aprovados.

### Restrições inegociáveis
- **NÃO alterar** o plano original.
- **NÃO reescrever** seções existentes.
- **APENAS acrescentar** um **“Adendo de Implementação e Robustez (V2)”**.
- Foco em soluções **alto custo-benefício**, **baixa manutenção** e **plug-and-play**.
- Tudo precisa ser **gerenciável por um radiologista**: comandos simples, scripts prontos, e pouca necessidade de mexer em código.

### Objetivo do Adendo
Criar uma camada tática que transforme o sistema multi-agente em um **motor de melhoria contínua**, com determinismo (I/O), guardrails anti-alucinação, ciclo de feedback (golden set), sandbox de testes para radiologista, observabilidade simples (custos/latência/erros) e testes de regressão.

## O Pedido (entregáveis)
Produza um documento chamado **“ADENDO DE IMPLEMENTAÇÃO E ROBUSTEZ (V2)”** com as seções abaixo. **Não repita o plano original.** O adendo deve ser diretamente colável no final do plano aprovado.

### Formato obrigatório do output
1) Comece com:
- **Versão**, **Data**, **Status**, **Escopo**
- **Checklist de aceitação** (bullet list)

2) Depois, crie exatamente estas seções (1 a 6):

#### 1. Consistência e Determinismo (Input/Output)
- Defina um **Contrato de Saída**: JSON estrito + renderer determinístico.
- Guardrails anti-alucinação médica (banlist/blacklist, checagem de “não inventar”, “<VERIFICAR>”).
- **Parâmetros exatos** por etapa (ex.: extração estruturada vs. reescrita vs. síntese). Informe:
  - temperatura, top_p, frequency_penalty, presence_penalty
  - retries e timeouts
  - quando usar seed (se existir)
- Defina uma **ordem fixa de seções** do laudo e regras de quebra de linha.
- Inclua um **canonicalizer** determinístico (pós-processamento) para normalizar layout.

#### 2. O “Motor Infinito” (Ciclo de Feedback / Active Learning)
- Proponha um fluxo para salvar **automaticamente** correções do radiologista:
  - input normalizado, output IA, output corrigido, nota 0–10, tags de erro, modalidade.
- Defina um banco simples (preferência: **SQLite arquivo único**, com export CSV).
- Mostre como transformar correções em:
  - **few-shot automático** (RAG por similaridade + exemplos “antes/depois”)
  - critérios para, no futuro, **fine-tuning** (quando fizer sentido, e pré-requisitos)
- Inclua governança: versão de prompt, versão de modelo, data, e hash de caso.

#### 3. Interface de Testes (Sandbox para o Radiologista)
- Proponha uma UI independente (Streamlit ou Gradio), com:
  - caixa para colar input
  - botões para rodar pipeline e ver outputs por agente
  - mostrar QA (pass/fail + motivos)
  - botões **Aprovar/Reprovar**, nota 0–10, campo de comentário
  - botão “Salvar correção como Ouro”
- Deve rodar local com **um comando** e/ou fácil na nuvem.
- Traga um esqueleto de pastas e scripts `./scripts/run_sandbox.sh`.

#### 4. Catalogação e Observabilidade (A “Caixa Preta”)
- Defina logs simples e úteis, preferencialmente:
  - artifacts em pasta por caso
  - metadata em SQLite
  - export CSV + visão em Streamlit
- Campos mínimos: case_id, modalidade, timestamp, modelos usados, tokens, custo estimado, latência, risk_score, qa_pass, nota do médico, tags, paths.
- Inclua alertas simples (ex.: custo anormal, falha repetida QA).

#### 5. Prevenção de Dores de Cabeça Futuras (Escalabilidade e Erros)
- Testes automatizados **sem quebrar o que já funciona**:
  - golden set snapshot
  - regressão de estilo/format
  - testes adversariais (prompt injection)
  - fuzz/validação de JSON
  - property-based para calculator
- Estratégia de rollout: canary/shadow mode + rollback.
- Privacidade (LGPD): anonimização, armazenamento, retenção, criptografia.
- Latência: caching, limites de concorrência, filas, timeouts.

#### 6. Implementação Prática (Nível Não-Dev)
- Um passo-a-passo executável (comandos).
- Scripts plug-and-play:
  - `./scripts/setup.sh`
  - `./scripts/run_pipeline.sh`
  - `./scripts/run_golden_tests.sh`
  - `./scripts/run_sandbox.sh`
  - `./scripts/export_metrics_csv.sh`
- “Como eu opero isso no dia a dia”: checklist operacional do radiologista.

### Regras adicionais
- Assuma que o projeto é **monorepo** e já tem pipeline e schemas.
- Evite introduzir ferramentas complexas (K8s, ELK, etc.) a menos que seja opcional.
- Prefira soluções simples: SQLite, CSV, pastas de artefato, Streamlit/Gradio.
- Toda recomendação deve vir com **critérios de aceitação** e **testes**.

## Materiais anexos
Vou te fornecer (como anexos) os arquivos de plano aprovados. Você deve referenciá-los apenas para manter compatibilidade, sem alterá-los.

## Saída final
Entregue apenas:
1) O texto do **ADENDO DE IMPLEMENTAÇÃO E ROBUSTEZ (V2)**
2) Uma seção final “**Checklist de PRs sugeridos**” (lista curta)

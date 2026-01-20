# MASTER PROMPT — ADENDO V2 (UNIFICADO) PARA ROBUSTEZ E MELHORIA CONTÍNUA

## Contexto
Você é uma IA atuando como **Staff Engineer / Arquiteto de Software**. Estou desenvolvendo um sistema multi-agente para geração de laudos radiológicos. **O plano arquitetural e o plano de execução já estão aprovados.**

**Meu perfil:** sou radiologista (não desenvolvedor). Eu preciso de soluções:
- fáceis de operar no dia a dia;
- de alto custo-benefício;
- com pouca manutenção e baixa complexidade de código;
- com foco em consistência/determinismo do output, segurança clínica, testes e melhoria contínua.

## Regras (OBRIGATÓRIAS)
1) **NÃO altere** o plano original (arquitetura/executivo). **NÃO reescreva** o plano. **NÃO troque decisões já tomadas.**
2) Seu trabalho é **APENAS adicionar** um **“ADENDO DE IMPLEMENTAÇÃO E ROBUSTEZ (V2)”**, que será colado no final do plano existente.
3) Seja **prescritivo e operacional**, com checklists e passos executáveis.
4) Se sugerir scripts, que sejam **plug-and-play** (rodar com 1–2 comandos), com poucos arquivos, e com dependências simples.
5) Evite soluções que exijam infra complexa. Priorize:
   - SQLite arquivo único (ou CSV) para logs;
   - armazenamento local + opcional S3/GCS;
   - UI provisória em Streamlit/Gradio.
6) **Privacidade e compliance:** considere PHI/PII por padrão. Proponha minimização e controles de retenção.
7) **Determinismo do laudo:** o laudo final **não pode conter meta-referências** (ex.: “conforme áudio”, “segundo input”, “neste laudo”, “os achados acima”, “na impressão”).

## O que você vai receber
- Um plano arquitetural (multi-agente)
- Um plano de execução detalhado V1
- (Opcional) packs de prompts e blacklists

## Sua entrega (FORMATO FIXO)
Responda **somente** com os itens abaixo, nesta ordem:

1) **ADENDO V2 — Implementação e Robustez** (texto colável)
2) **Checklist de Implementação (10–20 itens)**
3) **Checklist de Operação pelo Radiologista (5–10 itens)**
4) **Tabela “Testes Obrigatórios”** (nome do teste, objetivo, entrada/saída, automação)
5) **Scripts Plug-and-Play** (somente quando necessário) — com instruções de execução

> IMPORTANTE: não inclua nenhum outro texto fora desses itens.

---

# Conteúdo do ADENDO V2 (o que deve cobrir)

## Pilar 1) Consistência e Determinismo (Input/Output)
Detalhe como garantir output previsível:
- **Contrato de Saída**: JSON canônico (ReportJSON) + renderer determinístico → Markdown/PDF.
- **Canonicalizer/Formatter**: normalizar quebras de linha, separadores, títulos, ordem de seções.
- **Guardrails anti-alucinação**:
  - hierarquia de fontes (dados estruturados > texto livre);
  - “não inventar”, “não inferir sem evidência”;
  - “se faltar, usar <VERIFICAR> e reduzir assertividade”.
- **Banlist de meta-texto** + como aplicar (regex + QA por LLM).
- **Parâmetros exatos** por etapa:
  - etapas estruturadas (JSON): temperatura baixa, top_p baixo;
  - etapas de linguagem (renderer): temperatura baixa-média;
  - inclua valores sugeridos (ex.: temp 0–0.2 / top_p 0.1–0.3) e justificativa.

## Pilar 2) “Motor Infinito” (Feedback / Active Learning)
Criar ciclo de melhoria contínua sem complexidade:
- Quando eu corrigir um laudo, registrar:
  - input normalizado (hash), output original, output corrigido, tags do erro, nota 0–10.
- Estrutura do **Banco Ouro** (SQLite + export CSV).
- Como usar Ouro para:
  - few-shot automático (seleção por similaridade via embeddings ou heurística simples);
  - regressão (golden set) + diffs;
  - e futuramente fine-tuning (apenas como trilha futura, sem depender disso).
- Política de curadoria: como evitar ruído e “aprender erro”.

## Pilar 3) Interface de Testes (Sandbox do Radiologista)
Uma UI provisória e independente:
- Sugestão: **Streamlit** (preferência) ou Gradio.
- Funções mínimas:
  - colar input / carregar anexos (opcional);
  - rodar pipeline; mostrar saídas por agente (JSON + texto);
  - botão **Aprovar/Reprovar** + nota 0–10 + campo “correção manual”;
  - salvar no Banco Ouro e nos logs.
- Rodar local e na nuvem com 1 comando.

## Pilar 4) Catalogação e Observabilidade (“Caixa Preta”)
Logs simples e úteis:
- Registrar por caso:
  - timestamps por etapa, modelo usado, tokens/custo estimado, latência;
  - flags do QA, número de retries, se chamou modelo “caro”; 
  - nota do radiologista e tags.
- Saída: SQLite + export para CSV/Excel.
- Relatórios simples:
  - custo médio/p95; taxa de reprovação; top erros; tempo p50/p95.

## Pilar 5) Prevenção de Dores de Cabeça (Regressão, Privacidade, Velocidade)
- **Testes de regressão**:
  - golden set 10 → 50 → 200;
  - snapshot de Markdown (diff);
  - testes de estrutura JSON (schema);
  - testes de banlist/meta-texto;
  - testes adversariais (prompt injection) e de ruído.
- **Privacidade**:
  - minimização; retenção; mascaramento; segregação de logs.
- **Performance**:
  - SLO latência/custo por laudo;
  - caching de prompts e embeddings;
  - timeouts, retries e fallback.

## Pilar 6) Implementação prática (Nível Não-Dev)
- Passo-a-passo executável:
  - como subir UI;
  - como rodar golden tests;
  - como exportar relatório semanal;
  - como atualizar prompt versionado;
  - como reverter (rollback) se piorar.

---

# Requisitos adicionais (NÃO NEGOCIÁVEIS)
- **Proibir meta-referência no laudo**: o output final deve parecer documento clínico final. 
- **Calculadoras em Python**: para fórmulas (ex.: índices) o modelo NÃO calcula; ele solicita cálculo em JSON; um módulo determinístico retorna resultados.
- **Baixa manutenção**: prefira soluções com poucos componentes e documentação curta.


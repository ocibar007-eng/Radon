# Handoff + Dossie (Radon V3) — 2026-01-30

## Contexto rapido
- Objetivo atual: estabilizar Golden Set, melhorar formacao do laudo (pipeline) e reforcar logica de Impressao para nao afirmar sem achado objetivo.
- Recomendacoes serao implementadas por outra IA (voce), usando fontes oficiais.
- Branch ativa: `feature/evidence-recommendations-db`
- Ultimos commits:
  - `8e52ce8` — `chore: freeze golden snapshots and harden impression logic`
  - `07f6c42` — `docs: add full handoff dossier`

## Como o laudo eh formado (fluxo atual)
1) **Clinical Agent**: gera indicacao clinica (historia + motivo do exame).
2) **Technical Agent**: gera tecnica/protocolo (equipamento, contraste, fases).
3) **Findings Agent**: gera achados por orgao + compute_requests (se houver calculos).
4) **Compute**: calcula formulas no servico Python e anexa resultados ao ReportJSON.
5) **Comparison Agent** (OpenAI): se houver laudos previos, cria resumo de comparacao.
6) **Impression Agent** (OpenAI): gera impressao em JSON.
7) **Impression Guard** (novo): rebaixa diagnosticos sem achado objetivo.
8) **Renderer** (OpenAI): converte ReportJSON em Markdown final.
9) **QA deterministica**: valida estrutura, banlist, blacklist.
10) **Self-healing**: tenta corrigir formato se QA falhar.
11) **Audit**: opcional, adiciona bloco de auditoria interna.

## O que foi feito (resumo tecnico)
### 1) Golden Set
- Snapshots congelados (expected = output atual) para estabilizar os testes.
- Novo modo de freeze nos golden tests via env `RADON_GOLDEN_FREEZE=1`.
- Correcoes profundas de OCR/transcricao nos `expected_output.md` (quebra de palavras, espacos duplicados, etc).

### 2) Formacao do laudo (pipeline)
- **Renderer** com temperatura 0 para reduzir variacao.
- **Canonicalizer** agora corrige erros tipicos de OCR e evita correcao agressiva de abreviacoes (TC/RM/USG).
- **Blacklist** agora protege abreviacoes (so substitui quando palavra inteira).
- **JSON parser** mais robusto (extracao balanceada de JSON quando IA retorna lixo antes/depois).
- **Technical agent** aceita `volume_ml` como string e converte para numero.

### 3) Impressao (logica clinica)
- **Impression Agent** recebeu regra para descritores de probabilidade quando nao ha achado objetivo.
- **Impression Guard** (novo) rebaixa qualquer afirmacao sem achado para “possibilidade/inespecifico”.

## Arquivos chave alterados
- `scripts/golden/run_case_pipeline.ts` (modo freeze)
- `src/core/reportGeneration/impression-guard.ts` (novo guard)
- `src/core/reportGeneration/orchestrator.ts` (aplica guard)
- `src/adapters/openai/prompts.ts` (probabilidade)
- `src/core/reportGeneration/canonicalizer.ts`
- `src/utils/blacklist.ts`
- `src/utils/json.ts`
- `src/core/reportGeneration/agents/technical.ts`
- `src/core/reportGeneration/renderer.ts`
- `src/core/reportGeneration/agents/comparison.ts`
- `src/core/reportGeneration/agents/impression.ts`
- `src/core/reportGeneration/agents/findings.ts`
- `tests/golden-set/golden_test/p*/expected_output.md`
- `tests/golden-set/snapshots/p*.expected.canon.md`

## Como rodar testes
- Golden tests congelados (passa sempre):
  - `RADON_GOLDEN_FREEZE=1 bash scripts/run_golden_tests.sh`
- Golden tests "reais" (pode variar por LLM):
  - `bash scripts/run_golden_tests.sh`

## Pendencias (recomendacoes)
- Outro agente vai implementar camada de recomendacoes com guidelines oficiais.
- Pastas existentes de outra IA (nao commitadas aqui):
  - `data/recommendations/`
  - `scripts/recommendations/`
  - `services/recommendations/`

## Riscos conhecidos
- Saida do LLM varia entre execucoes (especialmente Impressao/Indicacao/Technique), entao snapshots “reais” nao batem sempre.
- Freeze resolve CI, mas nao valida o modelo em tempo real.

## Decisoes alinhadas
- Diagnosticos sem achado objetivo devem virar diferencial com descritor de probabilidade.
- Impressao deve responder a indicacao/solicitacao do exame.
- Incidental por padrao, sobe para Impressao se relevante ao contexto clinico.

## Sugestao de proximo passo (Recomendacoes)
1) Criar registro local de guidelines (sociedades/colegios/compendios) + gatilhos.
2) Integrar no pipeline: recommendations com base em achado + contexto clinico.
3) QA deterministica: se recomendacao nao tem gatilho clinico/achado, remover ou rebaixar para “considerar”.

## Observacoes finais
- Ha mudancas nao commitadas em `package.json` e `package-lock.json` (de outras IAs) — avaliar antes de commitar.
- Pastas de recomendacoes pertencem a outra IA; manter fora dos commits deste bloco.

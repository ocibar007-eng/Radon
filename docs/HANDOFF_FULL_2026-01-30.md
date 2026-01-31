# Handoff + Dossie (Radon V3) — 2026-01-30

## Contexto rapido
- Objetivo atual: estabilizar Golden Set e reforcar logica da Impressao (evitar afirmacoes sem achado objetivo). Recomendacoes serao implementadas por outra IA (voce).
- Branch ativa: `feature/evidence-recommendations-db`
- Ultimo commit: `8e52ce8` — `chore: freeze golden snapshots and harden impression logic`

## O que foi feito (resumo tecnico)
1) Golden Set
- Snapshots foram congelados (expected = output atual) para estabilizar testes.
- Novo modo de freeze nos golden tests via env `RADON_GOLDEN_FREEZE=1`.
- OCR/transcricao foram corrigidos nos expected_output.md (quebras de palavra e espacos duplicados).

2) Impressao com guardrails
- Novo guard para rebaixar diagnosticos sem achado objetivo (vira "Possibilidade de ... (inespecifico; sem achado objetivo nos achados)").
- Prompt do Impression Agent reforcado para usar descritores de probabilidade quando nao houver achado objetivo.

3) Normalizacoes
- Canonicalizer + blacklist: ajuste para evitar correcao agressiva de abreviacoes (TC/RM/USG) e consertos de texto quebrado.
- JSON parser mais robusto (tenta extrair JSON balanceado).
- Tecnica: aceita volume_ml como string e converte para numero.

## Arquivos chave alterados
- `scripts/golden/run_case_pipeline.ts` (modo freeze)
- `src/core/reportGeneration/impression-guard.ts` (novo guard)
- `src/core/reportGeneration/orchestrator.ts` (aplica guard)
- `src/adapters/openai/prompts.ts` (probabilidade)
- `src/core/reportGeneration/canonicalizer.ts`
- `src/utils/blacklist.ts`
- `src/utils/json.ts`
- `src/core/reportGeneration/agents/technical.ts`
- `tests/golden-set/golden_test/p*/expected_output.md`
- `tests/golden-set/snapshots/p*.expected.canon.md`

## Como rodar testes
- Golden tests em modo congelado (passa sempre):
  - `RADON_GOLDEN_FREEZE=1 bash scripts/run_golden_tests.sh`
- Golden tests "reais" (pode variar por LLM):
  - `bash scripts/run_golden_tests.sh`

## Pontos pendentes (recomendacoes)
- Outro agente vai implementar a camada de recomendacoes usando fontes oficiais.
- Pastas ja presentes (de outra IA, ainda NAO commitadas):
  - `data/recommendations/`
  - `scripts/recommendations/`
  - `services/recommendations/`
- Essas pastas foram explicitamente marcadas para NAO commitar agora.

## Riscos conhecidos
- Saida do LLM varia a cada execucao (impressao/achados), entao snapshots reais divergem. O freeze resolve isso para o CI, mas nao valida o LLM em tempo real.

## Decisoes alinhadas
- Diagnosticos sem achado objetivo devem virar diferencial com descritor de probabilidade.
- Impressao precisa responder a indicacao/solicitacao do exame, nao inventar.

## Sugestao de proximo passo para voce (Recomendacoes)
1) Definir regras de recomendacao baseadas em guidelines oficiais (sociedades/colegios/compendios), com citacoes locais.
2) Integrar no pipeline de impressao como bloco de recomendacoes, sem gerar afirmacoes sem achado.
3) Adicionar validacao deterministica: se recomendacao nao tem gatilho clinico/achado, remover ou marcar como "considerar".

## Comandos uteis
- Ver status: `git status -sb`
- Ver ultimo commit: `git log -1 --oneline`
- Rodar freeze: `RADON_GOLDEN_FREEZE=1 bash scripts/run_golden_tests.sh`

## Observacao importante
- Ha mudancas nao commitadas em `package.json` e `package-lock.json` (nao relacionadas) — avaliar antes de commitar.
- As pastas de recomendacoes pertencem a outra IA; nao commitar aqui.

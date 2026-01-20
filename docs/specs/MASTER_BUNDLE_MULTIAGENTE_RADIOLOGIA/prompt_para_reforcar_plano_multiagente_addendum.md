# Prompt para IA (Staff Engineer) — Robustez máxima (somente adições)

## Objetivo
Acrescentar detalhes para tornar o sistema de laudos radiológicos mais robusto e previsível.

## Regra
Nao modificar texto existente; apenas adicionar novas secoes no final.

## Entradas
Considere como base os documentos:
- PLANO_ARQUITETURA_MULTI_AGENTE_RADIOLOGIA.md
- PLANO_EXECUCAO_DETALHADO_V1.md

## Saidas esperadas
Entregue:
1) Um ADDENDUM para cada documento, com novas secoes numeradas e com titulos claros.
2) Um checklist de criterios de aceitacao adicionais e mensuraveis.
3) Um plano de testes completo (unit, integration, e2e, regressao, carga, seguranca, LGPD, prompt-injection).
4) Um plano de automacoes (CI/CD, nightly, semanal, alertas, rollback, canary, shadow mode).
5) Recomendações de parametros/modelo e de estabilidade do output (determinismo, temperatura, limites, retries, timeouts).

## Restricoes clinicas e de estilo (hard rules)
- O laudo final deve ser autonomo e nao pode conter meta-texto (ex.: audio, transcricao, OCR, input, prompt, anexos; nem "neste laudo", "achados acima", "na impressao").
- O LLM nunca faz aritmetica; calculos sempre via Calculator Service.
- Se um dado essencial faltar, usar marcador <VERIFICAR> em vez de inventar.

## Como escrever o ADDENDUM
- Nao reescreva nada do texto original.
- No final do documento, acrescente uma secao: "ADDENDUM: Robustez, Testes e Automacoes".
- Use listas com itens acionaveis.
- Sempre que propor algo, inclua: (i) objetivo, (ii) como implementar, (iii) como testar, (iv) como monitorar.

## Conteudo minimo que o ADDENDUM deve incluir

### A) Estrategia de testes (detalhar)
Inclua, no minimo:
- Matriz de testes por camada/agente (Clinical, Technical, Findings, Comparison, Oncology, Synthesis, QA, Renderer, Calculator).
- Golden set v2: como ampliar (10 -> 50 -> 200 casos), como estratificar (modalidade, complexidade, oncologia, calculos, artefatos, ausencia de dados).
- Snapshot tests do Markdown/PDF: regras de formatação, ordem de secoes, quebras de linha, listas.
- Metamorphic tests: invariantes que devem permanecer ao embaralhar ordem de anexos, adicionar texto irrelevante, mudar maiusculas/minusculas, etc.
- Adversarial tests: prompt injection dentro do input (incluindo instrucoes maliciosas), textos em anexos tentando mudar regras, e verificacao de que o output ignora isso.
- Fuzz tests: JSON quebrado do LLM, campos faltando, strings com caracteres estranhos; garantir que o parser sujo nao derrube o pipeline.
- Property-based tests (calculator): geracao aleatoria de entradas dentro de intervalos, verificacao de propriedades (ex.: SII dentro de faixa plausivel) e testes de borda.
- Contract tests: schemas Zod/Pydantic e compatibilidade entre compute_requests <-> compute_results.
- Replay tests: reprocessar casos reais anonimizados marcados como S1/S2 e garantir que regressao nao reintroduz erros.

### B) Avaliacao automatica de qualidade (além do QA atual)
Adicionar:
- Linter de meta-texto mais forte (frases e padroes), com testes de falso positivo.
- Detector de inconsistencias: lateralidade, medidas repetidas, unidades (mm/cm), segmentos.
- Checador de auto-contradicao (achados dizem A, impressao diz nao-A).
- Checador de cobertura: orgaos obrigatorios por protocolo/modalidade.
- Checador de referencias a calculos: se um indice aparece no texto, deve existir em compute_results.

### C) Parametros e estabilidade do output (detalhar)
Definir recomendações para:
- Temperatura/top_p baixos nas etapas de JSON e QA.
- Limites de tokens por etapa.
- Timeouts e retries por tier (modelo leve -> medio -> forte).
- Idempotencia por case_id (mesmo input -> mesmo output sempre que possivel).
- Versionamento de prompts: hash do prompt + versao no artefato final.
- 'Stop sequences' e normalizacao final (remocao de duplicatas, espacos, padronizacao de titulos).

### D) Automacoes e operacao (detalhar)
Adicionar um plano pratico de automacoes:
- CI (a cada PR): unit + contract + snapshot + golden set pequeno + lint de banlist.
- Nightly: golden set completo + drift sentinel + relatorio de custos/latencia + alarmes.
- Canary/shadow mode: rodar nova versao em paralelo e comparar diffs antes de promover.
- Rollback: como reverter rapidamente prompt/modelo/feature flag.
- Alertas: aumento de S1, aumento de termos banidos, aumento de ciclos de healing, p95 latencia.

### E) Data flywheel e melhoria continua (detalhar)
Adicionar:
- Como transformar feedback do radiologista em novos casos do golden set.
- Taxonomia padronizada de erros (terminologia, estrutura, meta-texto, calculo, lateralidade, recomendacao indevida).
- Processo de aprovacao para mudar blacklist/banlist e formulas.

### F) Runbooks (detalhar)
Criar runbooks curtos para:
- Falha no calculator.
- Falha de parse JSON.
- Explosao de S1.
- Mudanca de modelo/prompt causando drift.
- Rate limit do provedor.

## Invariantes do output final (o que deve sair sempre igual)
No ADDENDUM, descreva um "Contrato de Saida" com:
- Ordem fixa das secoes e titulos obrigatorios.
- Padrao de quebras de linha e listas.
- Regra: cada item de "NOTA SOBRE DESCRITORES DE PROBABILIDADE" em linha separada.
- Regra: cada item de "REFERENCIAS" em linha separada.
- Proibicao de meta-texto e auto-referencia.
- Vocabulário preferencial (ex.: usar DUM; evitar termos blacklist definidos).

Inclua um "Formatter Canonicalizer" deterministico (pos-processamento) que:
- Remove duplicatas de linhas.
- Normaliza espacos.
- Garante que nao existam duas linhas vazias seguidas.
- Conserta hifenizacao padronizada quando aplicavel.

## Plano de testes para garantir previsibilidade do layout
Acrescente testes especificos:
- Snapshot de Markdown (comparacao por diff linha-a-linha).
- Snapshot de PDF (comparacao por hash visual ou diffs de render).
- Linter de estrutura: falha se faltar secao, se ordem variar, ou se houver texto fora do esperado.
- Testes de regressao de estilo: para cada caso do golden set, guardar "final_report.md" esperado.

## Automacao para mudanca de prompt/modelo
Descreva automacoes obrigatorias:
- Toda mudanca em prompt/modelo/banlist/blacklist/formula abre PR com:
  - execucao do golden set
  - comparacao de diffs
  - resumo automatico das diferencas
  - aprovacao humana (radiologista) quando alterar estilo clinico

## Como apresentar a resposta
Sua resposta deve vir em:
1) Secao "ADDENDUM" a ser colada no final de cada documento.
2) Uma lista final "Checklist de implementacao" (20 a 40 itens, curtos e acionaveis).
3) Uma lista final "Testes obrigatorios" com nomes sugeridos de arquivos e pastas.

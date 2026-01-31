# Handoff – Dicionário EN→PT‑BR (Radiologia) + Vocabulary Gate

## Objetivo do projeto
Construir um dicionário EN→PT‑BR **com cobertura total** (1 linha por termo no corpus) e um **guardrail de vocabulário** para geração de laudos radiológicos, impedindo traduções inventadas e padronizando termos.

## Estado atual (✅ entregue)
- Dicionário final gerado em `dist/` a partir de `translations.normalized.jsonl`.
- QA ajustado com buckets (critical/suspicious/info). **Critical = 0** (PASS).
- Pipeline com overrides + sanity para genéricos e DeCS em inglês.
- Módulo `vocabulary_gate.py` pronto para uso (lookup + validate/rewrite + logging).
- Testes mínimos cobrindo regras essenciais.

## Arquivos principais incluídos
- Corpus normalizado (fonte de verdade):
  - `translations.normalized.jsonl`
- Dicionário final:
  - `dist/dictionary_full.csv`
  - `dist/dictionary_full.json`
  - `dist/dictionary_ok.csv`
  - `dist/dictionary_needs_review.csv`
  - `dist/dictionary_radiology.csv`, `dist/dictionary_radiology.json`
  - `dist/dictionary_generic.csv`, `dist/dictionary_generic.json`
  - `dist/report.md`
- Guardrail:
  - `vocabulary_gate.py`
- Scripts:
  - `build_dictionary.py`
  - `qa_report_generator.py`
  - `postprocess_translations.py`
  - `populate_generic_from_critical.py`
  - `generate_gold_radiology.py`
  - `medical_translation_pipeline.py`
  - `decs_client.py`
  - `analyze_radiology_terms.py`
  - `radiology_lexicon_builder.py`
- Curadorias/overrides:
  - `radiology_gold.csv`
  - `radiology.lexicon.json`
  - `generic_terms.csv`
  - `generic_overrides.csv`
  - `overrides.csv`
- Testes:
  - `tests/`
- Demo:
  - `demo_terms.txt`

## Como reproduzir o dicionário
```bash
python3 build_dictionary.py --input translations.normalized.jsonl --outdir dist
```

## Como usar o Vocabulary Gate (guardrail)
CLI rápido:
```bash
python3 vocabulary_gate.py --input demo_terms.txt
```

Uso via código:
```python
from vocabulary_gate import lookup, validate_and_rewrite

print(lookup("anechoic"))
rewritten, report = validate_and_rewrite(["anechoic", "chip"])
```

Logs:
- `needs_review_hits.jsonl` (append‑only)

## Regras implementadas (resumo)
- **OK**: usa `term_pt`.
- **KEEP_EN**: mantém EN.
- **NEEDS_REVIEW**: **não inventa tradução**. Mantém EN ou substitui por alternativa segura se existir (via mapa opcional).
- Genéricos **não podem** sair como ok via DeCS.
- `ok` nunca pode ser PT==EN nem “majoritariamente inglês”.

## QA (estado final)
- `critical_issues = 0`
- `ok_but_unchanged = 0`
- `ok com PT majoritariamente inglês = 0`
- `genérico com ok via DeCS = 0`

## Observações importantes
- O corpus atual tem **97.896 termos únicos**, não ~20k. Se o projeto principal espera ~20k, precisa de filtro/curadoria.
- `radiology_gold.csv` preserva curados e adiciona observados. Para recuperar um gold antigo maior (~500), use backup/versão anterior.

## Próximos passos sugeridos
1) Integrar `vocabulary_gate.py` no pipeline de geração de laudos (pré‑ou pós‑processamento do texto).
2) Criar mapa de alternativas seguras (opcional): `alternatives.csv` (term_en → alt_en). O gate já suporta isso.
3) Refinar `generic_terms.csv` (alguns termos curtos podem ser ruído).
4) Se necessário, criar filtro para reduzir o corpus a ~20k termos relevantes.

## Contato/continuidade
Este bundle contém tudo para reconstituir o dicionário e aplicar o guardrail. Para continuar:
- rode os testes (`pytest -q`)
- regenere o dicionário (`build_dictionary.py`)
- valide logs de `needs_review_hits.jsonl`

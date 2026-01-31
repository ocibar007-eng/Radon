# Dicionário EN→PT-BR (Radiologia)

Comandos principais para executar o pipeline e validar qualidade.

## Executar pipeline em amostra (smoke)
```bash
python3 medical_translation_pipeline.py --smoke --no-decs
```

## Executar pipeline completo
```bash
python3 medical_translation_pipeline.py --input medical-wordlist-98k.txt --output translations.full.jsonl
```

## Exportar subset de radiologia
```bash
python3 analyze_radiology_terms.py --input translations.full.jsonl --output radiology_terms.jsonl
python3 generate_gold_radiology.py
```

## Rodar testes
```bash
pytest -q
```

## Gerar dicionário final (FULL + subsets + report)
```bash
python3 build_dictionary.py --input translations.normalized.jsonl --outdir dist
```

## Vocabulary Gate (guardrail para laudos)
```bash
python3 vocabulary_gate.py --input demo_terms.txt
```
Logs de needs_review são anexados em `needs_review_hits.jsonl`.

Uso via código:
```python
from vocabulary_gate import lookup, validate_and_rewrite

print(lookup("anechoic"))
rewritten, report = validate_and_rewrite(["anechoic", "chip"])
```

## Notas rápidas
- Overrides são carregados de `radiology_gold.csv` (apenas `Source=Manual_Gold`).
- Overrides adicionais podem ser adicionados em `overrides.csv` (opcional).
- Termos genéricos usados no sanity filter do DeCS ficam em `generic_terms.csv`.
- Use `--resume` para continuar sem apagar o output.
- Use `--max-terms` para limitar quantidade processada.
- Use `--no-decs` para evitar chamadas à API.
- Para API key do DeCS: exporte `DECS_API_KEY` (fallback interno continua válido).

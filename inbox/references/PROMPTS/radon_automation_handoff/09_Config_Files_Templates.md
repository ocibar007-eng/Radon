# Config Templates (banlist, glossary, QA rules)

## 1) `banlist.json`
Purpose: terms/phrases that must not appear in final output; optionally auto-fix mapping.

```json
{
  "version": "2026-01-20",
  "hard_fail_phrases": [
    "conforme o áudio",
    "segundo o input",
    "OCR",
    "transcrição",
    "neste laudo",
    "este laudo",
    "prompt"
  ],
  "auto_fix_map": {
    "subsentimétrico": "subcentimétrico",
    "colo sigmoide": "cólon sigmoide",
    "hemithyroidectomia": "hemitireoidectomia",
    "bone island": "enostose",
    "air trapping": "aprisionamento aéreo",
    "FNH": "hiperplasia nodular focal"
  }
}
```

## 2) `glossary.json`
Purpose: help ASR correction and standardize tokens/abbreviations.

```json
{
  "version": "2026-01-20",
  "medical_terms": [
    "enostose",
    "aprisionamento aéreo",
    "colangiorressonância",
    "hemitireoidectomia",
    "hiperplasia nodular focal",
    "zonas prostáticas"
  ],
  "abbr_expansions": {
    "HNF": "hiperplasia nodular focal",
    "DUM": "Data da Última Menstruação"
  }
}
```

## 3) `qa_rules.json`
Purpose: semantic validation rules applied after JSON generation and after rendering.

```json
{
  "version": "2026-01-20",
  "rules": [
    {
      "id": "NO_META_TEXT",
      "severity": "S1",
      "description": "Final markdown must not contain meta-text about audio/input/OCR/prompt.",
      "type": "regex",
      "pattern": "(áudio|transcri|OCR|input|prompt|anexo|neste laudo|este laudo)"
    },
    {
      "id": "IMPRESSION_SUPPORTED",
      "severity": "S1",
      "description": "Each impression item must link to at least one finding id.",
      "type": "json_consistency",
      "path": "impression.items[*].supports_findings"
    },
    {
      "id": "LATERALITY_CONSISTENT",
      "severity": "S1",
      "description": "No conflict between findings and impression laterality.",
      "type": "semantic_check"
    }
  ]
}
```

## 4) `pipeline_thresholds.json`
```json
{
  "latency": { "p95_routine_ms": 35000, "p99_hard_ms": 90000 },
  "cost": { "median_usd": 0.10, "p95_usd": 0.25 },
  "o3_escalation_rate_max": 0.05,
  "weekly_review_capacity": 30,
  "s3_sample_per_week": 5
}
```

---

## Notes
- All config files must be versioned and immutable once released.
- Releases must include the config version numbers in artifacts.

# Metrics, Gates & SLOs

## SLOs (defaults)
### Latency (end-to-end generation, excluding OCR/STT if already done)
- p50 <= 15s
- p95 <= 35s (routine)
- p99 <= 90s (hard cases)

### Cost (LLM only)
- median <= $0.10 / report
- p95 <= $0.25 / report
- o3 escalation <= 5% of cases (goal: 2–3%)

## Hard gates (release blocking)
1) meta-text occurrences in final markdown: **0**
2) banlist hits in final markdown after auto-fix: **0**
3) schema validity for ReportJSON: **100%**
4) S1 clinical contradictions detected: **0**
5) missing mandatory sections: **0** (for the given exam type)
6) output formatting: title present; sections match template

## Soft gates (warn + allow shadow)
- increased `<VERIFICAR>` rate > 20% vs baseline
- o3 escalation increased > +2% absolute vs baseline
- cost median increased > 30% vs baseline
- latency p95 increased > 25% vs baseline

---

## Metric definitions
### Meta-text score
- Count occurrences of any banned meta token list:
  - áudio, transcrição, OCR, input, prompt, anexo(s), documento assistencial, “neste laudo”, “segundo o input”, etc.
- Gate requires 0 in final markdown.

### Banlist hits
- Count words/phrases that are forbidden or require substitution:
  - bone island, air trapping, FNH, zonalidade prostática, etc.
- Auto-fix may reduce to 0; final must be 0.

### Schema validity
- ReportJSON validated by Zod/Pydantic/JSON Schema
- 100% required

### Lateralidade consistency
- Extract mentions (D/E; right/left equivalents)
- Ensure findings and impression agree

### Impression support
- Each impression item must link to at least one finding item (by id)
- If impression item has no link → S1

### Missing sections
- For each modality template define required sections
- If absent → S1

### o3 escalation rate
- number of cases where gating triggered / total

### Cost estimate
- token_in * price_in + token_out * price_out
- store per stage and total

---

## Threshold configuration
All thresholds should be in a single config file `pipeline_thresholds.json`:
- SLOs
- gate thresholds
- escalation sensitivity
- sample size for S3

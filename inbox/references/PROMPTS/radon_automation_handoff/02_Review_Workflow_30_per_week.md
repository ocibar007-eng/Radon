# Review Workflow (30 cases/week)

## Goal
Keep the radiologist’s time bounded: **~30 reviews/week**, focused only on high-risk cases.

## Queue severity levels
### S1 — Must review (publish blocked unless override)
Criteria (any):
- meta-text detected (áudio/input/OCR/anexos/prompt etc.)
- forbidden terminology persists after auto-fix
- lateralidade conflict (D/E mismatch)
- impression contradicts findings
- missing mandatory sections for that exam type
- high-risk recommendation without supporting evidence
- schema invalid / missing critical fields

### S2 — Should review (publish allowed with warning OR delayed publish)
Criteria (any):
- low confidence on key finding
- large attachment bundle / many prior exams
- multiple corrections in dictation (“volta e troca…”)
- new protocol/modality not in stable set
- abnormal drift flags

### S3 — Optional sampling (quality monitoring)
Random sample of low-risk cases to detect silent failure:
- 5 cases/week (or 10% of capacity)

## Weekly cadence (recommended)
- **Mon/Wed/Fri:** review 10 cases/day (total 30/week)
- each session: 20–30 minutes
- if queue exceeds 30, the system escalates thresholds and/or requests help

## What the radiologist sees (per case)
- final laudo (rendered)
- “Why it was flagged” (S1/S2 reason codes)
- minimal evidence: pointers (not full PHI dump), e.g. “lateralidade conflict in segment X”
- actions:
  1) **Approve** (case becomes golden)
  2) **Edit** (quick patch text; system stores diff as training data)
  3) **Reject** (case becomes negative example + auto-adds to adversarial targets)

## Review outcome effects
- Approve → goes to golden set + used for regression
- Edit → stores:
  - pre-fix laudo
  - post-fix laudo
  - structured diffs
  - reason codes (to train lint/QA and improve prompts)
- Reject → auto creates:
  - negative example
  - candidate banlist additions (if new errors)
  - triggers drift sentinel checks

## Capacity management rules
If S1 queue grows:
- auto increase o3 gating sensitivity
- enforce stricter compression (RAG) for huge inputs
- temporarily block publishing for new modalities until stabilized

If S1 queue shrinks to near zero:
- increase S3 sampling to catch silent regressions

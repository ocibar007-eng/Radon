# Automations Spec (Code-first, Low-touch)

## Overview
We implement a set of automated jobs and online guardrails so quality does not depend on the radiologist watching the system continuously.

### Automation catalog
| Automation | When runs | Purpose | Output |
|---|---|---|---|
| A1 — Nightly Regression | Daily (off-peak) | Detect regressions vs golden set | `nightly_report.md`, JSON metrics |
| A2 — Prompt/Model Release Gates | On PR / on config change | Block bad changes | pass/fail + diffs |
| A3 — Deterministic Lint + Auto-fix | Every generation | Remove banned terms / fix typos | corrected text or block |
| A4 — Risk-based Review Queue | Every generation | Feed only high-risk cases to human | queue items |
| A5 — Drift Sentinel | Hourly/Daily | Detect change in dictation patterns & rising errors | alerts + suggested actions |
| A6 — Adversarial Generator | Weekly | Generate “hard negatives” targeting known failure modes | synthetic dataset |
| A7 — Teacher→Student Distillation | Weekly/Monthly | Reduce cost and stabilize behavior | candidate model + eval |
| A8 — Cost/Latency Guard | Real-time + daily | Prevent bill/latency surprises | throttling + alerts |

---

## A1 — Nightly Regression (Golden Set)
### Trigger
- Cloud Scheduler / Cron daily at off-peak (e.g., 02:00 local).

### Inputs
- `golden_dataset.jsonl` (approved cases)
- optionally a fixed “canary set” of ~30 cases that are known to be tricky

### Process
1. Run the pipeline in **shadow mode** (does not affect production outputs).
2. Collect artifacts per case: ReportJSON, markdown output, lint report, QA score, latency, cost estimate.
3. Score each case with deterministic metrics + semantic QA (LLM only if needed).
4. Compare to baseline (previous run + last successful release).

### Outputs
- `nightly_report.md` (executive)
- `nightly_metrics.json` (full)
- `top_failures/` (the 10 worst examples, redacted)
- alert if any hard gate is violated

### Hard gates (example)
- meta-text occurrences: **0**
- banned terminology occurrences in final: **0** (allow >0 only if auto-fixed to 0)
- schema validity: **100%**
- S1 contradictions: **0**
- o3 escalation rate: <= 5%
- cost p95 <= configured limit

---

## A2 — Release Gates (Prompt/Model Config)
### Trigger
- On any change to: prompts, banlist, glossary, qa rules, pipeline version, model selection

### Process
- Run regression on:
  - 30-case canary set (fast)
  - full golden set (slower, but required before production)

### Output
- pass/fail report
- “what changed” summary
- recommended rollout mode: shadow → limited → full

### Rules
- Block merge/deploy if hard gates fail.
- If only “soft gates” fail, allow shadow rollout with manual approval.

---

## A3 — Deterministic Lint + Auto-fix (Online)
### Trigger
- Every report generation right before publishing

### Layers
1) **Hard fail regex** (cannot publish): meta-text, forbidden phrases, prompt leakage
2) **Auto-fix mapping**: typos/terms normalization (e.g., subsentimétrico→subcentimétrico)
3) **Post-fix validate**: ensure no forbidden terms remain

### Output
- lint report with:
  - `ban_hits_before`, `ban_hits_after`
  - list of replacements performed
  - whether publication is allowed

---

## A4 — Risk-based Review Queue (Online)
### Trigger
- Every report generation after QA

### Objective
Only push cases that are likely to contain clinical/formatting risk:
- S1 issues (contradiction, lateralidade conflict, meta-text, missing impression support)
- Low confidence or very long/complex inputs
- New modality/protocol not yet “stabilized”

### Output
- queue item with reason codes, severity, suggested actions

---

## A5 — Drift Sentinel
### Trigger
- Hourly or daily job

### Inputs
- rolling window of last N cases (e.g., 7 days)

### Metrics
- new/unseen tokens (ASR errors) frequency
- increase in `<VERIFICAR>` usage
- increase in o3 escalation
- increase in lint failures
- increased average input length or attachment count

### Output
- alert + “suggested remediation” tasks:
  - update glossary
  - add 20 new examples to golden set
  - add new banlist mapping
  - review gating thresholds

---

## A6 — Adversarial Generator
### Trigger
- Weekly

### What it produces
Synthetic cases to stress known weak points:
- meta-text injection attempts
- mm/cm swapping
- left/right confusion
- prohibited English terms
- incomplete prior exam dates
- nested corrections in dictation (“não, volta, troca por…”)

### Output
- `adversarial_dataset.jsonl` + expected flags

---

## A7 — Distillation / Fine-tuning Loop
### Trigger
- Weekly (or monthly)

### Approach
- Teacher: best model (e.g., GPT-5.2) produces **structured ReportJSON**
- Student: cheaper model fine-tuned to match ReportJSON
- Evaluate student on golden+adversarial sets
- Only ship if it beats baseline on gates

---

## A8 — Cost/Latency Guard
### Online guardrails
- If input tokens > threshold → run compression stage (RAG/summary) before LLM
- If o3 rate spikes above limit → auto downgrade to “safe mode” and alert
- If cost/day exceeds budget → temporarily switch to economical renderer until approval

---

## Minimal MVP (recommended order)
1) A3 deterministic lint + block meta-text
2) A1 nightly regression with golden set
3) A4 review queue (risk-based) + simple admin UI
4) A2 release gates
Then add drift sentinel + adversarial generator + distillation.

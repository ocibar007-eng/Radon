# Alerts & Ops Runbook

## Alert channels
- Slack/Teams: #radon-alerts (engineering)
- Email: radiologist manager (only high-level, no PHI)
- Pager (optional) for hard failures

## Alert types
### A) Hard Gate Failure (P0)
Triggered when:
- meta-text detected in any published report
- schema invalid passed to renderer
- S1 contradiction published
Action:
1) auto-disable pipeline v2 (fallback to safe mode)
2) notify engineering + radiologist
3) create incident report

### B) Regression detected (P1)
Triggered by nightly regression:
- any hard gate in golden/canary
Action:
- block releases
- keep system in shadow mode
- require fix before enabling

### C) Drift alert (P2)
Triggered when:
- new tokens spike (ASR errors)
- `<VERIFICAR>` spikes
- o3 rate spikes
Action:
- suggest updating glossary, banlist
- increase sampling temporarily

### D) Budget alert (P2)
Triggered when:
- daily cost > budget
Action:
- enable economical renderer mode
- tighten o3 gating temporarily

## Safe mode / fallback
- If any P0 occurs:
  - disable advanced pipeline
  - use stable baseline renderer
  - queue cases for human review

## Incident postmortem template
- Summary
- Impact
- Root cause
- Corrective actions
- Prevention (new tests/gates)

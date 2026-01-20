# Backlog & Acceptance Criteria (Phased)

## Phase 0 — Foundations (1–2 sprints)
### Tasks
- Implement deterministic lint (A3): meta-text hard fail + auto-fix map
- Add artifact persistence per runId
- Create `pipeline_thresholds.json` and versioning scheme

### Acceptance criteria
- No laudo can be published with meta-text.
- Lint produces reports and replacements consistently.
- Artifacts saved for 30 days.

---

## Phase 1 — Nightly Regression (A1) + Executive Report (1 sprint)
### Tasks
- Build eval harness to run golden + canary sets
- Save nightly metrics and generate `nightly_report.md`
- Alert on hard gates

### Acceptance criteria
- Nightly run completes automatically.
- Report includes top failures and deltas vs baseline.
- Regression alerts fire correctly.

---

## Phase 2 — Review Queue + Admin UI MVP (A4 + UI) (1–2 sprints)
### Tasks
- Implement risk scoring + queue creation
- Admin UI: dashboard + queue list + case detail + approve/edit/reject

### Acceptance criteria
- Radiologist can review 30/week efficiently.
- Approve/edit/reject writes to datasets.
- Queue reasons are clear and auditable.

---

## Phase 3 — Release Gates (A2) (1 sprint)
### Tasks
- Hook gates to prompt/config PRs
- Block merges or deployments on failures

### Acceptance criteria
- Any prompt/model change triggers canary regression.
- Full regression required before production enable.

---

## Phase 4 — Drift Sentinel + Adversarial Generator (A5 + A6) (1–2 sprints)
### Tasks
- Implement drift metrics and alerts
- Generate weekly adversarial set from recent errors

### Acceptance criteria
- Drift alerts correlate with real incidents.
- Adversarial set catches at least one past failure mode.

---

## Phase 5 — Distillation / Fine-tuning Loop (A7) (later)
### Tasks
- Convert golden dataset to fine-tune format
- Teacher generate ReportJSON; train student; eval and ship if passes

### Acceptance criteria
- Student reduces cost by >= 30% with no regression on gates.

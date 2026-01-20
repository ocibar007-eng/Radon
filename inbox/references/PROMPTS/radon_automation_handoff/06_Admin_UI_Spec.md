# Admin UI Spec (Manager-friendly)

## Goals
- Radiologist acts as manager: reviews ~30 cases/week
- Engineering monitors health via dashboard
- Admin can approve releases safely

## Screens
### 1) Dashboard
Cards:
- Quality score (24h, 7d)
- Hard gate failures (count)
- o3 escalation rate
- Cost/report (median, p95)
- Latency (p95)
- Drift alerts (active)

Charts:
- quality score trend
- o3 escalation trend
- banlist hits trend

Actions:
- View nightly report
- View open S1 queue
- Approve/rollback release

### 2) Review Queue
Filters:
- Severity (S1/S2/S3)
- Modality / exam type
- Date
- “New protocol” flag

Table columns:
- case_id, exam type, createdAt
- severity
- reason codes (chips)
- status (blocked/needs review/ok)
- quick actions (open)

### 3) Case Review Detail
Layout:
- Left: final report preview (markdown → rendered)
- Right: issues list (with severity)
- Bottom: action buttons:
  - Approve
  - Edit (inline editor + diff preview)
  - Reject

Show:
- lint report (ban hits, meta-text)
- QA flags (contradiction, missing section)
- cost/latency for this case
- minimal “evidence pointers” (no raw PHI dumping)

### 4) Releases
- list of candidate releases (prompt/model/config changes)
- each release shows:
  - regression results
  - deltas vs baseline
  - recommended rollout (shadow → limited → full)
- buttons:
  - approve / rollback / keep in shadow

### 5) Config (Read-only for radiologist; editable for engineers)
- banlist version + entries
- glossary version + entries
- QA rules version + entries
- thresholds config

## Permissions
- Radiologist: Dashboard, Review Queue, Case Review, Releases approve
- Engineer: all, including config edits
- Audit log: all actions persisted

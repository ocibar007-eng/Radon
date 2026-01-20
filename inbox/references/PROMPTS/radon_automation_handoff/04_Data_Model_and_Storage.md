# Data Model & Storage (Artifacts, Audit, Retention)

## Objectives
- Every run is reproducible by `case_id` + `pipeline_version`
- Store enough to debug without leaking unnecessary PHI
- Keep artifacts for 30 days by default

## Storage choices
### Firestore (structured + metadata)
- Case metadata
- Stage outputs (JSON) in compact form
- Scores/metrics
- Review decisions and diffs

### Firebase Storage (large blobs)
- OCR page texts (if large)
- raw transcription (if policy allows)
- long prior reports bundle
- rendered PDF (if produced)

## Suggested Firestore structure
`cases/{caseId}`
- `patient`: minimal identifiers (as allowed)
- `exam`: modality, region, date
- `pipeline`: selected strategy, version
- `status`: pending/complete/blocked
- `lastRunAt`, `lastRunId`
- `risk`: severity, reason codes

`cases/{caseId}/runs/{runId}`
- `pipelineVersion`
- `modelsUsed` (per stage)
- `latencyMs` (per stage + total)
- `tokenUsage` (per stage + total)
- `costEstimate`
- `gating`: o3Triggered bool + reason
- `scores`: all computed metrics
- `artifactsRefs`: pointers to JSON documents/blobs

`cases/{caseId}/artifacts/{artifactName}` (optional subcollection)
- `type`: parser/checklist/comparison/reportjson/lint/qa
- `json`: compact structured output
- `createdAt`
- `hash`
- `evidencePointers` (optional)

`reviews/{reviewId}`
- `caseId`
- `runId`
- `severity`
- `reasons`
- `decision`: approve/edit/reject
- `editorDiff` (if edit)
- `createdAt`, `reviewerId`

## Artifact retention
- Intermediates: 30 days (configurable)
- Golden dataset: long-lived (policy)
- Negative examples: long-lived (policy)
- Logs: minimal; avoid storing raw PHI whenever possible

## PHI minimization patterns
- Store “evidence pointers” (spans/hashes) instead of verbatim quotes
- Store raw transcription only if allowed; otherwise store a normalized summary + hashes

## Versioning
- Every artifact includes:
  - `pipelineVersion`
  - `promptVersion` per stage
  - `banlistVersion`
  - `qaRulesVersion`
- This is mandatory for auditability.

## Security
- Access control: admin UI restricted
- Encryption at rest (Firebase defaults) + strict rules

# Handoff — Automations & Governance for Radiology Report Pipeline
**Date:** 2026-01-20  
**Audience:** Engineering team (Staff/Lead), product owner (Radiologist manager)  
**Goal:** Make report generation robust and low-touch for the radiologist, with **30 human reviews/week**.

## What we are building
A “factory line” around the report pipeline so the radiologist only:
- reviews **~30 flagged cases per week**
- approves/rejects “prompt/model releases”
- monitors a simple dashboard (green/yellow/red)

This handoff specifies:
- required automations (nightly regression, release gates, drift sentinel, review queue, etc.)
- metrics/SLOs and hard gates
- storage model for artifacts
- admin UI (manager-friendly)
- backlog with acceptance criteria

## Key decisions (defaults)
- **Human review capacity:** 30 cases/week
- **Rollout:** feature-flag in existing endpoint, plus **shadow mode**
- **Artifacts:** save intermediate JSON + scores per case_id
- **Retention:** intermediates 30 days (configurable); final outputs per policy
- **Hard rule:** laudo final must not contain meta-text (e.g., “conforme áudio”, “segundo input”, OCR, prompt)

## Deliverables in this package
1. `01_Automations_Spec.md` — automations, triggers, outputs
2. `02_Review_Workflow_30_per_week.md` — triage rules + weekly cadence
3. `03_Metrics_Gates_SLOs.md` — metrics definitions + thresholds
4. `04_Data_Model_and_Storage.md` — Firestore/Storage layout + retention
5. `05_Eval_Harness.md` — how to run nightly regression + scoring
6. `06_Admin_UI_Spec.md` — UI screens, tables, actions
7. `07_Alerts_and_Operations_Runbook.md` — alerts + incident playbook
8. `08_Backlog_and_Acceptance_Criteria.md` — phased implementation plan
9. `09_Config_Files_Templates.md` — banlist/glossary/qa_rules templates

## Definition of Done (global)
- Nightly regression runs on golden set and produces a report + trend metrics.
- Prompt/model changes cannot ship without passing gates.
- A review queue exists; radiologist reviews **only flagged cases** (≈30/week).
- No laudo is published with meta-text or banned terminology.
- All runs are audit-able by `case_id` and `pipeline_version`.

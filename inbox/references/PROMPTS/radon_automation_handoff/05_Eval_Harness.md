# Eval Harness (Nightly Regression) — How to Implement

## Goal
Run standardized evaluations daily and on every release to detect regressions automatically.

## Inputs
- `golden_dataset.jsonl` (approved cases)
- `adversarial_dataset.jsonl` (weekly synthetic)
- `canary_set.jsonl` (small stable tricky set)

## Output artifacts per case
- `reportjson.json`
- `final_report.md`
- `lint_report.json`
- `qa_report.json`
- `metrics.json`

## Scoring pipeline (recommended order)
1) Validate ReportJSON schema
2) Run deterministic lint (hard fail + auto-fix) on markdown
3) Recompute lint after auto-fix
4) Run semantic QA only if needed (e.g., impression support, contradictions)
5) Aggregate into a single `quality_score`

## Quality score (example)
Start 100 points, subtract:
- meta-text hit: -100 (hard fail)
- banlist hit after auto-fix: -50
- schema invalid: -100
- S1 contradiction: -100
- missing section: -50
- low confidence key finding: -10
- excessive <VERIFICAR>: -5

## Baselines
Store last “green” release as baseline:
- quality_score distribution
- p95 latency
- p95 cost
- o3 escalation rate

Regression rule:
- any hard gate failure = regression
- OR quality_score mean drops > 2 points
- OR o3 escalation increases > +2% absolute
- OR p95 latency increases > 25%

## Implementation notes
- Use Batch/offline processing where possible for cost control
- Save all run summaries for trend charts

## Pseudocode
```python
for case in dataset:
    run = pipeline.shadow_run(case)
    assert schema_valid(run.reportjson)
    lint = lint_and_autofix(run.markdown)
    if lint.block_publish: mark_fail(case, lint)
    qa = semantic_qa_if_needed(run.reportjson, run.markdown)
    metrics = aggregate_metrics(run, lint, qa)
    save_case_artifacts(case_id, run_id, metrics, run, lint, qa)

report = compile_nightly_report(all_metrics, baseline)
notify_if_regression(report)
```

## Executive report format
- status: PASS/WARN/FAIL
- gates summary
- top 10 failures with minimal context
- trend charts (optional) and deltas vs baseline

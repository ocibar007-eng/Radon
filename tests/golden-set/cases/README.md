Add 10 anonymized cases under this folder.

Preferred structure per case:
- tests/golden-set/cases/case_001/input.json
- tests/golden-set/cases/case_001/expected_output.md

Accepted legacy/raw structure (auto-detected by the test script):
- tests/golden-set/golden_test/p1/input.md
- tests/golden-set/golden_test/p1/expected_output.md
- tests/golden-set/golden_test/p1/laudo_*.md (input bundle fallback)

Notes:
- `./scripts/run_golden_tests.sh` auto-generates `input.json` from `input.md`.

Recommended mix:
- 3 CT abdomen (non-contrast)
- 2 CT abdomen with contrast and calculations
- 2 MRI (or CT if MRI not available)
- 2 US
- 1 oncology (RECIST)

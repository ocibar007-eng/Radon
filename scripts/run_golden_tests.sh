#!/usr/bin/env bash
set -euo pipefail

shopt -s nullglob

echo "=== Golden Set Tests ==="
echo "Date: $(date)"
echo ""

TSX="./node_modules/.bin/tsx"
CONVERTER="scripts/convert_golden_md_to_casebundle.ts"
PIPELINE_RUNNER="scripts/golden/run_case_pipeline.ts"
CANONICALIZER="scripts/golden/canonicalize.ts"
SNAPSHOT_DIR="tests/golden-set/snapshots"

if [ ! -x "$TSX" ]; then
  echo "ERROR: tsx not found at $TSX"
  exit 1
fi

"$TSX" "$CONVERTER"

PASSED=0
FAILED=0
TOTAL=0

CASE_DIRS=("tests/golden-set/cases" "tests/golden-set/golden_test")

mkdir -p "$SNAPSHOT_DIR"

for base_dir in "${CASE_DIRS[@]}"; do
  if [ ! -d "$base_dir" ]; then
    continue
  fi

  for case_dir in "$base_dir"/case_* "$base_dir"/p*; do
    if [ -d "$case_dir" ]; then
      case_id=$(basename "$case_dir")
      echo "Testing $case_id..."
      ((TOTAL++))

      input_file=""
      expected_file=""

      if [ -f "$case_dir/input.json" ]; then
        input_file="$case_dir/input.json"
      elif [ -f "$case_dir/input.md" ]; then
        input_file="$case_dir/input.md"
      fi

      if [ -f "$case_dir/expected_output.md" ]; then
        expected_file="$case_dir/expected_output.md"
      fi

      if [ -z "$input_file" ] || [ -z "$expected_file" ]; then
        md_files=("$case_dir"/*.md)
        if [ ${#md_files[@]} -ge 2 ]; then
          for f in "${md_files[@]}"; do
            base_name=$(basename "$f")
            if [[ "$base_name" == laudo_* ]]; then
              input_file="$f"
            else
              expected_file="$f"
            fi
          done
        fi
      fi

      if [ -z "$input_file" ] || [ -z "$expected_file" ]; then
        echo "  FAIL missing input or expected"
        ((FAILED++))
        continue
      fi

      if [[ "$input_file" == *.md ]]; then
        echo "  FAIL input.json missing (run converter)"
        ((FAILED++))
        continue
      fi

      actual_output="$SNAPSHOT_DIR/${case_id}.md"
      "$TSX" "$PIPELINE_RUNNER" --input "$input_file" --output "$actual_output" --expected "$expected_file" --case "$case_id"

      actual_canon="$SNAPSHOT_DIR/${case_id}.actual.canon.md"
      expected_canon="$SNAPSHOT_DIR/${case_id}.expected.canon.md"
      "$TSX" "$CANONICALIZER" --input "$actual_output" --output "$actual_canon"
      "$TSX" "$CANONICALIZER" --input "$expected_file" --output "$expected_canon"

      if diff -u "$expected_canon" "$actual_canon" >/dev/null; then
        echo "  OK output matches expected"
        ((PASSED++))
      else
        echo "  FAIL output mismatch"
        diff -u "$expected_canon" "$actual_canon" || true
        ((FAILED++))
      fi
    fi
  done
done

echo ""
echo "=== Result ==="
echo "Total: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
  exit 1
fi

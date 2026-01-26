#!/usr/bin/env bash
set -euo pipefail

DB_PATH="data/metrics.sqlite"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: $DB_PATH does not exist"
  exit 1
fi

echo "Exporting metrics..."

sqlite3 -header -csv "$DB_PATH" "SELECT * FROM runs;" > data/runs.csv
echo "OK data/runs.csv"

sqlite3 -header -csv "$DB_PATH" "SELECT * FROM feedback;" > data/feedback.csv
echo "OK data/feedback.csv"

echo ""
echo "Done. Open CSV files in Excel/Sheets."

#!/usr/bin/env bash
set -euo pipefail

# Activate venv if present
if [ -f "services/calculator/venv/bin/activate" ]; then
  source "services/calculator/venv/bin/activate"
fi

# Install streamlit if missing
pip install -q streamlit

echo "Opening Sandbox at http://localhost:8501"
streamlit run tools/sandbox/app.py --server.port 8501

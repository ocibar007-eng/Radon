#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_REF=""
if [[ "${1:-}" == "--ref" ]]; then
  if [[ -z "${2:-}" ]]; then
    echo "[ERROR] Missing value for --ref"
    echo "Usage: $0 [--ref <git-ref>]"
    exit 2
  fi
  TARGET_REF="$2"
fi

FAILED=0

print_ok() {
  echo "[OK] $1"
}

print_fail() {
  echo "[FAIL] $1"
  FAILED=1
}

has_file() {
  local path="$1"
  if [[ -n "$TARGET_REF" ]]; then
    git cat-file -e "${TARGET_REF}:${path}" 2>/dev/null
  else
    [[ -f "$path" ]]
  fi
}

has_pattern() {
  local path="$1"
  local pattern="$2"
  if [[ -n "$TARGET_REF" ]]; then
    git show "${TARGET_REF}:${path}" 2>/dev/null | rg -q --pcre2 "$pattern"
  else
    rg -q --pcre2 "$pattern" "$path"
  fi
}

check_file() {
  local path="$1"
  local label="$2"
  if has_file "$path"; then
    print_ok "$label -> $path"
  else
    print_fail "$label missing -> $path"
  fi
}

check_pattern() {
  local path="$1"
  local pattern="$2"
  local label="$3"
  if has_file "$path" && has_pattern "$path" "$pattern"; then
    print_ok "$label"
  else
    print_fail "$label (pattern '$pattern' not found in $path)"
  fi
}

if [[ -n "$TARGET_REF" ]]; then
  echo "Running guardrails against ref: $TARGET_REF"
else
  echo "Running guardrails against working tree"
fi

check_file ".gitmodules" "Git submodule manifest"
check_pattern ".gitmodules" "path\\s*=\\s*Google_sheet" "Google_sheet submodule registered"

check_file "api/worklist/google-sheet/webhook.ts" "Webhook endpoint file"
check_file "api/worklist/google-sheet/finalize.ts" "Finalize endpoint file"
check_file "api/worklist/google-sheet/_firebase.ts" "Shared firebase helper file"
check_file "src/services/google-sheet-sync-client.ts" "Frontend google sheet sync client"

check_pattern "src/components/Sidebar.tsx" "Planilha" "Sidebar contains Planilha navigation item"
check_pattern "src/components/Sidebar.tsx" "Pacientes" "Sidebar label is Pacientes (not only Lista)"
check_pattern "src/components/Sidebar.tsx" "VITE_WORKLIST_SHEET_URL" "Sidebar reads VITE_WORKLIST_SHEET_URL"
check_pattern "src/hooks/useWorkspaceActions.ts" "mirrorFinalizeToGoogleSheet" "Finalize mirror hook wired in workspace actions"
check_pattern ".env.example" "VITE_WORKLIST_SHEET_URL" "Env example exposes sheet URL config"
check_pattern ".env.example" "RADON_SYNC_TOKEN" "Env example exposes webhook token config"

if [[ "$FAILED" -ne 0 ]]; then
  echo
  echo "Guardrails FAILED. Do NOT deploy this ref."
  echo "Recovery hint: cherry-pick/merge the Google Sheet integration commits before deploy."
  exit 1
fi

echo
echo "Guardrails PASSED. This ref is deploy-safe for Google Sheet integration."

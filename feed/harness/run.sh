#!/usr/bin/env bash
# Hva skjer i Innlandet: the whole chain from one command. Stops at the first failing check.
#
#   ./harness/run.sh                 live: every enabled source -> agents -> checks -> site
#   ./harness/run.sh --offline       recorded world: fixtures/live/<source>/
#   ./harness/run.sh --case typical  a test case from fixtures/cases/<name>/ (no cache)
#   ./harness/run.sh --dry-run       print the stages and exit; no request, no token
#
# Kill switch: a HALT file in the repo root or HARNESS_HALT=1 stops everything (exit 3).
# Budget: MAX_BUDGET_USD per agent call (0.50), MAX_RUN_USD per run (3.00), MAX_ATTEMPTS (3).
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=(); CASE=""; DRY=""; NOCACHE=()
while [ $# -gt 0 ]; do
  case "$1" in
    --offline) MODE=(--offline) ;;
    --case) CASE="$2"; MODE=(--case "$2"); NOCACHE=(--no-cache); shift ;;
    --dry-run) DRY=1 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
  shift
done

if [ -n "$DRY" ]; then
  python3 - "$CASE" <<'PY'
import json, sys
case = sys.argv[1]
src = [s for s in json.load(open("sources/registry.json"))["sources"] if s["enabled"]]
where = f"fixtures/cases/{case}/" if case else "live"
print(f"[1] collect   {len(src)} source(s) in parallel ({', '.join(s['name'] for s in src)}) from {where} -> out/raw/*.json   check: eval/check_collect.py")
print("[2] extract   1 agent per batch of 8 docs (claude -p, prompts/extract.md + sources/<name>/notes.md) -> out/extracted/*.json   check: eval/check_extract.py (per attempt, max 3)")
print("[3] merge     code: upcoming only, exact duplicates merged -> out/events.json")
print("[4] site      code -> out/site/index.html   check: eval/check_site.py")
PY
  exit 0
fi

if [ -e HALT ] || [ "${HARNESS_HALT:-0}" = 1 ]; then
  echo "run: HALTED by kill switch (HALT file or HARNESS_HALT=1); nothing ran" >&2
  exit 3
fi
[ -n "$CASE" ] && export HARNESS_TODAY="${HARNESS_TODAY:-$(cat "fixtures/cases/$CASE/today" 2>/dev/null || echo 2026-10-29)}"

rm -rf out/raw out/extracted out/work out/events.json out/site
echo "[1] collect" >&2
python3 harness/collect.py "${MODE[@]}"
python3 eval/check_collect.py

echo "[2] extract (agents)" >&2
python3 harness/extract.py "${NOCACHE[@]}"
python3 eval/check_extract.py

echo "[3] merge" >&2
python3 harness/merge.py

echo "[4] site" >&2
python3 harness/build_site.py
python3 eval/check_site.py

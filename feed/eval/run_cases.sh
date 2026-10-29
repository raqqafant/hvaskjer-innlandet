#!/usr/bin/env bash
# Evaluation harness: run every test case in fixtures/cases/ and compare the verdict
# with fixtures/cases/<case>/expect (published | reject).
#
#   ./eval/run_cases.sh           no model: uses each case's recorded extracted.golden.json (CI)
#   ./eval/run_cases.sh --agent   calls the extraction agents for each case and scores them
#                                 against gold.json (costs tokens)
#
# Exit 0 only if every case gets its expected verdict.
set -uo pipefail
cd "$(dirname "$0")/.."
AGENT=${1:-}
pass=0; total=0
printf "%-15s %-10s %-10s %s\n" case expected got result
for dir in fixtures/cases/*/; do
  c=$(basename "$dir"); [ -f "$dir/expect" ] || continue
  total=$((total + 1)); want=$(tr -d '\n' < "$dir/expect")
  export HARNESS_TODAY=$(tr -d '\n' < "$dir/today")
  rm -rf out/raw out/extracted out/work out/events.json out/site
  (
    python3 harness/collect.py --case "$c" && python3 eval/check_collect.py || exit 1
    if [ "$AGENT" = "--agent" ] && [ ! -f "$dir/extracted.golden.json" -o -f "$dir/gold.json" ]; then
      python3 harness/extract.py --no-cache
    else
      mkdir -p out/extracted && cp "$dir/extracted.golden.json" out/extracted/hamar_kulturhus.json
    fi
    python3 eval/check_extract.py && python3 harness/merge.py \
      && python3 harness/build_site.py && python3 eval/check_site.py
  ) >/dev/null 2>&1
  if [ $? -eq 0 ]; then got=published; else got=reject; fi
  if [ "$got" = "$want" ]; then res=PASS; pass=$((pass + 1)); else res=FAIL; fi
  printf "%-15s %-10s %-10s %s\n" "$c" "$want" "$got" "$res"
  if [ "$AGENT" = "--agent" ] && [ -f "$dir/gold.json" ] && [ -d out/extracted ]; then
    python3 eval/score_extract.py "$dir/gold.json" | sed 's/^/    /'
  fi
done
echo "$pass/$total cases as expected"
[ "$pass" -eq "$total" ]

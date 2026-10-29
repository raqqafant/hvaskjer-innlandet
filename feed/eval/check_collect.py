"""Check stage 1: at least one source delivered documents, and every document is well-formed.

A failed source is allowed (the site must then say so, see check_site.py);
all sources failing is not.
"""
import json
import sys
from pathlib import Path

report = json.loads(Path("out/collect_report.json").read_text(encoding="utf-8"))
problems, total = [], 0
ok_sources = [s for s in report["sources"] if s["ok"]]
if not ok_sources:
    sys.exit("FAIL: every source failed: " + "; ".join(f"{s['source']}: {s['error']}" for s in report["sources"]))

for s in ok_sources:
    raw = json.loads(Path(f"out/raw/{s['source']}.json").read_text(encoding="utf-8"))
    ids = set()
    for d in raw["docs"]:
        for k in ("doc_id", "url", "title", "text"):
            if not str(d.get(k) or "").strip():
                problems.append(f"{s['source']}/{d.get('doc_id')}: empty {k}")
        if d.get("doc_id") in ids:
            problems.append(f"{s['source']}: duplicate doc_id {d['doc_id']}")
        ids.add(d.get("doc_id"))
        if not str(d.get("url", "")).startswith("https://"):
            problems.append(f"{s['source']}/{d.get('doc_id')}: url is not https")
    total += len(raw["docs"])

if problems:
    print("FAIL: " + "; ".join(problems[:20]))
    sys.exit(1)
failed = [s["source"] for s in report["sources"] if not s["ok"]]
print(f"PASS ({total} doc(s) from {len(ok_sources)} source(s)" + (f"; unavailable: {', '.join(failed)})" if failed else ")"))

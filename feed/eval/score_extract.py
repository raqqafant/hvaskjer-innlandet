"""Quantitative score of the extraction agents against hand-labelled gold answers.

  python3 eval/score_extract.py fixtures/cases/<case>/gold.json

Reads out/extracted/*.json (from the last run). Prints per-field accuracy and the
date precision/recall; exit 0 always (this is a measurement, not a gate).
"""
import json
import sys
from pathlib import Path

gold = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
got = {}
for f in Path("out/extracted").glob("*.json"):
    data = json.loads(f.read_text(encoding="utf-8"))
    for ev in data["events"]:
        got[str(ev["doc_id"])] = ev
    for sk in data["skipped"]:
        got[str(sk["doc_id"])] = {"skip": sk["reason"]}

tp = fp = fn = time_ok = time_n = 0
fields = {"status": [0, 0], "free": [0, 0], "price": [0, 0], "skip": [0, 0]}
rows = []
for did, g in gold.items():
    e = got.get(did, {})
    if "skip" in g:
        fields["skip"][1] += 1
        ok = e.get("skip") == g["skip"]
        fields["skip"][0] += ok
        rows.append(f"{did}: skip {g['skip']} -> {e.get('skip', 'not skipped')} {'ok' if ok else 'WRONG'}")
        continue
    gd = {d: t for d, t in g["occ"]}
    ed = {o["date"]: o.get("time") for o in e.get("occurrences", [])}
    tp += len(set(gd) & set(ed)); fp += len(set(ed) - set(gd)); fn += len(set(gd) - set(ed))
    for d in set(gd) & set(ed):
        time_n += 1
        time_ok += gd[d] == ed[d]
        if gd[d] != ed[d]:
            rows.append(f"{did}: {d} time gold {gd[d]} vs {ed[d]}")
    for k, ek in (("status", "status"), ("free", "free"), ("price", "price_from_nok")):
        if k in g:
            fields[k][1] += 1
            gv, ev = g[k], e.get(ek)
            if k == "free":
                ev = bool(ev)
            fields[k][0] += gv == ev
            if gv != ev:
                rows.append(f"{did}: {k} gold {gv} vs {ev}")

prec = tp / (tp + fp) if tp + fp else 1.0
rec = tp / (tp + fn) if tp + fn else 1.0
print(f"dates: precision {prec:.2f}, recall {rec:.2f} ({tp} tp, {fp} fp, {fn} fn)")
print(f"start time: {time_ok}/{time_n}")
for k, (ok, n) in fields.items():
    if n:
        print(f"{k}: {ok}/{n}")
for r in rows:
    print("  " + r)

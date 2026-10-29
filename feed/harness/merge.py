"""Stage 3: merge all sources into one list of upcoming events (code only).

One row per occurrence. Past occurrences are dropped. Exact duplicates across
sources (same normalised title, date and time) are merged, keeping every source
link. Writes out/events.json.
"""
import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"


def key_title(t):
    t = unicodedata.normalize("NFKD", t.lower())
    return re.sub(r"[^a-z0-9æøå]+", " ", t).strip()


def main():
    today = os.environ.get("HARNESS_TODAY") or datetime.now(ZoneInfo("Europe/Oslo")).date().isoformat()
    report = json.loads((OUT / "collect_report.json").read_text(encoding="utf-8"))
    rows, merged = {}, 0
    for f in sorted((OUT / "extracted").glob("*.json")):
        ext = json.loads(f.read_text(encoding="utf-8"))
        raw = json.loads((OUT / "raw" / f"{ext['source']}.json").read_text(encoding="utf-8"))
        docs = {d["doc_id"]: d for d in raw["docs"]}
        for ev in ext["events"]:
            doc = docs[str(ev["doc_id"])]
            for o in ev["occurrences"]:
                if o["date"] < today:
                    continue
                k = (key_title(doc["title"]), o["date"], o.get("time"))
                link = {"source": ext["source"], "label": ext["label"], "url": doc["url"]}
                if k in rows:
                    rows[k]["links"].append(link)
                    merged += 1
                    continue
                rows[k] = {
                    "id": f"{ext['source']}:{doc['doc_id']}:{o['date']}:{o.get('time') or 'na'}",
                    "title": doc["title"], "date": o["date"], "time": o.get("time"),
                    "town": ext["town"], "venue": ev.get("venue"),
                    "free": ev.get("free"), "price_from_nok": ev.get("price_from_nok"),
                    "status": ev["status"], "category": ev["category"], "audience": ev.get("audience"),
                    "summary_no": ev["summary_no"], "summary_en": ev["summary_en"],
                    "links": [link],
                }
    events = sorted(rows.values(), key=lambda r: (r["date"], r["time"] or "99:99", r["title"]))
    (OUT / "events.json").write_text(json.dumps({
        "today": today,
        "sources": report["sources"],
        "merged_duplicates": merged,
        "events": events,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"merge: {len(events)} upcoming event(s), {merged} duplicate(s) merged")


if __name__ == "__main__":
    main()

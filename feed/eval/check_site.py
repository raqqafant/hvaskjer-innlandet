"""Check stages 3-4: events.json and the site agree, and nothing stale or unsourced is shown.

  - every event in out/events.json is on the page exactly once, and nothing else is
  - no event is dated before today
  - every event links to an https source URL that came from the collected documents
  - every failed source is named in the "unavailable" banner
  - the free badge is shown only for events extracted as free
"""
import json
import re
import sys
from pathlib import Path

data = json.loads(Path("out/events.json").read_text(encoding="utf-8"))
page = Path("out/site/index.html").read_text(encoding="utf-8")
problems = []

known_urls = set()
for f in Path("out/raw").glob("*.json"):
    known_urls |= {d["url"] for d in json.loads(f.read_text(encoding="utf-8"))["docs"]}

on_page = re.findall(r'data-id="([^"]+)"', page)
ids = [ev["id"] for ev in data["events"]]
for i in ids:
    if on_page.count(i) != 1:
        problems.append(f"{i} is on the page {on_page.count(i)} times")
for i in set(on_page) - set(ids):
    problems.append(f"{i} is on the page but not in events.json")

for ev in data["events"]:
    if ev["date"] < data["today"]:
        problems.append(f"{ev['id']} is in the past ({ev['date']})")
    for link in ev["links"]:
        if link["url"] not in known_urls or not link["url"].startswith("https://"):
            problems.append(f"{ev['id']} links to {link['url']}, not a collected source URL")
    m = re.search(rf'data-id="{re.escape(ev["id"])}" data-free="(true|false)"', page)
    if m and (m.group(1) == "true") != bool(ev["free"]):
        problems.append(f"{ev['id']}: free badge does not match the data")

for s in data["sources"]:
    if not s["ok"] and f'data-down="{s["source"]}"' not in page:
        problems.append(f"source {s['source']} failed but the page does not say so")

if problems:
    print("FAIL:\n- " + "\n- ".join(problems[:30]))
    sys.exit(1)
print(f"PASS ({len(ids)} event(s) on the page)")

"""Check stage 2: every extracted fact is grounded in its source document.

Used two ways:
  - by harness/extract.py after each agent attempt (check_batch -> list of problems,
    fed back to the agent on the next attempt);
  - from the command line over out/extracted/*.json (defence in depth, and the
    failure-rate limit):  python3 eval/check_extract.py

Grounding rules:
  - each evidence string occurs in the document text (whitespace/case-insensitive)
  - the occurrence date's day and month are in its evidence (and the year, if written)
  - the occurrence time is in its evidence (13:00, 13.00, or "kl. 13" for :00)
  - free=true needs "gratis" in price_evidence; price_from_nok needs that number in it
  - status sold_out/cancelled needs "utsolgt"/"avlyst" in the text
  - every number in a summary occurs in the text
  - every doc_id answered exactly once; no unknown doc_ids
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

MONTHS = {
    1: ("januar", "jan"), 2: ("februar", "feb"), 3: ("mars", "mar"), 4: ("april", "apr"),
    5: ("mai",), 6: ("juni", "jun"), 7: ("juli", "jul"), 8: ("august", "aug"),
    9: ("september", "sep", "sept"), 10: ("oktober", "okt"), 11: ("november", "nov"),
    12: ("desember", "des"),
}
CATEGORIES = {"concert", "theatre", "dance", "family", "comedy", "talk",
              "exhibition", "film", "course", "social", "other"}
STATUSES = {"scheduled", "sold_out", "cancelled"}
STATUS_WORD = {"sold_out": "utsolgt", "cancelled": "avlyst"}  # the Norwegian word the page must contain
AUDIENCES = {"children", "youth", "adults", "all", None}
SKIP_REASONS = {"no_date", "not_an_event", "past"}
MAX_FAILED_SHARE = 0.20


def norm(s):
    s = (s or "").replace("\u00a0", " ").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


def date_in(evidence, d):
    ev = norm(evidence)
    names = "|".join(MONTHS[d.month])
    day = rf"(?<!\d)0?{d.day}\."
    by_name = re.search(rf"{day}\s*(?:-\s*\d{{1,2}}\.\s*)?(?:{names})\b", ev) or \
        (re.search(rf"{day}", ev) and re.search(rf"\b(?:{names})\b", ev))
    by_num = re.search(rf"(?<!\d)0?{d.day}\.0?{d.month}(?:\.|\b)", ev)
    if not (by_name or by_num):
        return False
    years = re.findall(r"\b(20\d\d)\b", ev)
    return not years or str(d.year) in years


def time_in(evidence, t):
    hh, mm = t.split(":")
    ev = norm(evidence)
    if re.search(rf"(?<!\d)0?{int(hh)}[:.]{mm}(?!\d)", ev):
        return True
    return mm == "00" and re.search(rf"kl\.?\s*0?{int(hh)}(?![\d:.])", ev) is not None


def check_batch(batch_in, batch_out, today=None):
    today = date.fromisoformat(today or batch_in["today"])
    docs = {d["doc_id"]: d for d in batch_in["docs"]}
    problems, seen = [], []
    if not isinstance(batch_out, dict):
        return ["output is not a JSON object"]

    for ev in batch_out.get("events", []):
        did = str(ev.get("doc_id"))
        seen.append(did)
        if did not in docs:
            problems.append(f"{did}: doc_id is not in the input")
            continue
        text = norm(docs[did]["text"])
        p = f"{did}"
        occ = ev.get("occurrences") or []
        if not occ:
            problems.append(f"{p}: no occurrences (skip it instead)")
        for o in occ:
            evid = o.get("evidence") or ""
            if norm(evid) not in text:
                problems.append(f'{p}: evidence not in text: "{evid[:60]}"')
                continue
            try:
                d = date.fromisoformat(o.get("date", ""))
            except ValueError:
                problems.append(f"{p}: bad date {o.get('date')!r}")
                continue
            if not date_in(evid, d):
                problems.append(f'{p}: date {d} is not in its evidence "{evid[:60]}"')
            if o.get("time"):
                if not re.fullmatch(r"\d\d:\d\d", o["time"]):
                    problems.append(f"{p}: bad time {o['time']!r}")
                elif not time_in(evid, o["time"]):
                    problems.append(f'{p}: time {o["time"]} is not in its evidence "{evid[:60]}"')
        for field in ("venue_evidence", "price_evidence"):
            if ev.get(field) and norm(ev[field]) not in text:
                problems.append(f'{p}: {field} not in text: "{ev[field][:60]}"')
        if ev.get("venue") and not ev.get("venue_evidence"):
            if norm(ev["venue"]) not in text:
                problems.append(f"{p}: venue {ev['venue']!r} has no evidence")
        if ev.get("free") is True and "gratis" not in norm(ev.get("price_evidence")):
            problems.append(f'{p}: free=true but price_evidence has no "gratis"')
        if ev.get("price_from_nok") is not None and \
                str(ev["price_from_nok"]) not in re.sub(r"[ .]", "", norm(ev.get("price_evidence"))):
            problems.append(f"{p}: price {ev['price_from_nok']} is not in price_evidence")
        if ev.get("status") not in STATUSES:
            problems.append(f"{p}: status {ev.get('status')!r} not allowed")
        elif ev["status"] in STATUS_WORD and STATUS_WORD[ev["status"]] not in text:
            problems.append(f'{p}: status "{ev["status"]}" but "{STATUS_WORD[ev["status"]]}" is not in the text')
        if ev.get("category") not in CATEGORIES:
            problems.append(f"{p}: category {ev.get('category')!r} not allowed")
        if ev.get("audience") not in AUDIENCES:
            problems.append(f"{p}: audience {ev.get('audience')!r} not allowed")
        for lang in ("summary_no", "summary_en"):
            s = ev.get(lang) or ""
            if not s.strip():
                problems.append(f"{p}: empty {lang}")
            if len(s.split()) > 30:
                problems.append(f"{p}: {lang} has {len(s.split())} words, max 25")
            for num in re.findall(r"\d+", s):
                if num not in text:
                    problems.append(f"{p}: {lang} has the number {num}, which is not in the text")

    for sk in batch_out.get("skipped", []):
        did = str(sk.get("doc_id"))
        seen.append(did)
        if did not in docs:
            problems.append(f"{did}: skipped doc_id is not in the input")
        if sk.get("reason") not in SKIP_REASONS:
            problems.append(f"{did}: skip reason {sk.get('reason')!r} not allowed")

    for did in docs:
        n = seen.count(did)
        if n != 1:
            problems.append(f"{did}: answered {n} times, expected exactly 1")
    return problems


def main():
    files = sorted(Path("out/extracted").glob("*.json"))
    if not files:
        sys.exit("FAIL: no out/extracted/*.json")
    problems, total, failed = [], 0, 0
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        raw = json.loads(Path(f"out/raw/{data['source']}.json").read_text(encoding="utf-8"))
        answered = {e["doc_id"] for e in data["events"]} | {s["doc_id"] for s in data["skipped"]}
        docs = [d for d in raw["docs"] if d["doc_id"] in answered]
        problems += [f"{data['source']}/{p}" for p in check_batch(
            {"today": data["today"], "docs": docs},
            {"events": data["events"], "skipped": data["skipped"]})]
        total += len(raw["docs"])
        failed += len(data.get("failed_docs", []))
    if problems:
        print("FAIL:\n- " + "\n- ".join(problems[:30]))
        sys.exit(1)
    share = failed / total if total else 1
    if share > MAX_FAILED_SHARE:
        sys.exit(f"FAIL: {failed}/{total} documents could not be extracted (limit {MAX_FAILED_SHARE:.0%})")
    print(f"PASS ({total - failed}/{total} documents extracted and grounded)")


if __name__ == "__main__":
    main()

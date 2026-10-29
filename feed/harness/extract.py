"""Stage 2: extraction agents. One headless agent per batch of documents, in parallel.

For every source in out/raw/, documents are split into batches of BATCH. Each batch
is a separate `claude -p` call that may read only its own input file and write only
its own output file. After each attempt eval/check_extract.check_batch() decides;
its problems go back to the agent (at most MAX_ATTEMPTS). Batches that still fail
are recorded as failed_docs, never published.

Cost control: MAX_BUDGET_USD per call, MAX_RUN_USD for the whole run (no new
batch starts once it is spent). Cache: a document whose text has not changed
reuses its earlier, checked extraction (cache/extract/), so a daily run only pays
for new or changed events.

  python3 harness/extract.py              # uses the cache
  python3 harness/extract.py --no-cache   # test cases: always call the agents
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "eval"))
from check_extract import check_batch  # noqa: E402

OUT, WORK, CACHE = ROOT / "out", ROOT / "out/work", ROOT / "cache/extract"
BATCH = int(os.environ.get("BATCH", 8))
MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS", 3))
MAX_PARALLEL = int(os.environ.get("MAX_PARALLEL", 3))
MAX_BUDGET_USD = os.environ.get("MAX_BUDGET_USD", "0.50")
MAX_RUN_USD = float(os.environ.get("MAX_RUN_USD", 3.00))
MODEL = os.environ.get("EXTRACT_MODEL")  # e.g. "haiku"; default model if unset
PROMPT = (ROOT / "harness/prompts/extract.md").read_text(encoding="utf-8")

spent = [0.0]
lock = threading.Lock()


def digest(doc):
    return hashlib.sha256(doc["text"].encode("utf-8")).hexdigest()[:16]


def run_agent(src, k, batch):
    rel_in = f"out/work/{src}/batch-{k:02d}.in.json"
    rel_out = f"out/work/{src}/batch-{k:02d}.out.json"
    (ROOT / rel_in).write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    feedback, problems = "", ["not run"]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        with lock:
            if spent[0] >= MAX_RUN_USD:
                return None, [f"run budget ${MAX_RUN_USD:.2f} spent before attempt {attempt}"]
        (ROOT / rel_out).unlink(missing_ok=True)
        prompt = PROMPT.replace("{{IN}}", rel_in).replace("{{OUT}}", rel_out).replace(
            "{{FEEDBACK}}", f"\nYour previous attempt failed the check. Fix exactly these problems:\n{feedback}\n" if feedback else "")
        cmd = ["claude", "-p", prompt, "--permission-mode", "dontAsk",
               "--allowedTools", f"Read(/{rel_in}),Write(/{rel_out}),Edit(/{rel_out})",
               "--output-format", "json", "--max-budget-usd", MAX_BUDGET_USD]
        if MODEL:
            cmd += ["--model", MODEL]
        res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=600)
        try:
            cost = json.loads(res.stdout).get("total_cost_usd") or 0
        except ValueError:
            cost = 0
        with lock:
            spent[0] += cost
        try:
            out = json.loads((ROOT / rel_out).read_text(encoding="utf-8"))
            problems = check_batch(batch, out)
        except (OSError, ValueError) as err:
            out, problems = None, [f"no valid JSON in {rel_out}: {err}"]
        print(f"extract: {src} batch {k} attempt {attempt}: "
              f"{'PASS' if not problems else f'{len(problems)} problem(s)'} (${cost:.3f})", file=sys.stderr)
        if not problems:
            return out, []
        feedback = "\n".join(f"- {p}" for p in problems[:25])
    return None, problems


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args(argv)
    today = datetime.now(ZoneInfo("Europe/Oslo")).date().isoformat()
    today = os.environ.get("HARNESS_TODAY", today)  # fixed date for test cases
    (OUT / "extracted").mkdir(parents=True, exist_ok=True)
    for f in (OUT / "extracted").glob("*.json"):
        f.unlink()

    jobs, results = [], {}
    for raw_file in sorted((OUT / "raw").glob("*.json")):
        raw = json.loads(raw_file.read_text(encoding="utf-8"))
        src = raw["source"]
        notes = (ROOT / "sources" / src / "notes.md").read_text(encoding="utf-8")
        cache_dir = CACHE / src
        cache_dir.mkdir(parents=True, exist_ok=True)
        (WORK / src).mkdir(parents=True, exist_ok=True)
        res = results[src] = {"source": src, "label": raw["label"], "town": raw["town"], "today": today,
                              "events": [], "skipped": [], "failed_docs": [], "from_cache": 0}
        todo = []
        for d in raw["docs"]:
            c = cache_dir / f"{d['doc_id']}-{digest(d)}.json"
            if not args.no_cache and c.exists():
                hit = json.loads(c.read_text(encoding="utf-8"))
                if hit.get("today") == today:  # "past" depends on today, so cache per day
                    res["events" if "occurrences" in hit["item"] else "skipped"].append(hit["item"])
                    res["from_cache"] += 1
                    continue
            todo.append(d)
        for k, i in enumerate(range(0, len(todo), BATCH), 1):
            docs = [{key: d[key] for key in ("doc_id", "title", "url", "text")} for d in todo[i:i + BATCH]]
            jobs.append((src, k, {"source": src, "label": raw["label"], "town": raw["town"],
                                  "today": today, "source_notes": notes, "docs": docs}))

    def work(job):
        src, k, batch = job
        out, problems = run_agent(src, k, batch)
        return src, batch, out, problems

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as pool:
        for src, batch, out, problems in pool.map(work, jobs):
            res = results[src]
            if out is None:
                res["failed_docs"] += [{"doc_id": d["doc_id"], "problems": problems[:5]} for d in batch["docs"]]
                continue
            res["events"] += out.get("events", [])
            res["skipped"] += out.get("skipped", [])
            by_id = {d["doc_id"]: d for d in batch["docs"]}
            for item in out.get("events", []) + out.get("skipped", []):
                d = by_id[str(item["doc_id"])]
                (CACHE / src / f"{d['doc_id']}-{digest(d)}.json").write_text(
                    json.dumps({"today": batch["today"], "item": item}, ensure_ascii=False), encoding="utf-8")

    for src, res in results.items():
        res["cost_usd"] = round(spent[0], 4)
        (OUT / "extracted" / f"{src}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"extract: {src}: {len(res['events'])} event doc(s), {len(res['skipped'])} skipped, "
              f"{len(res['failed_docs'])} failed, {res['from_cache']} from cache", file=sys.stderr)
    print(f"extract: {len(jobs)} agent batch(es), ${spent[0]:.3f} total", file=sys.stderr)


if __name__ == "__main__":
    main()

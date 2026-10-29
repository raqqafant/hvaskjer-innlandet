"""Stage 1: run every enabled source adapter, in parallel, isolated from each other.

One failing source never stops the others; its failure is recorded in
out/collect_report.json and shown on the site as "kilde utilgjengelig".

  python3 harness/collect.py              # live
  python3 harness/collect.py --offline    # fixtures/live/<source>/
  python3 harness/collect.py --case NAME  # fixtures/cases/NAME/<source>/
"""
import argparse
import importlib.util
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"


def enabled_sources():
    reg = json.loads((ROOT / "sources/registry.json").read_text(encoding="utf-8"))
    return [s for s in reg["sources"] if s["enabled"]]


def adapter(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "sources" / name / "fetch.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_one(src, mode, case):
    name = src["name"]
    entry = {"source": name, "label": src["label"], "town": src["town"], "ok": True, "error": None, "docs": 0}
    try:
        mod = adapter(name)
        if mode == "live":
            docs = mod.fetch(ROOT / "fixtures/live" / name)
        elif mode == "offline":
            docs = mod.load(ROOT / "fixtures/live" / name)
        else:
            docs = mod.load(ROOT / "fixtures/cases" / case / name)
        if not docs:
            raise ValueError("no documents")
        entry["docs"] = len(docs)
        (OUT / "raw").mkdir(parents=True, exist_ok=True)
        (OUT / "raw" / f"{name}.json").write_text(json.dumps(
            {"source": name, "label": src["label"], "town": src["town"], "docs": docs},
            ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception as err:  # noqa: BLE001 - any adapter failure is recorded, not raised
        entry.update(ok=False, error=f"{type(err).__name__}: {err}")
        print(f"collect: {name} FAILED: {entry['error']}", file=sys.stderr)
    return entry


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--case")
    args = ap.parse_args(argv)
    mode = "case" if args.case else ("offline" if args.offline else "live")

    OUT.mkdir(exist_ok=True)
    for f in (OUT / "raw").glob("*.json") if (OUT / "raw").exists() else []:
        f.unlink()
    sources = enabled_sources()
    with ThreadPoolExecutor(max_workers=4) as pool:
        report = list(pool.map(lambda s: run_one(s, mode, args.case), sources))
    (OUT / "collect_report.json").write_text(json.dumps({
        "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode if mode != "case" else f"case:{args.case}",
        "sources": report,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    for e in report:
        print(f"collect: {e['source']}: {'ok' if e['ok'] else 'FAILED'}, {e['docs']} doc(s)", file=sys.stderr)


if __name__ == "__main__":
    main()

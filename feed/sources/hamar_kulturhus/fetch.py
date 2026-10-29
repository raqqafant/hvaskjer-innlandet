"""Source adapter: Hamar Kulturhus (hamar-kulturhus.no).

robots.txt (checked 29.10.2026): "User-agent: * / Disallow:" - everything allowed.
The WordPress REST API lists the custom post type `event`
(/wp-json/wp/v2/event); date, time, stage and price are not structured fields,
so we fetch each event page and keep its text. A page is fetched again only when
the API's `modified_gmt` has changed (cache in fixtures/live/hamar_kulturhus/).

Returns documents in the common shape (see sources/common.py).
"""
import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import get_json, get, html_to_text  # noqa: E402

NAME = "hamar_kulturhus"
API = "https://www.hamar-kulturhus.no/wp-json/wp/v2/event"
FIELDS = "id,link,title,modified_gmt"


def list_events():
    events, page = [], 1
    while True:
        data, headers = get_json(f"{API}?per_page=100&page={page}&_fields={FIELDS}")
        events += data
        total_pages = int(headers.get("X-WP-TotalPages") or headers.get("x-wp-totalpages") or 1)
        if page >= total_pages:
            return events
        page += 1


def fetch(cache_dir: Path):
    """Live fetch. Writes one cached JSON per event; returns the documents."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    docs = []
    for ev in list_events():
        doc_id = str(ev["id"])
        cached = cache_dir / f"{doc_id}.json"
        if cached.exists():
            old = json.loads(cached.read_text(encoding="utf-8"))
            if old.get("modified") == ev["modified_gmt"]:
                docs.append(old)
                continue
        body, _ = get(ev["link"])
        doc = {
            "doc_id": doc_id,
            "url": ev["link"],
            "title": html.unescape(ev["title"]["rendered"]).strip(),
            "modified": ev["modified_gmt"],
            "text": html_to_text(body),
        }
        cached.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
        docs.append(doc)
    # events no longer in the API are dropped from the cache (the source removed them)
    keep = {d["doc_id"] for d in docs}
    for f in cache_dir.glob("*.json"):
        if f.stem not in keep:
            f.unlink()
    return docs


def load(cache_dir: Path):
    """Offline: the documents saved by the last live fetch."""
    return [json.loads(f.read_text(encoding="utf-8")) for f in sorted(cache_dir.glob("*.json"))]

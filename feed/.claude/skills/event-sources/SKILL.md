---
name: event-sources
description: Use when adding, changing or debugging a source adapter in sources/, or when reading sources/registry.json or fixtures/live/<source>/.
---
# Event sources

Contract: `sources/<name>/fetch.py` exposes `fetch(cache_dir) -> list[doc]` (live, writes one JSON per doc
into cache_dir) and `load(cache_dir) -> list[doc]` (offline). A doc is
`{"doc_id", "url", "title", "modified", "text"}`; `text` is plain page text (use `common.html_to_text`).
`sources/<name>/notes.md` is given to the extraction agent: how this source writes dates, times, places
and prices. Keep it under 10 lines and only facts seen in real pages.

Before enabling a source (`"enabled": true` in `sources/registry.json`):
1. Read its robots.txt; record the result and the date in `terms`. Do not use a source that disallows us.
2. Prefer an API/feed (WordPress: `/wp-json/wp/v2/<type>`, sitemaps) over HTML listings.
3. Use `common.get` (identifying User-Agent, 1 request/second); refetch only changed items.
4. Never keep contact persons, e-mails or phone numbers in `text` if they can be cut in code.
5. Add a test case `fixtures/cases/<name>-typical/` with 3-5 docs, `gold.json`, `expect`, `today`.

Sources checked 29.10.2026: Hamar Kulturhus (enabled; WP type `event`, 87 events, robots allows all),
Kunstbanken Hamar (robots allows all but /wp-admin/, PDF programme), lillehammer.com (Simpleview listing;
robots allows general crawlers except some paths; ask about reuse first).

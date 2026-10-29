"""Shared helpers for source adapters: polite HTTP and HTML -> plain text.

Every adapter returns documents in the same shape, so the extraction agents
never need to know where a document came from:

  {"doc_id": str, "url": str, "title": str, "modified": str, "text": str}
"""
import json
import re
import time
import urllib.request
from html.parser import HTMLParser

USER_AGENT = "hvaskjer-innlandet/0.1 (+https://github.com/raqqafant/hvaskjer-innlandet)"
DELAY_S = 1.0          # at most one request per second per source
MAX_TEXT = 8000        # characters of page text handed on per document
_last = [0.0]


def get(url, accept="text/html"):
    wait = DELAY_S - (time.monotonic() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            body = res.read().decode(res.headers.get_content_charset() or "utf-8", "replace")
            return body, dict(res.headers)
    finally:
        _last[0] = time.monotonic()


def get_json(url):
    body, headers = get(url, accept="application/json")
    return json.loads(body), headers


SKIP = {"script", "style", "noscript", "svg", "header", "nav", "footer", "form", "iframe", "button"}
BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article", "dd", "dt", "time"}


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.main_parts, self.skip, self.in_main = [], [], 0, 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.skip += 1
        if tag == "main":
            self.in_main += 1
        if tag in BLOCK:
            self._add("\n")

    def handle_endtag(self, tag):
        if tag in SKIP and self.skip:
            self.skip -= 1
        if tag == "main" and self.in_main:
            self.in_main -= 1
        if tag in BLOCK:
            self._add("\n")

    def handle_data(self, data):
        if not self.skip:
            self._add(data)

    def _add(self, s):
        self.parts.append(s)
        if self.in_main:
            self.main_parts.append(s)


EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?<!\d)(?:\+47[\s-]?)?(?:\d{8}|\d{2}(?:[\s-]\d{2}){3}|\d{3}[\s-]\d{2}[\s-]\d{3})(?!\d)")


def scrub(text):
    """Remove e-mail addresses and Norwegian phone numbers: we never store contact details."""
    return PHONE.sub("[phone removed]", EMAIL.sub("[e-mail removed]", text))


def html_to_text(html):
    p = _Text()
    p.feed(html)
    raw = "".join(p.main_parts) or "".join(p.parts)   # prefer <main> when the page has one
    lines = [re.sub(r"[ \t ]+", " ", ln).strip() for ln in raw.splitlines()]
    text = "\n".join(ln for ln in lines if ln)
    return scrub(text)[:MAX_TEXT]

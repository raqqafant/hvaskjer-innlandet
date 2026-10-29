"""Stage 4: build the static site out/site/index.html from out/events.json (code only).

No model here: what the site shows is exactly what passed the checks. Sources
that failed are named in a banner, so "few events" is never confused with
"source down". Each event links back to its source.
"""
import html
import json
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
CAT = {"concert": "Concert", "theatre": "Theatre", "dance": "Dance", "family": "Family",
       "comedy": "Comedy", "talk": "Talk", "exhibition": "Exhibition", "film": "Film",
       "course": "Course", "social": "Social", "other": "Other"}
e = html.escape


def day_heading(iso):
    d = date.fromisoformat(iso)
    return f"{DAYS[d.weekday()]} {d.day} {MONTHS[d.month - 1]}"


def card(ev):
    badges = []
    if ev["free"]:
        badges.append('<span class="b free">Free</span>')
    elif ev["price_from_nok"] is not None:
        badges.append(f'<span class="b">From NOK {ev["price_from_nok"]}</span>')
    if ev["status"] == "cancelled":
        badges.append('<span class="b warn">Cancelled</span>')
    elif ev["status"] == "sold_out":
        badges.append('<span class="b warn">Sold out</span>')
    if ev["audience"] == "children" or ev["category"] == "family":
        badges.append('<span class="b kids">For children</span>')
    links = " · ".join(f'<a href="{e(l["url"])}">{e(l["label"])}</a>' for l in ev["links"])
    where = ", ".join(x for x in (ev["venue"], ev["town"]) if x)
    return f"""<article class="ev" data-id="{e(ev['id'])}" data-free="{str(bool(ev['free'])).lower()}" data-kids="{str(ev['audience'] == 'children' or ev['category'] == 'family').lower()}">
  <div class="t">{e(ev['time'] or '')}</div>
  <div><h3>{e(ev['title'])}</h3>
  <p class="meta">{e(CAT.get(ev['category'], ''))} · {e(where)} {''.join(badges)}</p>
  <p lang="en">{e(ev['summary_en'])}</p><p lang="no">{e(ev['summary_no'])}</p>
  <p class="src">Source: {links}</p></div>
</article>"""


def main():
    data = json.loads((OUT / "events.json").read_text(encoding="utf-8"))
    failed = [s for s in data["sources"] if not s["ok"]]
    banner = "".join(
        f'<p class="down" data-down="{e(s["source"])}">Source unavailable today: {e(s["label"])}. '
        f'Its events are missing from this page.</p>' for s in failed)
    body, current = [], None
    for ev in data["events"]:
        if ev["date"] != current:
            current = ev["date"]
            body.append(f"<h2>{e(day_heading(current))}</h2>")
        body.append(card(ev))
    if not data["events"]:
        body.append("<p>No upcoming events found.</p>")
    ok = [s for s in data["sources"] if s["ok"]]
    stamp = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>What's On in Innlandet</title>
<style>
:root{{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1da;--acc:#1f5f5b;--warn:#a33}}
@media (prefers-color-scheme:dark){{:root{{--bg:#151514;--fg:#ecebe6;--mut:#a3a29c;--line:#2f2e2b;--acc:#7cc4bd;--warn:#f08a8a}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}}
main{{max-width:46rem;margin:0 auto;padding:1.5rem 1rem 4rem}}
h1{{margin:.2rem 0}} h2{{margin:2rem 0 .5rem;font-size:1.05rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}}
.ev{{display:grid;grid-template-columns:3.5rem 1fr;gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--line)}}
.ev h3{{margin:0;font-size:1rem}} .t{{font-variant-numeric:tabular-nums;color:var(--acc);font-weight:600}}
.meta,.src{{color:var(--mut);font-size:.85rem;margin:.1rem 0}} .ev p{{margin:.2rem 0}}
.b{{display:inline-block;font-size:.75rem;border:1px solid var(--line);border-radius:1rem;padding:0 .5rem;margin-left:.3rem}}
.free{{border-color:var(--acc);color:var(--acc)}} .warn{{border-color:var(--warn);color:var(--warn)}}
.down{{border:1px solid var(--warn);color:var(--warn);padding:.5rem .75rem;border-radius:.4rem}}
.bar{{display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0}} .bar button{{font:inherit;padding:.3rem .8rem;border-radius:1rem;border:1px solid var(--line);background:none;color:inherit;cursor:pointer}}
.bar button[aria-pressed=true]{{background:var(--acc);border-color:var(--acc);color:var(--bg)}}
body.no [lang=en], body:not(.no) [lang=no]{{display:none}}
body.only-free .ev[data-free=false], body.only-kids .ev[data-kids=false]{{display:none}}
a{{color:var(--acc)}} footer{{margin-top:3rem;color:var(--mut);font-size:.85rem}}
</style></head>
<body><main>
<h1>What's On in Innlandet</h1>
<p class="meta">{len(data['events'])} upcoming events from {len(ok)} source(s). Updated {stamp}.</p>
{banner}
<div class="bar">
<button data-t="only-free" aria-pressed="false">Free only</button>
<button data-t="only-kids" aria-pressed="false">For children</button>
<button data-t="no" aria-pressed="false">Norsk</button>
</div>
{chr(10).join(body)}
<footer><p>Collected automatically from public web pages. Always check the organiser's page before you go.
Sources: {", ".join(e(s["label"]) for s in data["sources"])}.</p></footer>
</main>
<script>
document.querySelectorAll('.bar button').forEach(b=>b.onclick=()=>{{
  const on=document.body.classList.toggle(b.dataset.t); b.setAttribute('aria-pressed',on);}});
</script>
</body></html>
"""
    (OUT / "site").mkdir(parents=True, exist_ok=True)
    (OUT / "site" / "index.html").write_text(page, encoding="utf-8")
    # The same data for the mobile app: one JSON feed next to the page.
    (OUT / "site" / "events.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"build_site: {len(data['events'])} event(s) -> out/site/index.html")


if __name__ == "__main__":
    main()

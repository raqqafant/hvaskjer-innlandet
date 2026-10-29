# Hva skjer i Innlandet

An app (Android and iPhone) and a daily feed that show what's on in Hamar, Ringsaker, Stange and Løten:
concerts, theatre, talks, family events and things to do, in Norwegian and English, with filters for
today, the weekend, free events and children.

```
feed/   daily data pipeline: organisers' public pages -> AI extraction -> checks -> events.json
app/    the mobile app (Expo / React Native): reads events.json
```

## How the data gets to the app
1. `feed/` collects event pages from sources we are allowed to use (`feed/sources/registry.json`).
2. Extraction agents turn each page into structured events; every date, time and price must quote the
   page, and code checks it before anything is published.
3. The result is `feed/out/site/events.json` (and a simple web page, `index.html`).
4. A daily GitHub Action publishes both to GitHub Pages:
   `https://<github-user>.github.io/hvaskjer-innlandet/events.json`
5. The app reads that URL (`app/app.json` -> `expo.extra.feedUrl`). Without a URL it shows labelled example data.

## Run the feed
Needs Python 3.9+ and Claude Code (`claude` on PATH, logged in).
```
cd feed
./harness/run.sh              # live: fetch, extract, check, build out/site/
./harness/run.sh --dry-run    # print the stages only
./eval/run_cases.sh           # tests, no model, no network
```

## Run the app
```
cd app
npm install
npx expo login                # same account as in Expo Go on the phone
npx expo start                # scan the QR code with Expo Go
```

## Sources and permission
Only sources whose robots.txt allows us, recorded in the registry. Today: Hamar Kulturhus.
The joint "Hva skjer" calendar (Kulturnett Innlandet, Hamar/Ringsaker/Stange/Løten) needs an agreement
before it is connected; Hamar kommune's site blocks Claude in robots.txt.
We publish only title, time, place, price, one sentence and a link to the organiser, never full
descriptions, and no contact details (removed in code).

## Daily automation (one-time setup on GitHub)
- Repository secret `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`).
- Settings -> Pages -> Source: **GitHub Actions**.
- Kill switch: repository variable `HARNESS_HALT=1` stops the daily run.

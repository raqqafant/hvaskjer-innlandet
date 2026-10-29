# Hva skjer i Innlandet (app)

A clear, simple events app for Android and iPhone: what's on in Hamar, Ringsaker, Stange and Løten,
in Norwegian and English, with filters for today, the weekend, free events and children. One code base
(Expo / React Native, TypeScript, Expo Router).

## Try it on your phone
1. Install **Expo Go** from the App Store or Google Play.
2. On your computer, in this folder:
   ```
   npm install
   npx expo start
   ```
3. Scan the QR code (iPhone: Camera app; Android: Expo Go).

Web preview: `npx expo start --web`.

## Data
The app reads one JSON feed in the same format as the events harness's `out/events.json`
(`src/lib/types.ts`). Set its URL in `app.json` -> `expo.extra.feedUrl`.
- Empty `feedUrl`: the app shows clearly labelled, made-up **example data**.
- The last good feed is cached on the phone, so the app works offline and says so.
- A feed with the wrong shape never replaces a good cached one.
- Sources that failed are named in the app ("Source unavailable today").

Only use sources we are allowed to use. The joint "Hva skjer" calendar (Kulturnett Innlandet)
needs an agreement before it can be connected.

## Features
- List grouped by day ("Today", "Tomorrow", then dates), sorted by time
- Search; filters: today / weekend / 7 days, free, for children, town
- Event page: date, place, price, status (sold out, cancelled), summary, "checked against" the source,
  open the organiser's page, share
- Save events (heart), stored on the phone; Saved tab
- Norwegian or English (follows the phone's language, can be changed)
- Light and dark mode; 44 px touch targets; screen-reader labels

## Checks
```
npm run typecheck          # TypeScript
npx expo export --platform web   # the app bundles
```

## Publishing to App Store and Google Play
Builds run in the cloud with EAS (no Xcode or Android Studio needed):
```
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform all
npx eas-cli@latest submit --platform ios       # needs an Apple Developer account
npx eas-cli@latest submit --platform android   # needs a Google Play Console account
```
Before publishing: app icon and splash screen, a privacy policy page (the app collects no personal
data; saved events stay on the phone), and the store texts in Norwegian and English.

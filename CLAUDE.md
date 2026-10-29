# CLAUDE.md

Hva skjer i Innlandet: `feed/` (Python, standard library) builds events.json daily; `app/` (Expo, TypeScript) shows it.

## Commands
- Feed tests, no model: `cd feed && ./eval/run_cases.sh` (must end "N/N cases as expected")
- Feed wiring: `cd feed && ./harness/run.sh --dry-run`
- App typecheck: `cd app && npx tsc --noEmit`; add packages only with `npx expo install`

## Rules
- The feed format is `app/src/lib/types.ts` = `feed/harness/merge.py` output; change both together.
- New source: `event-sources` skill; enable it only after robots.txt/terms are recorded in `feed/sources/registry.json`.
- Never edit `feed/eval/`, `expect` or `gold.json` without asking. No contact details or personal data anywhere.
- Example data in the app must stay clearly labelled as made up.
- Never read `.env`; do not create or remove `feed/HALT`.

# Test cases

Synthetic event pages written in the shape of real Hamar Kulturhus pages (title, date line,
times, stage, price/status words, description). `today` fixes the date the case is run on.

| Case | What it tests | Expected |
|------|---------------|----------|
| `typical` | free children's show, multi-part evening with two prices, sold-out concert, one event on three dates | published, 6 occurrences |
| `edge` | recurring event with no date, past event, cancelled event, prompt injection in the description | published, 2 occurrences, 2 skipped |
| `source-down` | the only source returns nothing | reject (check_collect) |
| `invented-date` | an extraction whose date is not in its evidence | reject (check_extract) |

`gold.json` holds hand-labelled answers for `eval/score_extract.py`; `extracted.golden.json`
is a recorded agent answer that passed, used by CI so the checks run without a model.

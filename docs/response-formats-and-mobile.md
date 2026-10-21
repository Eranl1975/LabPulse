# Response formats and mobile layout (v8.1)

## Quick Summary / Detailed Analysis

Every troubleshooting result (text wizard, camera, photo upload, video) can be shown as a
**Quick Summary** or a **Detailed Analysis**. The user picks one next to *Get Troubleshooting Answer*
(Step 3) or *Analyse* (Visual Troubleshooting); the choice only sets the first view and is remembered
per browser (`localStorage: labpulse-response-format`). Default: Detailed Analysis, as before.

```
/api/query or /api/troubleshooting/visual  ──▶ one validated RankedAnswerV2 (unchanged)
                                                   │
             ┌─────────────────────────────────────┼──────────────────────────────┐
             ▼                                     ▼                              ▼
  Detailed Analysis (existing formatters)   lib/quick-summary.ts            history snapshot
  Concise / Standard / Deep / Manager       buildQuickSummary(answer)       LabReport.answer
                                             (browser, PDF and email)        (same report id)
```

- **No extra API calls.** The summary is computed from the answer already on screen, so switching
  views never re-runs the analysis. The PDF and email routes derive it from the same answer when the
  request carries `format: "summary"`; any other value, or none, keeps the detailed output.
- **Selection, not generation.** `buildQuickSummary` only selects and ranks fields of the answer:
  problem (user statement + image findings), 2–3 ranked hypotheses, 3–5 actions (tests for the
  leading causes first, then fixes), critical warnings, the stop/escalate condition and the 3
  best-labelled sources. It writes no new findings, so it cannot invent causes or sources.
- **Safety is never summarised away.** Every visual *safety-first* step is kept, followed by the
  true safety items most relevant to the problem. A step is shortened only at a clause break and
  only if the dropped part carries no warning, condition or negation (`shortenStep`).
- **AI status is never hidden.** The pipeline notice, every visual notice, and an explicit line
  when the AI call failed (e.g. exhausted credits) are shown at the top of the summary. Evidence
  labels are the same as in the detailed report (`lib/evidence-labels.ts`).
- **Length.** Target 150–250 words; above 250, the lowest-priority actions (down to 3) and then the
  third cause are dropped. The summary lists what the Detailed Analysis has in addition.

### History

`LabReport` (localStorage `LABPULSE_REPORTS`) gains two optional fields: `answer` (the analysis,
image thumbnails stripped) and `response_format` (last view). /reports → **View** reopens either
format offline, with PDF and email. The newest 30 reports keep their analysis; if storage is full,
analyses are dropped from the oldest reports first and the reports themselves are always kept.

**Legacy reports** (saved before v8.1) have no `answer`. They open with an explicit notice that
neither format can be shown without re-running the analysis; nothing is reconstructed from the
saved metadata.

No database change: report history has always lived in the browser.

## Mobile layout fixes

Measured with Chromium device emulation at 320, 360, 375, 390, 412, 430, 768 and 1280 px. Root
causes of the horizontal overflow on phones:

| Cause | Fix |
|---|---|
| Evidence badges (`.vt-badge`) were `white-space: nowrap`; "LABPULSE INTERNAL KNOWLEDGE" is ~340 px wide | Badges wrap, `max-width: 100%` |
| `.vt-list` grid items kept `min-width: auto`, so one long URL/code/badge widened the list | `minmax(0, 1fr)` track, `min-width: 0`, `overflow-wrap: anywhere` |
| Confidence bar (`nowrap` label) and *Download PDF* in one non-wrapping row | `.lp-report-head` wraps |
| Mode tabs `nowrap` + ellipsis ("Deep Te…") | 2×2 grid on phones, 4 columns ≥ 560 px |
| Step 3 chips `nowrap`; Back/Submit fixed widths in one row | Chips wrap; Submit wraps under Back |
| Report text had no word breaking for long URLs/part numbers | `.lp-report { overflow-wrap: anywhere }` |
| Gutters stacked (28 px container + 28 px card each side) | 16 px container gutter < 420 px, 16 px card padding < 640 px |
| "Troubleshooting" in the 26 px page title wider than a 320 px screen | Phone minimum 22 px; headings `overflow-wrap: break-word` |
| Dark mode (common on Android): the report card stayed white while dark-theme light text colours applied | The report is a light surface in both themes, with its text colours restored |

No `overflow-x: hidden` was added anywhere.

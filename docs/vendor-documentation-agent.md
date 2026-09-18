# Vendor Documentation Agent

Monthly job that finds new or changed vendor documentation, stores it, and lets
the troubleshooting engine answer from it.

## Schedule
`vercel.json` runs `GET /api/cron/monthly-refresh` at `0 6 1 * *` (06:00 UTC on
the 1st). Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else gets
401, and a missing `CRON_SECRET` gets 503.

One invocation handles `DEFAULT_VENDORS_PER_BATCH` vendors, then returns with
`resume_required: true` and the rest in `report_json.pending`. The next call
resumes the same run row. This keeps every request inside the function timeout.

Manual trigger: `POST /api/refresh` (admin only), or the Run now button on
`/admin/documents`.

## Flow
1. `getCrawlableVendorSites()` selects vendors from `config/vendor-sites.ts`.
2. `PoliteFetcher` reads robots.txt, applies a per-host delay, and sends
   `If-None-Match` / `If-Modified-Since` so unchanged documents cost one 304.
3. `VendorWebAdapter` walks the seed pages, keeps only allowlisted in-domain
   links that look like documentation, and classifies each by type and technique.
4. HTML and PDF are converted to text and chunked by section, keeping headings
   and page numbers.
5. Chunks go to `document_chunks`; metadata to `documents`. Symptom/cause/action
   triples are handed to the existing acquisition pipeline as `RawFetchedItem`s,
   so scoring, dedup and contradiction detection are unchanged.

## Retrieval
`lib/document-search.ts` runs a full-text query over `document_chunks`, filtered
by technique and vendor. `runTroubleshootingPipeline` calls it before the AI
layer, passes the hits in as grounding, and merges them into the answer's
evidence ordered by tier. Tier 1 requires the document to match the queried
model; otherwise vendor docs are tier 2.

`generation.document_search` reports `ok`, `no_matches`, `unavailable` or
`skipped`, and `generation.documents_used` counts what was cited. A search
failure never fails the answer.

## Vendor access
Each entry carries an `access` field measured on 2026-09-18:

| Status | Vendors |
| --- | --- |
| reachable | Shimadzu, Sciex |
| blocked (HTTP 403 from their WAF) | Agilent, Restek |
| unverified | Waters, Thermo Fisher, PerkinElmer, Merck/Sigma, Phenomenex, Supelco |

Blocked vendors are skipped by default so the run does not re-request a 403 every
month. LabPulse does not disguise its client to get past a WAF. Those vendors
need a licensed feed, or their documents stay curated by hand in
`data/instrument-docs.json`.

## Storage
- `019_documents.sql` — one row per document, with change-detection fields and
  an authority tier.
- `020_document_chunks.sql` — searchable passages with a `tsvector` and GIN index.

Seed the curated catalogue with `npx tsx scripts/seed-documents.ts` (add
`--dry-run` to preview). Curated entries are marked `discovered_by: 'seed'`.

## Limits
Per vendor per run: 40 pages, 25 documents, 1.5 s between requests, 20 s request
timeout, 25 MB per document. Scanned PDFs with no text layer are reported, not
stored.

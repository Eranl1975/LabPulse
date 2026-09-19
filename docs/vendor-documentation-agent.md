# Vendor Documentation Agent

Monthly job that finds new or changed vendor documentation, stores it, and lets
the troubleshooting engine answer from it.

## Schedule
Two cron entries in `vercel.json`:

| Schedule | Path | Purpose |
| --- | --- | --- |
| `0 6 1 * *` | `/api/cron/monthly-refresh` | Starts the month's run |
| `0 7 * * *` | `/api/cron/monthly-refresh?continue=true` | Drains it daily |

Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else gets 401, and a
missing `CRON_SECRET` gets 503.

The drain entry exists because one invocation cannot finish every vendor. A
polite crawl is slow on purpose: a measured live crawl of two vendors took about
73 seconds, and serverless functions have a hard wall-clock limit. So each
invocation takes a time budget (`BUDGET_MS`, 45 s, under the route's 60 s
`maxDuration`), crawls until the budget is spent, re-queues whatever it did not
finish, and returns `resume_required: true`. A vendor stopped mid-crawl goes to
the front of the queue.

`?continue=true` resumes an open run and does nothing when none is open, so the
hourly trigger never starts an extra run. Without it, the monthly trigger alone
would leave the run unfinished until the following month.

The drain runs daily, not hourly, because the Hobby plan caps both the number of
cron jobs (2, which this uses exactly) and how often one may fire. On the days
when no run is open the drain call returns `idle` immediately, so it costs
almost nothing. A full pass therefore completes over the first few days of the
month. On a plan with longer functions, raise `maxDuration` and `BUDGET_MS`
together to finish in fewer invocations.

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
- `022_documents_ingested_at.sql` — `documents.ingested_at` plus the
  `document_chunk_counts` view the admin page reads (PostgREST aggregates are
  disabled on this project, so the count is done in the database).

Both tables enable RLS with a read policy for `authenticated` and no write
policy: only the service-role key writes to them. `SUPABASE_SERVICE_ROLE_KEY` is
therefore required for search, not optional — an anon key would return an empty
result and a misconfiguration would look like a document with no matches.

These migrations depend on `sources` (001), and the agent also needs
`knowledge_items` (002) and `source_refresh_runs` (007) at runtime.
`021_widen_technique_check.sql` widens the `technique` check constraint from the
original four values to the 27 in `lib/types.ts`; without it every UHPLC item the
agent finds is rejected by the database. Apply the earlier migrations first; see
the deploy checklist in the README.

Seed the curated catalogue with `npm run seed:documents` (add `-- --dry-run` to
preview). Curated entries are marked `discovered_by: 'seed'`.

## Operator-supplied documents
Seeding stores metadata only, so a seeded document is listed but cannot be cited.
Chunks otherwise come from a crawl, which is impossible for Agilent and Restek.

A person who may read those public manuals downloads them and ingests the local
files:

    npm run ingest:pdfs -- ./manuals            # ingest a folder
    npm run ingest:pdfs -- ./manuals --dry-run  # report matches, write nothing

Each file is matched to an existing row by the `document_number` in its filename
(case- and separator-insensitive), then by the basename of the row's `url`.
Ingestion never creates rows. `/admin/documents` does the same through the
browser: it extracts the text locally and posts only the text, because the Hobby
plan caps a request body at about 4.5 MB and a manual rarely fits as a PDF.

The PDF is not stored — only the passages and the vendor URL. `ingested_at`
records when an operator last did this; the admin table shows each document as
`searchable` or `metadata only` so an un-ingested document is no longer silent.

## Limits
Per vendor per run: 40 pages, 25 documents, 1.5 s between requests, 20 s request
timeout, 25 MB per document. Scanned PDFs with no text layer are reported, not
stored.

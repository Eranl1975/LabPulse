# Lab Intelligence Troubleshooting Platform

Scientific troubleshooting assistant for LCMS, HPLC, GC, and GCMS.

## Stack
- Next.js
- TypeScript
- Supabase
- Vercel

## Run
1. Install dependencies
2. Add .env.local
3. Run dev server

## Main docs
- docs/project-spec.md
- docs/coding-rules.md
- docs/source-policy.md
- docs/output-schemas.md
- docs/vendor-documentation-agent.md

## Main modules
- agents/acquisition
- agents/ranking
- agents/presentation

## Vendor documentation refresh
Runs on the 1st of each month via Vercel Cron, finds new or changed vendor
manuals and troubleshooting guides, and makes them searchable so answers cite
real documents. Set `CRON_SECRET` (required) and `REFRESH_REPORT_EMAIL`
(optional). Apply migrations 019 and 020, then seed the curated catalogue with
`npx tsx scripts/seed-documents.ts`. Admin view: `/admin/documents`.
See docs/vendor-documentation-agent.md.

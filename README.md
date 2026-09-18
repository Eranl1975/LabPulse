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
real documents. Admin view: `/admin/documents`.
See docs/vendor-documentation-agent.md.

Deploy checklist:

1. Apply the migrations the agent depends on, in order. As of 2026-09-18 the
   hosted project had none of these tables, so applying 019 alone fails on the
   missing `sources` table:
   `001_sources` → `002_knowledge_items` → `007_source_refresh_runs` →
   `009_agent_runs` → `017_kb_fulltext` → `019_documents` → `020_document_chunks`.
2. Set `CRON_SECRET` in Vercel (required; the cron route returns 503 without it).
3. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set. Document search needs it, because
   the new tables have RLS with no anon read policy.
4. Optionally set `REFRESH_REPORT_EMAIL` for the monthly report.
5. Seed the curated catalogue: `npm run seed:documents`
   (preview first with `npm run seed:documents -- --dry-run`).
6. Verify: `curl -H "Authorization: Bearer $CRON_SECRET" \
   "$SITE/api/cron/monthly-refresh?dry_run=true"`.

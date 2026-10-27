# Instrument manuals and AI refinement (v8.2)

## Order of evidence for every answer

```
question ─▶ 1. LabPulse knowledge base (data/knowledge-items.json + Supabase knowledge_items)
          ─▶ 2. stored manual passages (Supabase document_chunks, ranked search, same vendor only)
          ─▶ 3. if confidence < 75 %: Claude Sonnet 5.5 refines 1 + 2   (lib/ai-fallback.ts)
          ─▶ QC gate, generic procedure, detector checks, clustering, manual citations
```

Manual passages are stored in Supabase, not fetched from the web at answer time, and are
searched before any AI call. They ground the AI call when it runs and are cited in the report.

## Why manuals showed "content not read"

On 2026-10-27 the `documents` table held 17 Agilent LC/MS entries with **0 passages each**:
titles and links only. Agilent and Restek return HTTP 403 to automated clients (re-measured
that day), so their PDFs cannot be downloaded by the server. LabPulse does not disguise its
client to get around that. The supported route is that an administrator downloads a manual in a
browser and uploads it: **Admin → Documents**. The PDF stays in the browser; only its text is
sent, and only passages are stored.

- **Catalogued manuals** (the 17): "Ingest PDFs you already hold"; files are matched by
  document number or by the file name in the vendor URL.
- **Any other manual** (any vendor, any of the 27 techniques): "Add a manual for any
  instrument" (`lib/manual-registration.ts`). The evidence tier follows the catalogue's rule:
  a vendor manual with a model is tier 1 (exact model), without a model tier 2, and application
  notes, technical notes and articles tier 5. A manual added without a public link gets a
  `labpulse-manual:` id, which is never shown as a link.

Each manual listed in a visual report now shows its real status (`lib/visual-query.ts`):
*quoted in this report*, *text held in LabPulse; no passage matched this problem*, or
*LabPulse holds only the title and link; an administrator can upload the PDF*.

## Ranked manual search (migration 030)

`public.search_document_chunks(p_terms, p_technique, p_vendor, p_limit)` matches **any** search
term and orders passages by `ts_rank_cd`. Before, every term was joined with AND, so a passage
had to contain every word of the user's description. On the live schema the 2026-10-20
description "Problem in openninh openlab CDS" found 0 passages under the old query and the
relevant one under the new one (validated in a rolled-back transaction). Vendor isolation is
unchanged. EXECUTE is granted to `service_role` only. If the function is missing,
`lib/document-search.ts` falls back to the old query.

## AI refinement

- **When:** knowledge-base confidence below `AI_REFINE_BELOW = 0.75` (was 0.4), or a technique
  in `AI_ONLY_TECHNIQUES`.
- **Model:** `claude-sonnet-5-5`, one call, no escalation to another model. Adaptive thinking
  at `effort: "medium"`, `max_tokens` 16000, 40 s per call with one retry, so the request stays
  inside Vercel Hobby's 60 s.
- **Request shape for Sonnet 5.5:** forced `tool_choice` returns a 400 on this model, so the
  tool is offered with `auto` and the system prompt requires it; a prose reply is retried once.
  `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) re-runs a policy decline on
  another Claude model, and the model that actually answered is recorded. A final refusal is an
  AI error with code `refusal`, never an answer.
- **Input:** the vendor-manual passages first, then the knowledge-base answer in full
  (hypotheses with their tests, checks, actions, safety warnings, sources), with the instruction
  to keep what fits, correct or drop what the user's data contradicts, and add only what is
  needed, labelled as AI inference.
- **Output:** the refined answer keeps the knowledge-base and manual sources next to the model.
  The report notice says what it was refined from, for example "Refined by Claude Sonnet 5.5 from
  the LabPulse knowledge base (50% confidence before refinement) and 3 vendor-manual passages."
  The recommendations stay labelled AI-GENERATED RECOMMENDATION, and the confidence caps are
  unchanged.
- **No credit / no key:** unchanged. The answer comes from the knowledge base, manuals and
  generic procedures, and the notice says why the AI did not run.

Other Claude calls are unchanged: image analysis (`lib/visual-analysis.ts`), web research and
AI cleaning procedures still use Sonnet 4.6, and the legacy V1 fallback still uses Sonnet 4.6 /
Opus 4.6.

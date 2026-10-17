# Visual Troubleshooting (v8.0)

A user photographs or films the instrument, error screen or leak, says what they see, and gets the same
ranked troubleshooting report as a typed query. On top of that report come the visual findings, web
sources and a safety-first block, and every source carries an evidence label.

## Data flow

```
/ask  ──"Visual Troubleshooting" button──▶ VisualTroubleshootingDialog (modal; prefilled from the wizard
                                            or /ask?visual=1&technique=…&vendor=…&model=…)
  Take Photo / Upload Photo / Record Short Video / Upload Short Video / drag-drop / Ctrl+V paste
        │  one path after selection: magic-byte type check → limits → preview
        ▼
  submit: canvas re-encode (strips EXIF/GPS; ≤2576 px kept, larger → 2000 px) under a byte budget,
          video → 6–8 key frames (first, last, evenly spaced), 320 px thumbnails
        │  [optional] signed upload URLs → originals go straight to the private Supabase bucket
        ▼
POST /api/troubleshooting/visual   (same-origin check, auth, hasAppAccess, rate limits, ≤4.4 MB body)
  NDJSON stream: {"stage":…} lines, then {"result":…}
        │
        ├─ 1. lib/visual-analysis.ts   one multimodal call, forced `visual_findings` tool, validated output
        │                              (deadline 26 s from request start)
        ├─ 2. lib/visual-query.ts      findings → the same RankingQueryV2 /api/query builds
        │      ├─ runTroubleshootingPipeline (KB ranking, document search, AI fallback, QC gate,
        │      │   generic procedure, detector addenda, hypothesis clustering) — unchanged
        │      └─ lib/web-research.ts  Anthropic web_search_20260209, ≤3 searches     ← in parallel
        │      both bounded by a 50 s deadline
        └─ 3. report: safety-first steps lead, visual_findings attached to RankedAnswerV2,
               internal manuals + cleaning procedure cited, everything sanitised
        ▼
AnswerDisplay → VisualFindingsPanel (images next to findings, badges) · PDF · email (inline CID thumbnails)
```

The modal was chosen over a fourth wizard step for three reasons. It is a self-contained alternative
entry with its own media state. It must not disturb the text wizard, which it prefills from. And on a
phone it becomes a full-screen sheet.

## Files

**Added**

| File | Purpose |
|---|---|
| `lib/visual-types.ts` | `VisualFindings` and related types, `EvidenceLabel` |
| `lib/visual-media.ts` | Shared limits, magic-byte detection, selection validation, frame timing, byte budget (browser + server) |
| `lib/visual-payload.ts` | Server-side request validation (limits again, type from bytes, storage-path ownership) |
| `lib/visual-analysis.ts` | The multimodal call (Sonnet 4.6, Opus 4.6 retry on an unparseable answer) and output validation |
| `lib/visual-query.ts` | Findings → pipeline query; safety-first steps; internal manual/cleaning references |
| `lib/web-research.ts` | Model-specific queries, source priority 1–7, server-side web search, only real URLs cited |
| `lib/visual-troubleshooting.ts` | Orchestrator with the time budget and degradation rules |
| `lib/evidence-labels.ts` | The four labels mapped onto the 7 tiers of `lib/evidence-hierarchy.ts` |
| `lib/visual-report.ts` | Thumbnail re-validation for PDF/email |
| `lib/same-origin.ts` | CSRF defence (Origin / Sec-Fetch-Site) for the new routes |
| `app/api/troubleshooting/visual/route.ts` | The streaming API route |
| `app/api/troubleshooting/visual/upload-url/route.ts` | Signed upload URLs for the private bucket |
| `components/visual/VisualTroubleshootingDialog.tsx` | The form |
| `components/visual/CameraCapture.tsx` | Desktop camera / recorder (`getUserMedia`, `MediaRecorder`, no audio) |
| `components/visual/media-processing.ts` | Canvas compression, frame extraction, thumbnails |
| `components/visual/VisualFindingsPanel.tsx` | Report section and `EvidenceBadge` |
| `supabase/migrations/029_visual_media_storage.sql` | Private `visual-media` bucket + owner-only RLS |
| `tests/visual/*`, `tests/security/headers.test.ts` | 98 tests |

**Changed**

- `lib/types.ts`: optional `visual_findings` on `RankedAnswerV2` (backwards-compatible).
- `components/QueryForm.tsx`: launch button, URL-param prefill, visual results shown in the existing results area.
- `components/AnswerDisplay.tsx`: the visual panel leads the report, plus evidence badges on every
  source. Also fixes the PDF button, which posted `ranked_answer` while the route reads `answer`.
- `lib/troubleshooting-pdf.tsx`, `lib/troubleshooting-email-html.ts`, `app/api/troubleshooting/email/route.ts`:
  safety first, the visual findings, thumbnails (inline CID attachments in email, ≤ 60 KB each) and the
  labels. The PDF route also accepts the old `ranked_answer` key.
- `next.config.ts`: `camera=(self)` and `media-src 'self' blob:`. Every other directive is unchanged;
  `connect-src https://*.supabase.co` already covers Storage uploads.
- `app/globals.css`: `vt-*` styles with dark-mode overrides.

## Limits

| | Client | Server |
|---|---|---|
| Photos | ≤ 4, ≤ 10 MB each before compression, JPEG/PNG/WebP/HEIC | ≤ 4, JPEG/PNG/WebP by magic bytes, ≤ 3 MB each after compression |
| Video | 1, ≤ 30 s, ≤ 50 MB, MP4/MOV/WebM | duration and size re-checked; only frames are received (≤ 8) |
| Request | 3.1 MB decoded budget split across photos/frames | ≤ 4.4 MB body, ≤ 3.41 MB decoded images |
| Rate | — | 10 visual runs/hour per user (all roles); trial users also share the daily 5-query quota |
| Time | — | vision by 26 s, pipeline + web by 50 s, then a partial report with a notice |

## Degradation

- **No AI key:** the vision and web statuses are `skipped_no_key`. The report still holds the user's
  text, the KB/document matches and the generic procedures.
- **Billing or auth error from the vision call:** the pipeline's AI call and the web search are skipped
  (they would fail the same way). The `ai_status` is `error` with the code, and the report still has content.
- **A timeout at any stage:** that stage's status says so, `partial: true` is set, and a notice is shown.
- **Web search error, or the tool is disabled for the organisation:** `web_status: error` is reported and the report continues.

## Evidence labels

| Label | When |
|---|---|
| OFFICIAL MANUFACTURER GUIDANCE | Tier 1–2 **and** a real manufacturer document number or URL. Manufacturer web pages at priority 1–3. A forum is never official, even on a manufacturer's own domain. |
| LABPULSE INTERNAL KNOWLEDGE | KB items, ingested documents without a URL, generic procedures, detector addenda, local cleaning procedures |
| TECHNICAL / SCIENTIFIC SOURCE | Tier 3–5 from outside LabPulse. Forum and other web pages also get this label, but always with the visible category "Professional forum (unverified)" or "Other web source (unverified)". |
| AI-GENERATED RECOMMENDATION | Tier 7, and every action in an AI-produced answer, even when the model names a manual |

## Deliberately left out

- Audio analysis (the UI says so). The microphone stays disabled by the Permissions-Policy.
- Server-side media processing: the server never receives the raw video, only frames.
- Automatic deletion of stored media. The bucket is private and owner-only, but nothing expires objects
  yet; add a scheduled cleanup if a retention period is required.
- A viewer for stored media in the report history (history stays in localStorage, as before). Stored
  paths are kept in `visual_findings.media[].storage_path`.
- Stripping metadata from stored **videos**. Photos are re-encoded; the UI warns that phone videos can
  carry location metadata.
- Web sources are shown in the visual section only. They are not merged into `sources_with_metadata`,
  so the existing text formatters and confidence caps are untouched.

## Costs

Each run makes up to three Anthropic calls on the existing key: vision (Sonnet 4.6), the pipeline's
existing AI fallback (only when it would run for a typed query), and web research (Sonnet 4.6 + at most
3 searches, billed at $10 per 1,000 searches plus tokens). No new vendor or key.

## Operator steps

1. Apply `supabase/migrations/029_visual_media_storage.sql`. Without it, "keep a private copy" fails
   gracefully and the analysis still runs.
2. Anthropic Console: make sure **web search is enabled** for the organisation, and that the account
   has **credits**. On 2026-10-17 the balance was exhausted again, so vision and web search return a
   billing error until it is topped up.
3. No new Vercel environment variables. The feature uses `ANTHROPIC_API_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which
   already exist.

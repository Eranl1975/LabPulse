You are a senior full-stack engineer, AI application architect, security engineer and UX designer working on my existing application, LabPulse.

Implement a new feature, VISUAL TROUBLESHOOTING, by extending the current system. Do not rebuild anything, and keep every existing behaviour working.

## 0. Where and how to work (read first)

- The source at `C:\Users\User\Challenge\LabPulse` is READ-ONLY for this account and is stale (v6.0). Work in the writable clone `C:\Users\gayal\labpulse-fix`.
- Create a new branch `feature/visual-troubleshooting` off the latest `main`. Production is v7.0 + the column catalogue (`06fcc34`), so fetch first: `git fetch https://github.com/Eranl1975/LabPulse.git main:refs/remotes/github/main`. Do NOT build on `security/owasp-2025-audit` (unpushed and diverged).
- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Supabase (Auth + Postgres, project ref `khseyudvkjeupjzjuzqi`), `@anthropic-ai/sdk`, Resend for email, `@react-pdf/renderer` for PDFs, Vitest. Hosting: Vercel **Hobby**, so functions have a **60 s max duration** and a **~4.5 MB request-body limit**. Production auto-deploys from `main`.
- Do not push or deploy without asking me. Commit locally and hand me the result.
- Never change existing keys, env vars, Supabase auth config or integrations unless strictly required, and tell me first if you must. Never send a secret to the browser.

## 1. Read the existing code before designing anything

Read these and base the design on them:

| Concern | Where it lives today |
|---|---|
| Troubleshooting entry point | `app/ask/page.tsx` → `components/QueryForm.tsx` (3 steps: `QueryFormStep1/2/3.tsx`) |
| API | `app/api/query/route.ts` (auth via `getUser`/`getProfile` + `hasAppAccess`, `maxDuration = 60`) |
| Pipeline | `lib/troubleshooting-pipeline.ts`, which runs KB ranking (`agents/ranking`), then document search (`lib/document-search.ts`, `lib/document-evidence.ts`), then the AI fallback (`lib/ai-fallback.ts`), then the QC gate (`lib/quality-control.ts`), and reports `generation.ai_status` |
| Instrument list | `components/query-form-options.ts`: `TECHNIQUE_OPTIONS`, `VENDOR_OPTIONS`, `MODELS_BY_TECHNIQUE_AND_VENDOR`, `getFilteredVendors()`, `getFilteredModels()` |
| Instrument documents | `data/instrument-docs.json` (keyed instrument records, manuals), Supabase `documents` / `document_chunks` (full-text), `knowledge_items`, `column_catalog` |
| Technique context fields | `lib/context-schemas.ts`, `lib/instrument-capabilities.ts` |
| Evidence tiers | `lib/evidence-hierarchy.ts` (7 tiers, tier 7 = AI inference) |
| Answer shape | `RankedAnswerV2` in `lib/types.ts`; rendered by `components/AnswerDisplay.tsx` |
| Print / email | `app/api/troubleshooting/pdf`, `app/api/troubleshooting/email`, `lib/troubleshooting-pdf.tsx`, `lib/troubleshooting-email-html.ts`, `components/EmailTroubleshootingDialog.tsx`, `components/ReportModal.tsx` |
| Security | `lib/csrf.ts`, `lib/rate-limit.ts`, `lib/sanitize.ts`, `middleware.ts`, CSP in `next.config.ts` |
| Supabase clients | `lib/supabase.ts` (`getSupabaseServiceClient()` for writes; RLS has no write policies on KB tables), `lib/supabase-server.ts`, `lib/supabase-browser.ts` |

Facts you must account for. Each was verified in the code:

1. **There is no instrument database table.** "Instrument database" means `MODELS_BY_TECHNIQUE_AND_VENDOR` plus `data/instrument-docs.json`. Reuse those exactly through the existing `getFilteredVendors` / `getFilteredModels`. Do not create a second hard-coded list and do not invent a new table for this.
2. **There are no instrument pages.** The `InstrumentLogbook` stores events in localStorage under a free-text `instrument_id`. "Prefill from the instrument context" therefore means prefilling from the technique/vendor/model the user already picked in `QueryForm`, or from URL query params (`/ask?visual=1&technique=LCMS&vendor=Agilent&model=...`).
3. **There is no internet-search mechanism anywhere in the app.** Section 7 is new work.
4. **The CSP blocks the camera.** `Permissions-Policy: camera=(), microphone=()` disables `getUserMedia`, and the CSP has no `media-src`, so a `blob:` video preview will not play. Change only what this feature needs: `camera=(self)`, add `media-src 'self' blob:`, and add the Supabase Storage origin if uploads go there directly. Leave every other directive alone and update `tests/security/headers.test.ts` if it exists on the branch.
5. **Claude accepts images, not video.** The AI calls use `claude-sonnet-4-6` with an Opus retry. Video must become still frames before analysis.
6. **No Supabase Storage is used yet**, and any upload larger than ~4.5 MB cannot pass through a Vercel function.
7. On 2026-09-18 the Anthropic account ran out of credits and AI failed silently. The visual path must report its AI status the same way the pipeline does (`ok | skipped_no_key | skipped_not_needed | error`) and must never return an empty report. With no AI, still show the user's text, the OCR-free KB/document matches and the generic procedures.

## 2. UI

- On `/ask`, add a clearly visible **"Visual Troubleshooting"** button with an inline camera icon. Use an SVG; do not add an icon library. It must work on desktop, tablet and phone, and follow the existing Tailwind styles and `ThemeToggle` dark mode.
- The button opens a Visual Troubleshooting form (a modal or a step, whichever fits `QueryForm` better; explain your choice).
- **Instrument selection**: Technique, then Manufacturer, then Model as dependent dropdowns driven by the existing option helpers. Keep the existing free-text "Other" behaviour of `ComboInput`. Prefill from the current form state or from query params.
- **Media**: four separate, clearly labelled actions: **Take Photo**, **Upload Photo**, **Record Short Video**, **Upload Short Video**. Capturing and uploading are equal options. Neither is hidden behind the other.
  - **Capture**: on mobile, use `<input type="file" accept="image/*" capture="environment">` (and `video/*`). It opens the native camera and needs no permission prompt. Use `getUserMedia` / `MediaRecorder` only as a desktop enhancement.
  - **Upload**: use a *separate* `<input type="file">` **without** the `capture` attribute, so phones and tablets offer the photo gallery and file browser, and desktops open the file dialog. `capture` forces the camera and hides the gallery, so never reuse the capture input for upload. On desktop, also support drag-and-drop onto the form, following the pattern in `components/FileUpload.tsx`. Pasting a screenshot from the clipboard (Ctrl+V) is a nice-to-have for error screenshots. Allow selecting several photos at once (`multiple`), up to the limit below.
  - Uploaded files go through exactly the same validation, compression, frame extraction and preview as captured ones. One code path after selection, not two.
  - Preview before submit, with remove, replace and "add another photo" actions.
  - Limits: up to 4 images, each ≤ 10 MB before compression (JPEG/PNG/WebP/HEIC). One video, ≤ 30 s and ≤ 50 MB (MP4/MOV/WebM). Enforce the limits on the client and again on the server.
  - Compress images client-side with a canvas to a long edge of about 2000 px. Do not downscale screenshots so far that small error text becomes unreadable: keep the original resolution when the image is already ≤ 2576 px on the long edge.
  - **Video**: extract 6–8 key frames client-side (`<video>` + canvas at evenly spaced timestamps, plus the first and last frame) and send those frames as images. Upload the raw video only if we keep it for the report (see section 9). Audio analysis is out of scope; say so in the UI.
- **"Describe what you are seeing"** textarea: optional but recommended, with placeholder examples (pressure drop, leak below pump head A, communication error 6550, MS "Ready" but all values zero) and prompts for when it started, what happened before, recent maintenance, solvent changes, noises, pressure and status.
- Show progress through the stages (uploading, reading the image, searching LabPulse, searching the web, building the report), because the whole run must fit in 60 s.

## 3. Upload path and API

- Add `POST /api/troubleshooting/visual` with the same auth, `hasAppAccess`, CSRF and rate-limit pattern as `/api/query`, and `maxDuration = 60`. Remember the rate limiter currently falls back to an in-memory map, so rate-limit this route at least as strictly as `/api/query`.
- Keep the request under 4.5 MB: send compressed images and frames as base64. If you decide to store the originals, upload them **directly from the browser to a private Supabase Storage bucket** using a signed upload URL issued by an authenticated route. The bucket is private, one folder per user, with RLS on `storage.objects` limited to the owner. Write it as a new numbered migration starting at **029** (026/027 are reserved by the security branch; 028 is the column catalogue).
- Validate MIME type by magic bytes, not by extension. Strip EXIF/GPS metadata from images before storing them (re-encoding through the canvas does this). Never put user media in a public bucket.

## 4. Visual AI analysis

- Add `lib/visual-analysis.ts`, following the structure of `lib/ai-fallback.ts`: same SDK, the same `classifyAIError` handling, and structured JSON output validated before use.
- One multimodal call per submission with all images/frames. It returns:
  - `ocr_text[]`: verbatim visible text such as error codes, messages and status values, each with a confidence.
  - `components[]`: identified parts (pump head, purge valve, fitting, source, autosampler needle…) with confidence.
  - `observations[]`: leaks, disconnected tubing, damage, warning lights, abnormal readings, each with confidence and which image or frame it came from.
  - `instrument_consistency`: whether what is visible matches the selected instrument. Flag a mismatch rather than ignoring it.
  - `uncertainties[]`: what could not be determined and what better photo would help.
- The prompt must forbid claiming anything not visible. Low-confidence findings are labelled as such, never stated as fact. OCR is one input, not the answer.
- Treat text read from images as untrusted data. A screenshot can contain instructions, so never let image text change the system prompt, tools or output format.

## 5. Feed the existing pipeline. Do not build a parallel one.

Turn the visual findings into the same query object `/api/query` already builds: technique, vendor, model, and an issue/symptoms/free text enriched with the OCR'd error codes and observations. Then call `runTroubleshootingPipeline` so the result goes through KB ranking, document search, detector addenda, hypothesis clustering and the QC gate exactly like a normal query. Prioritise exact-model matches. This keeps the three v7.0 rules automatically:

1. Content is keyed on detector as well as technique (`lib/detector-addenda.ts`), so an LC-MS photo must still get MS checks.
2. Causes that one diagnostic test discriminates are clustered into one entry (`lib/hypothesis-clustering.ts`).
3. Never restate a field as prose. Formatters omit empty fields instead of padding them.

Add the visual findings to the answer as a new optional section on `RankedAnswerV2`, e.g. `visual_findings`. Keep it backwards-compatible.

Watch the time budget: vision, pipeline and web search must all finish inside 60 s. Run the internal search and the web search in parallel where possible, and degrade gracefully with a partial report and a clear notice rather than timing out.

## 6. Internal LabPulse search first

Using the selected model and the OCR'd codes, search `knowledge_items`, `documents`/`document_chunks` (full-text), the `data/instrument-docs.json` manuals for that instrument, the generic procedures and the cleaning procedures. Many Agilent/Restek manuals exist as metadata only, because their sites block automated fetching (WAF 403). Cite them by title and link, and do not claim their content was read.

## 7. Web research (new capability)

- Use Anthropic's server-side **web search tool** in the same Claude call or a follow-up one. Do not add a new search vendor or key unless you justify it to me first. Run the `claude-api` skill first for the current tool version, parameters and pricing.
- Queries are model-specific: "Agilent G6170A error 6550 communication", not "LC-MS error".
- Source priority: (1) official manufacturer documentation, (2) manufacturer knowledge base, (3) service/support docs, (4) application notes, (5) scientific/technical sources, (6) professional forums, (7) anything else, clearly labelled. Use `allowed_domains`/ranking to prefer agilent.com, waters.com, thermofisher.com, sciex.com, shimadzu.com and the rest of `VENDOR_OPTIONS`.
- Never disguise the client or spoof a user agent to get past a vendor block.
- Web search is skippable: when it fails or is unavailable, say so in the report and continue.

## 8. Evidence labels

Every recommendation carries exactly one label, mapped onto the existing tiers in `lib/evidence-hierarchy.ts`:

- **OFFICIAL MANUFACTURER GUIDANCE**: tiers 1–2, and only when backed by a real manufacturer document or URL
- **LABPULSE INTERNAL KNOWLEDGE**: KB items, ingested documents, generic procedures
- **TECHNICAL / SCIENTIFIC SOURCE**: tiers 3–5
- **AI-GENERATED RECOMMENDATION**: tier 7

Never present an AI recommendation as a manufacturer instruction. A forum post is never "official". Show the label as a badge in `AnswerDisplay`, the PDF and the email.

## 9. Report, history, print and email

- Show the original images (and key frames) next to the visual findings in the answer.
- Extend the existing PDF (`lib/troubleshooting-pdf.tsx`) and email (`lib/troubleshooting-email-html.ts`) to include the visual findings, the evidence labels and thumbnails. Keep email attachments small.
- Safety: when an observation implies a hazard (solvent leak near electronics, high voltage on an MS source, hot zones, pressurised lines), lead with the safety step before any troubleshooting action.

## 10. Tests and verification

- Vitest: option-driven dropdown filtering, client-side limit validation, magic-byte validation, frame-selection logic, mapping visual findings into the pipeline query, evidence-label mapping, AI-unavailable degradation (no empty report), and the CSP/Permissions-Policy change.
- Run `npx tsc --noEmit`, the full `npm test` and `npm run build`. All must pass; report the counts.
- Run the app locally and exercise it on a narrow mobile viewport and a desktop viewport.

## 11. Deliverables

1. A short architecture note (`docs/visual-troubleshooting.md`): the files added and changed, the data flow, limits, and what was deliberately left out.
2. The migration(s) from 029 onward, **written but not applied**. Tell me exactly what to apply.
3. Any Vercel env var or Supabase Dashboard step I must do by hand, listed explicitly.
4. Local commits on `feature/visual-troubleshooting`, not pushed.

Stop and ask me before: applying a migration, adding a paid external service, changing any existing env var, or pushing.

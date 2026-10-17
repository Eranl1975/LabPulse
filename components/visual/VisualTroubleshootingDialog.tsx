'use client';

// Visual Troubleshooting form. A modal rather than a fourth wizard step: it is a
// self-contained alternative entry with its own media state, it must not
// disturb the text wizard's state (it prefills from it), and on a phone it
// becomes a full-screen sheet that is easy to use one-handed with the camera.

import { useCallback, useEffect, useRef, useState } from 'react';
import ComboInput from '../ComboInput';
import CameraCapture from './CameraCapture';
import { TECHNIQUE_OPTIONS, getFilteredVendors, getFilteredModels } from '../query-form-options';
import {
  MEDIA_LIMITS, validateSelection, perItemByteBudget,
  type DetectedImageType, type DetectedVideoType,
} from '@/lib/visual-media';
import {
  classifyFile, previewThumbnail, videoDuration, encodePhoto, extractKeyFrames,
  prefersNativeCapture, canUseBrowserCamera, canRecordInBrowser,
} from './media-processing';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { RankedAnswerV2 } from '@/lib/types';

export interface VisualInstrument {
  technique: string;
  vendor: string;
  model: string;
}

export interface VisualApiResult {
  ranked_answer: RankedAnswerV2;
  ai_assisted: boolean;
  ai_status?: 'ok' | 'skipped_no_key' | 'skipped_not_needed' | 'error';
  ai_reason?: string | null;
  // Same shape as /api/query's modes.
  modes: Record<'concise' | 'standard' | 'deep', { text: string }> & { manager: unknown };
}

interface Props {
  initial: VisualInstrument;
  onClose: () => void;
  onResult: (result: VisualApiResult, context: VisualInstrument & { description: string }) => void;
}

type ImageItem = { id: string; kind: 'image'; file: File; type: DetectedImageType; preview: string };
type VideoItem = { id: string; kind: 'video'; file: File; type: DetectedVideoType; preview: string; duration: number };
type MediaItem = ImageItem | VideoItem;

type Stage = 'uploading' | 'reading_image' | 'searching_labpulse' | 'searching_web' | 'building_report';

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'uploading', label: 'Preparing and uploading media' },
  { id: 'reading_image', label: 'Reading the image' },
  { id: 'searching_labpulse', label: 'Searching LabPulse' },
  { id: 'searching_web', label: 'Searching the web' },
  { id: 'building_report', label: 'Building the report' },
];

const DESCRIPTION_PLACEHOLDER = `Examples: "Pressure drops every few minutes", "Leak below pump head A", "Communication error 6550", "MS shows Ready but all values are zero".

Helpful: when it started, what happened just before, recent maintenance or solvent changes, any noises, the pressure reading and the status shown.`;

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// ── Icons (inline SVG; no icon library) ─────────────────────────────────────
export function CameraIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" /><path d="M22 8l-6 4 6 4V8z" />
    </svg>
  );
}
function FilmUploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /><path d="M12 15V9M9.5 11.5 12 9l2.5 2.5" />
    </svg>
  );
}

export default function VisualTroubleshootingDialog({ initial, onClose, onResult }: Props) {
  const [technique, setTechnique] = useState(initial.technique);
  const [vendor, setVendor] = useState(initial.vendor);
  const [model, setModel] = useState(initial.model);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [description, setDescription] = useState('');
  const [keepCopy, setKeepCopy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage | null>(null);
  const [camera, setCamera] = useState<'photo' | 'video' | null>(null);
  const [dragging, setDragging] = useState(false);

  const capturePhotoRef = useRef<HTMLInputElement>(null);
  const uploadPhotoRef = useRef<HTMLInputElement>(null);
  const captureVideoRef = useRef<HTMLInputElement>(null);
  const uploadVideoRef = useRef<HTMLInputElement>(null);
  const replaceIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<MediaItem[]>([]);
  itemsRef.current = items;

  const busy = stage !== null;
  const photos = items.filter((i): i is ImageItem => i.kind === 'image');
  const video = items.find((i): i is VideoItem => i.kind === 'video') ?? null;

  // Revoke video object URLs on unmount.
  useEffect(() => () => {
    itemsRef.current.forEach(i => { if (i.kind === 'video') URL.revokeObjectURL(i.preview); });
    abortRef.current?.abort();
  }, []);

  // Escape closes (unless a camera overlay or a run is active).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !camera) { e.stopPropagation(); handleClose(); }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, busy]);

  function handleClose() {
    abortRef.current?.abort();
    onClose();
  }

  /**
   * The single path every file takes after selection — camera, gallery, file
   * dialog, drag-and-drop or paste: content-type check, limits, preview.
   */
  const addFiles = useCallback(async (files: File[], hints: { duration?: number } = {}) => {
    const replaceId = replaceIdRef.current;
    replaceIdRef.current = null;
    const problems: string[] = [];
    let next = itemsRef.current.filter(i => i.id !== replaceId);

    for (const file of files) {
      const kind = await classifyFile(file);
      if (!kind) {
        problems.push(`${file.name || 'That file'} is not a supported photo (JPEG, PNG, WebP, HEIC) or video (MP4, MOV, WebM). The type is checked from the file content.`);
        continue;
      }
      if (kind.kind === 'image') {
        const check = validateSelection([...next.map(i => ({ kind: i.kind, size: i.file.size })), { kind: 'image', size: file.size }]);
        if (!check.ok) { problems.push(...check.errors); continue; }
        try {
          const preview = await previewThumbnail(file);
          next = [...next, { id: uid(), kind: 'image', file, type: kind.type, preview }];
        } catch (err) {
          problems.push(err instanceof Error ? err.message : 'That image could not be opened.');
        }
      } else {
        let duration = hints.duration;
        try {
          if (duration === undefined) duration = await videoDuration(file);
        } catch (err) {
          problems.push(err instanceof Error ? err.message : 'That video could not be opened.');
          continue;
        }
        const others = next.filter(i => i.kind !== 'video');
        const check = validateSelection([
          ...others.map(i => ({ kind: i.kind, size: i.file.size })),
          { kind: 'video', size: file.size, duration },
        ]);
        if (!check.ok) { problems.push(...check.errors); continue; }
        // One video: a new one replaces the previous.
        next.filter(i => i.kind === 'video').forEach(i => URL.revokeObjectURL(i.preview));
        next = [...others, { id: uid(), kind: 'video', file, type: kind.type, preview: URL.createObjectURL(file), duration: duration ?? 0 }];
      }
    }
    setItems(next);
    setErrors(problems);
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) void addFiles(files);
  }

  // Ctrl+V: paste an error screenshot.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (busy) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) { e.preventDefault(); void addFiles(files); }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles, busy]);

  function removeItem(id: string) {
    const item = items.find(i => i.id === id);
    if (item?.kind === 'video') URL.revokeObjectURL(item.preview);
    setItems(items.filter(i => i.id !== id));
  }

  function replaceItem(item: MediaItem) {
    replaceIdRef.current = item.id;
    (item.kind === 'image' ? uploadPhotoRef : uploadVideoRef).current?.click();
  }

  function takePhoto() {
    if (!prefersNativeCapture() && canUseBrowserCamera()) setCamera('photo');
    else capturePhotoRef.current?.click();
  }
  function recordVideo() {
    if (!prefersNativeCapture() && canRecordInBrowser()) setCamera('video');
    else captureVideoRef.current?.click();
  }

  async function uploadOriginals(encodedPhotos: Blob[]): Promise<{ photoPaths: (string | null)[]; videoPath: string | null; failed: boolean }> {
    const files = [
      ...encodedPhotos.map(b => ({ blob: b, content_type: b.type })),
      ...(video ? [{ blob: video.file as Blob, content_type: video.type }] : []),
    ];
    try {
      const res = await fetch('/api/troubleshooting/visual/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files.map(f => ({ content_type: f.content_type, size: f.blob.size })) }),
      });
      if (!res.ok) throw new Error('upload-url');
      const { bucket, uploads } = await res.json() as { bucket: string; uploads: Array<{ path: string; token: string }> };
      const storage = getSupabaseBrowserClient().storage.from(bucket);
      const paths = await Promise.all(files.map(async (f, i) => {
        const { error } = await storage.uploadToSignedUrl(uploads[i].path, uploads[i].token, f.blob, { contentType: f.content_type });
        return error ? null : uploads[i].path;
      }));
      return {
        photoPaths: paths.slice(0, encodedPhotos.length),
        videoPath: video ? paths[encodedPhotos.length] ?? null : null,
        failed: paths.some(p => p === null),
      };
    } catch {
      return { photoPaths: encodedPhotos.map(() => null), videoPath: null, failed: true };
    }
  }

  async function handleSubmit() {
    if (busy) return;
    if (!technique.trim() || !(TECHNIQUE_OPTIONS as readonly string[]).includes(technique.trim())) {
      setErrors(['Select a technique from the list.']);
      return;
    }
    if (items.length === 0) {
      setErrors(['Add at least one photo or a short video.']);
      return;
    }
    setErrors([]);
    setStage('uploading');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const budget = perItemByteBudget(photos.length, video ? MEDIA_LIMITS.maxFrames : 0);
      const encodedPhotos = [];
      for (const p of photos) encodedPhotos.push(await encodePhoto(p.file, p.type, budget.photo));
      const extracted = video ? await extractKeyFrames(video.file, budget.frame) : null;

      let storageFailed = false;
      let photoPaths: (string | null)[] = encodedPhotos.map(() => null);
      let videoPath: string | null = null;
      if (keepCopy) {
        const up = await uploadOriginals(encodedPhotos.map(e => e.blob));
        photoPaths = up.photoPaths;
        videoPath = up.videoPath;
        storageFailed = up.failed;
      }

      const images = [
        ...encodedPhotos.map((e, i) => ({ data: e.base64, kind: 'photo', label: `Photo ${i + 1}`, storage_path: photoPaths[i] })),
        ...(extracted?.frames ?? []).map((f, i) => ({ data: f.base64, kind: 'frame', label: `Video frame ${i + 1} (${f.time.toFixed(1)} s)`, frame_time: f.time })),
      ];
      const thumbnails = [...encodedPhotos.map(e => e.thumbnail), ...(extracted?.frames ?? []).map(f => f.thumbnail)];

      const res = await fetch('/api/troubleshooting/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          technique: technique.trim(),
          vendor: vendor.trim() || null,
          model: model.trim() || null,
          description: description.trim() || null,
          images,
          video: video && extracted ? { duration: extracted.duration, size: video.file.size, storage_path: videoPath } : null,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      // NDJSON: stage lines, then one result line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: VisualApiResult | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line) as { stage?: Stage; result?: VisualApiResult; error?: string };
          if (msg.stage) setStage(msg.stage);
          if (msg.error) throw new Error(msg.error);
          if (msg.result) result = msg.result;
        }
      }
      if (!result) throw new Error('The server ended the response without a report.');

      // Thumbnails are made here, not on the server: attach them so the report,
      // PDF and email show the images next to the findings.
      const vf = result.ranked_answer.visual_findings;
      if (vf) {
        vf.media = vf.media.map((m, i) => (i < thumbnails.length ? { ...m, thumbnail: thumbnails[i] } : m));
        if (storageFailed) vf.status.notices = [...vf.status.notices, 'Your media could not be saved to private storage; it was analysed but not kept.'];
      }

      onResult(result, { technique: technique.trim(), vendor: vendor.trim(), model: model.trim(), description: description.trim() });
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrors([err instanceof Error ? err.message : 'Visual troubleshooting failed.']);
      setStage(null);
    }
  }

  const stageIndex = stage ? STAGES.findIndex(s => s.id === stage) : -1;

  return (
    // A stray click outside must not throw away selected media.
    <div className="vt-overlay" onClick={busy || items.length > 0 ? undefined : handleClose} data-no-print>
      <div
        className="vt-dialog vt-drop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vt-title"
        data-dragging={dragging}
        onClick={e => e.stopPropagation()}
        onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <span className="vt-launch-icon" style={{ width: '2.25rem', height: '2.25rem' }}><CameraIcon size={18} /></span>
          <h2 id="vt-title" style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, flex: 1 }}>Visual Troubleshooting</h2>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* ── Instrument ────────────────────────────────────────────── */}
        <div className="vt-section">
          <p className="vt-section-title">Instrument</p>
          <div className="vt-grid3">
            <label>
              <span className="lab-label">Technique *</span>
              <ComboInput
                value={technique}
                onChange={v => { setTechnique(v); setVendor(''); setModel(''); }}
                options={TECHNIQUE_OPTIONS}
                placeholder="Select technique..."
                required
              />
            </label>
            <label>
              <span className="lab-label">Manufacturer</span>
              <ComboInput
                value={vendor}
                onChange={v => { setVendor(v); setModel(''); }}
                options={getFilteredVendors(technique)}
                placeholder={technique ? 'Select or type manufacturer...' : 'Select technique first...'}
              />
            </label>
            <label>
              <span className="lab-label">Model</span>
              <ComboInput
                value={model}
                onChange={setModel}
                options={getFilteredModels(technique, vendor)}
                placeholder={technique || vendor ? 'Select or type model...' : 'Select technique first...'}
              />
            </label>
          </div>
        </div>

        {/* ── Media ─────────────────────────────────────────────────── */}
        <div className="vt-section">
          <p className="vt-section-title">Photos and video</p>
          <div className="vt-actions">
            <button type="button" className="vt-action" onClick={takePhoto} disabled={busy || photos.length >= MEDIA_LIMITS.maxPhotos}>
              <CameraIcon /> Take Photo
            </button>
            <button type="button" className="vt-action" onClick={() => uploadPhotoRef.current?.click()} disabled={busy || photos.length >= MEDIA_LIMITS.maxPhotos}>
              <UploadIcon /> Upload Photo
            </button>
            <button type="button" className="vt-action" onClick={recordVideo} disabled={busy}>
              <VideoIcon /> Record Short Video
            </button>
            <button type="button" className="vt-action" onClick={() => uploadVideoRef.current?.click()} disabled={busy}>
              <FilmUploadIcon /> Upload Short Video
            </button>
          </div>

          {/* Capture inputs use `capture` (native camera). Upload inputs never do,
              so phones offer the gallery and file browser. */}
          <input ref={capturePhotoRef} type="file" accept="image/*" capture="environment" hidden onChange={onInputChange} />
          <input ref={uploadPhotoRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={onInputChange} />
          <input ref={captureVideoRef} type="file" accept="video/*" capture="environment" hidden onChange={onInputChange} />
          <input ref={uploadVideoRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" hidden onChange={onInputChange} />

          <p className="vt-hint">
            Up to {MEDIA_LIMITS.maxPhotos} photos (JPEG, PNG, WebP, HEIC; max 10 MB each) and one video
            (MP4, MOV, WebM; max {MEDIA_LIMITS.maxVideoSeconds} s, 50 MB). You can also drag files here or paste a screenshot (Ctrl+V).
            Videos are analysed as {MEDIA_LIMITS.minFrames}–{MEDIA_LIMITS.maxFrames} still frames; <strong>audio is not analysed</strong>.
          </p>

          {items.length > 0 && (
            <div className="vt-previews">
              {items.map((item, i) => (
                <div key={item.id} className="vt-preview">
                  {item.kind === 'image'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.preview} alt={`Photo ${i + 1} preview`} />
                    : <video src={item.preview} controls muted playsInline preload="metadata" aria-label="Video preview" />}
                  <div className="vt-preview-bar">
                    <button type="button" className="lab-btn lab-btn-secondary" onClick={() => replaceItem(item)} disabled={busy}>Replace</button>
                    <button type="button" className="lab-btn lab-btn-secondary" onClick={() => removeItem(item.id)} disabled={busy}>Remove</button>
                  </div>
                  {item.kind === 'video' && (
                    <div className="vt-hint" style={{ margin: '0 .5rem .5rem' }}>{item.duration.toFixed(1)} s</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {items.length > 0 && photos.length < MEDIA_LIMITS.maxPhotos && (
            <button type="button" className="lab-btn lab-btn-secondary lab-btn-sm" style={{ marginTop: '.625rem' }} onClick={() => uploadPhotoRef.current?.click()} disabled={busy}>
              + Add another photo
            </button>
          )}
        </div>

        {/* ── Description ───────────────────────────────────────────── */}
        <div className="vt-section">
          <p className="vt-section-title">Describe what you are seeing <span style={{ textTransform: 'none', fontWeight: 500 }}>(optional, recommended)</span></p>
          <textarea
            className="lab-input"
            rows={5}
            value={description}
            maxLength={4000}
            onChange={e => setDescription(e.target.value)}
            placeholder={DESCRIPTION_PLACEHOLDER}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.55 }}
            disabled={busy}
          />
          <label style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginTop: '.625rem', fontSize: '.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={keepCopy} onChange={e => setKeepCopy(e.target.checked)} disabled={busy} style={{ marginTop: '.2rem' }} />
            <span>
              Keep a private copy of my media with this report.
              <span className="vt-hint" style={{ display: 'block', marginTop: '.125rem' }}>
                Stored in your own private folder; nobody else can open it. Photos are re-encoded first, which removes location (EXIF/GPS) data.
                The video is stored as recorded, and phone videos can contain location metadata.
              </span>
            </span>
          </label>
        </div>

        {errors.length > 0 && (
          <div className="vt-error" role="alert">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {busy && (
          <ol className="vt-stages" aria-live="polite">
            {STAGES.map((s, i) => (
              <li key={s.id} className="vt-stage" data-state={i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'}>
                <span className="vt-stage-dot" /> {s.label}
              </li>
            ))}
          </ol>
        )}

        <div style={{ display: 'flex', gap: '.625rem', justifyContent: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="lab-btn lab-btn-secondary" onClick={handleClose}>
            {busy ? 'Cancel' : 'Close'}
          </button>
          <button type="button" className="lab-btn lab-btn-primary" onClick={handleSubmit} disabled={busy || items.length === 0}>
            {busy ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
      </div>

      {camera && (
        <CameraCapture
          mode={camera}
          onCancel={() => setCamera(null)}
          onCapture={(file, durationHint) => {
            setCamera(null);
            void addFiles([file], { duration: durationHint });
          }}
          onUnavailable={reason => {
            setCamera(null);
            setErrors([`${reason} Choosing a file instead.`]);
            (camera === 'photo' ? capturePhotoRef : captureVideoRef).current?.click();
          }}
        />
      )}
    </div>
  );
}

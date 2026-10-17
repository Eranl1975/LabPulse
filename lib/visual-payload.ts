// Server-side validation of a Visual Troubleshooting request. The browser
// enforces the same limits (lib/visual-media.ts); this is the authoritative
// check. Image types come from magic bytes, never from what the client claims.

import type { Technique } from './types';
import type { MediaKind, VisualMediaRef } from './visual-types';
import type { VisualImageInput } from './visual-analysis';
import {
  MEDIA_LIMITS, ANALYSABLE_IMAGE_TYPES, detectImageType, base64DecodedLength,
} from './visual-media';

export const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC']);

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_DESCRIPTION = 4000;
const MAX_FIELD = 200;
/** Object paths are `<user id>/<uuid>.<ext>`; anything else is rejected. */
const STORAGE_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/;

export interface VisualPayload {
  technique: Technique;
  vendor: string | null;
  model: string | null;
  description: string | null;
  images: VisualImageInput[];
  media: VisualMediaRef[];
  video: { duration: number; size: number } | null;
}

export type PayloadResult = { ok: true; payload: VisualPayload } | { ok: false; error: string };

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  // Drop control characters except newline and tab.
  const cleaned = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

export function parseVisualPayload(body: unknown, userId: string): PayloadResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const technique = b.technique as Technique;
  if (!technique || !VALID_TECHNIQUES.has(technique)) {
    return { ok: false, error: 'Select a technique from the list.' };
  }

  if (!Array.isArray(b.images) || b.images.length === 0) {
    return { ok: false, error: 'Add at least one photo or video.' };
  }

  const images: VisualImageInput[] = [];
  const media: VisualMediaRef[] = [];
  let photos = 0;
  let frames = 0;
  let total = 0;

  for (const raw of b.images) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid image entry.' };
    const img = raw as Record<string, unknown>;
    const kind: MediaKind = img.kind === 'frame' ? 'frame' : 'photo';
    if (kind === 'photo') photos++; else frames++;

    const data = typeof img.data === 'string' ? img.data : '';
    if (!data || !BASE64_RE.test(data)) return { ok: false, error: 'An image is not valid base64.' };

    const size = base64DecodedLength(data);
    if (size > MEDIA_LIMITS.maxEncodedImageBytes) {
      return { ok: false, error: 'An image is too large after compression.' };
    }
    total += size;

    const head = new Uint8Array(Buffer.from(data.slice(0, 32), 'base64'));
    const detected = detectImageType(head);
    if (!detected || !ANALYSABLE_IMAGE_TYPES.has(detected)) {
      return { ok: false, error: 'Images must be JPEG, PNG or WebP (checked by file content).' };
    }

    const frameTime = typeof img.frame_time === 'number' && Number.isFinite(img.frame_time) && img.frame_time >= 0
      ? Math.min(img.frame_time, MEDIA_LIMITS.maxVideoSeconds + 1)
      : null;
    const label = text(img.label, 120) ?? (kind === 'frame' ? 'Video frame' : `Photo ${photos}`);
    const storagePath = typeof img.storage_path === 'string' && STORAGE_PATH_RE.test(img.storage_path)
      && img.storage_path.startsWith(`${userId}/`)
      ? img.storage_path
      : null;

    images.push({ data, media_type: detected as VisualImageInput['media_type'], kind, label, frame_time: frameTime });
    media.push({ kind, label, frame_time: frameTime, storage_path: storagePath });
  }

  if (photos > MEDIA_LIMITS.maxPhotos) return { ok: false, error: `Up to ${MEDIA_LIMITS.maxPhotos} photos per submission.` };
  if (frames > MEDIA_LIMITS.maxFrames) return { ok: false, error: `Up to ${MEDIA_LIMITS.maxFrames} video frames per submission.` };
  // 10% headroom over the client budget for encoder variance.
  if (total > MEDIA_LIMITS.requestBinaryBudget * 1.1) return { ok: false, error: 'The images are too large in total.' };

  let video: VisualPayload['video'] = null;
  if (b.video && typeof b.video === 'object') {
    const v = b.video as Record<string, unknown>;
    const duration = typeof v.duration === 'number' ? v.duration : NaN;
    const vsize = typeof v.size === 'number' ? v.size : NaN;
    if (!Number.isFinite(duration) || duration > MEDIA_LIMITS.maxVideoSeconds + 0.5) {
      return { ok: false, error: `Videos must be ${MEDIA_LIMITS.maxVideoSeconds} s or shorter.` };
    }
    if (!Number.isFinite(vsize) || vsize > MEDIA_LIMITS.maxVideoBytes) {
      return { ok: false, error: 'The video is larger than 50 MB.' };
    }
    if (frames === 0) return { ok: false, error: 'Video frames are missing.' };
    video = { duration, size: vsize };
    const videoPath = typeof v.storage_path === 'string' && STORAGE_PATH_RE.test(v.storage_path)
      && v.storage_path.startsWith(`${userId}/`) ? v.storage_path : null;
    if (videoPath) media.push({ kind: 'frame', label: 'Original video (stored)', frame_time: null, storage_path: videoPath });
  }

  return {
    ok: true,
    payload: {
      technique,
      vendor: text(b.vendor, MAX_FIELD),
      model: text(b.model, MAX_FIELD),
      description: text(b.description, MAX_DESCRIPTION),
      images,
      media,
      video,
    },
  };
}

// Media rules shared by the browser and the server: limits, magic-byte type
// detection, selection validation and key-frame timing. Pure functions only —
// no DOM, no Node APIs — so both sides enforce exactly the same limits.

export const MEDIA_LIMITS = {
  maxPhotos: 4,
  maxPhotoBytes: 10 * 1024 * 1024,      // before compression
  maxVideos: 1,
  maxVideoBytes: 50 * 1024 * 1024,
  maxVideoSeconds: 30,
  minFrames: 6,
  maxFrames: 8,
  /** Long edge photos are compressed to, unless already ≤ keepOriginalEdge. */
  targetLongEdge: 2000,
  /** Screenshots at or below this long edge keep their resolution so small error text stays readable. */
  keepOriginalEdge: 2576,
  frameLongEdge: 1280,
  thumbnailLongEdge: 320,
  maxThumbnailBytes: 60 * 1024,
  /**
   * Total decoded bytes of everything sent to /api/troubleshooting/visual.
   * Base64 inflates by 4/3, so 3.1 MB binary stays under Vercel's ~4.5 MB body limit
   * with room for the JSON envelope.
   */
  requestBinaryBudget: 3_100_000,
  /** Per-image ceiling on the server (Claude accepts up to 5 MB per image). */
  maxEncodedImageBytes: 3_000_000,
} as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type DetectedImageType = typeof ACCEPTED_IMAGE_TYPES[number];
export type DetectedVideoType = typeof ACCEPTED_VIDEO_TYPES[number];

/** Types the vision model accepts directly (HEIC is decoded and re-encoded in the browser first). */
export const ANALYSABLE_IMAGE_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let s = '';
  for (let i = start; i < start + length && i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** Detect an image type from its first bytes. Never trusts the file name or the declared MIME type. */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a) return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return null;
}

/** Detect a video container from its first bytes. */
export function detectVideoType(bytes: Uint8Array): DetectedVideoType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'video/webm';
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (brand === 'qt  ') return 'video/quicktime';
    // HEIF stills share the ftyp box; they are images, not video.
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return null;
    return 'video/mp4';
  }
  return null;
}

export interface SelectionItem {
  kind: 'image' | 'video';
  size: number;
  /** Seconds; only known for video after metadata loads. */
  duration?: number | null;
}

export interface SelectionCheck {
  ok: boolean;
  errors: string[];
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a whole selection (already-chosen items plus new ones) against the
 * limits. Used for captured and uploaded files alike — there is one path after selection.
 */
export function validateSelection(items: SelectionItem[]): SelectionCheck {
  const errors: string[] = [];
  const images = items.filter(i => i.kind === 'image');
  const videos = items.filter(i => i.kind === 'video');

  if (images.length > MEDIA_LIMITS.maxPhotos) {
    errors.push(`Up to ${MEDIA_LIMITS.maxPhotos} photos per submission (you selected ${images.length}).`);
  }
  for (const img of images) {
    if (img.size > MEDIA_LIMITS.maxPhotoBytes) {
      errors.push(`A photo is ${mb(img.size)}; the limit is ${mb(MEDIA_LIMITS.maxPhotoBytes)} per photo.`);
    }
  }
  if (videos.length > MEDIA_LIMITS.maxVideos) {
    errors.push('Only one video per submission.');
  }
  for (const v of videos) {
    if (v.size > MEDIA_LIMITS.maxVideoBytes) {
      errors.push(`The video is ${mb(v.size)}; the limit is ${mb(MEDIA_LIMITS.maxVideoBytes)}.`);
    }
    if (typeof v.duration === 'number' && v.duration > MEDIA_LIMITS.maxVideoSeconds + 0.5) {
      errors.push(`The video is ${Math.round(v.duration)} s long; the limit is ${MEDIA_LIMITS.maxVideoSeconds} s.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Timestamps (seconds) of the key frames to extract: the first frame, the last
 * frame and evenly spaced frames between them. Very short clips get fewer frames
 * rather than duplicates.
 */
export function selectFrameTimes(duration: number, count: number = MEDIA_LIMITS.maxFrames): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  const n = Math.max(2, Math.min(MEDIA_LIMITS.maxFrames, Math.floor(count)));
  // Seeking exactly to `duration` often yields a black frame; stay just inside it.
  const last = Math.max(0, duration - Math.min(0.1, duration / 10));
  // At least ~0.25 s between frames so a 1 s clip does not produce 8 near-identical frames.
  const usable = Math.max(2, Math.min(n, Math.floor(last / 0.25) + 1));
  const times: number[] = [];
  for (let i = 0; i < usable; i++) {
    times.push(parseFloat(((last * i) / (usable - 1)).toFixed(3)));
  }
  return [...new Set(times)];
}

/** Long edge an image should be encoded at, given its natural size. */
export function targetEdgeFor(width: number, height: number, kind: 'photo' | 'frame' | 'thumbnail'): number {
  const longEdge = Math.max(width, height);
  if (kind === 'thumbnail') return Math.min(longEdge, MEDIA_LIMITS.thumbnailLongEdge);
  if (kind === 'frame') return Math.min(longEdge, MEDIA_LIMITS.frameLongEdge);
  if (longEdge <= MEDIA_LIMITS.keepOriginalEdge) return longEdge;
  return MEDIA_LIMITS.targetLongEdge;
}

/**
 * Split the request byte budget between photos and frames. A frame gets a
 * quarter of a photo's share: frames are smaller and there are more of them.
 */
export function perItemByteBudget(photoCount: number, frameCount: number): { photo: number; frame: number } {
  const weight = photoCount + frameCount * 0.25;
  if (weight <= 0) return { photo: MEDIA_LIMITS.maxEncodedImageBytes, frame: MEDIA_LIMITS.maxEncodedImageBytes };
  const unit = MEDIA_LIMITS.requestBinaryBudget / weight;
  return {
    photo: Math.floor(Math.min(unit, MEDIA_LIMITS.maxEncodedImageBytes)),
    frame: Math.floor(Math.min(unit * 0.25, MEDIA_LIMITS.maxEncodedImageBytes)),
  };
}

/** Decoded size of a base64 string without decoding it. */
export function base64DecodedLength(b64: string): number {
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

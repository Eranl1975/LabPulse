// Shared helpers for putting visual findings into the PDF and the email.
// Thumbnails arrive inside the answer from the browser, so they are re-checked
// here before they are embedded anywhere.

import type { RankedAnswerV2 } from './types';
import { MEDIA_LIMITS, detectImageType } from './visual-media';

const MAX_THUMBNAILS = 12;
const DATA_URL_RE = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

export interface SafeThumbnail {
  label: string;
  dataUrl: string;
  base64: string;
}

/** Only small JPEG data URLs that really are JPEGs (by magic bytes) are kept. */
export function safeThumbnails(answer: RankedAnswerV2): SafeThumbnail[] {
  const media = answer.visual_findings?.media ?? [];
  const out: SafeThumbnail[] = [];
  for (const m of media) {
    if (out.length >= MAX_THUMBNAILS) break;
    const match = typeof m.thumbnail === 'string' ? m.thumbnail.match(DATA_URL_RE) : null;
    if (!match) continue;
    const b64 = match[1];
    if ((b64.length * 3) / 4 > MEDIA_LIMITS.maxThumbnailBytes * 1.2) continue;
    const head = new Uint8Array(Buffer.from(b64.slice(0, 32), 'base64'));
    if (detectImageType(head) !== 'image/jpeg') continue;
    out.push({ label: String(m.label ?? '').slice(0, 80), dataUrl: m.thumbnail as string, base64: b64 });
  }
  return out;
}

export function pctLabel(n: number): string {
  return `${Math.round(n * 100)}%`;
}

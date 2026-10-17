import { describe, it, expect } from 'vitest';
import {
  MEDIA_LIMITS, detectImageType, detectVideoType, validateSelection, selectFrameTimes,
  targetEdgeFor, perItemByteBudget, base64DecodedLength,
} from '@/lib/visual-media';

function bytes(...parts: Array<number[] | string>): Uint8Array {
  const out: number[] = [];
  for (const p of parts) {
    if (typeof p === 'string') for (const ch of p) out.push(ch.charCodeAt(0));
    else out.push(...p);
  }
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
}

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = bytes('RIFF', [0, 0, 0, 0], 'WEBP');
const HEIC = bytes([0, 0, 0, 0x18], 'ftyp', 'heic');
const MP4 = bytes([0, 0, 0, 0x20], 'ftyp', 'isom');
const MOV = bytes([0, 0, 0, 0x14], 'ftyp', 'qt  ');
const WEBM = bytes([0x1a, 0x45, 0xdf, 0xa3]);
const GIF = bytes('GIF89a');
const EXE = bytes('MZ');

describe('magic-byte validation', () => {
  it('recognises each accepted image type from its content', () => {
    expect(detectImageType(JPEG)).toBe('image/jpeg');
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(WEBP)).toBe('image/webp');
    expect(detectImageType(HEIC)).toBe('image/heic');
  });

  it('recognises each accepted video container', () => {
    expect(detectVideoType(MP4)).toBe('video/mp4');
    expect(detectVideoType(MOV)).toBe('video/quicktime');
    expect(detectVideoType(WEBM)).toBe('video/webm');
  });

  it('rejects unsupported or disguised content whatever the file is called', () => {
    for (const b of [GIF, EXE, MP4, WEBM]) expect(detectImageType(b)).toBeNull();
    for (const b of [GIF, EXE, JPEG, PNG]) expect(detectVideoType(b)).toBeNull();
  });

  it('does not treat a HEIC still as a video even though both use an ftyp box', () => {
    expect(detectVideoType(HEIC)).toBeNull();
  });

  it('rejects truncated input', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe('client-side limit validation', () => {
  const MB = 1024 * 1024;

  it('accepts up to four photos and one short video', () => {
    const r = validateSelection([
      ...Array.from({ length: 4 }, () => ({ kind: 'image' as const, size: 3 * MB })),
      { kind: 'video', size: 20 * MB, duration: 29 },
    ]);
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('rejects a fifth photo', () => {
    const r = validateSelection(Array.from({ length: 5 }, () => ({ kind: 'image' as const, size: MB })));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Up to 4 photos/);
  });

  it('rejects a photo over 10 MB before compression', () => {
    expect(validateSelection([{ kind: 'image', size: 10 * MB + 1 }]).ok).toBe(false);
    expect(validateSelection([{ kind: 'image', size: 10 * MB }]).ok).toBe(true);
  });

  it('rejects a video over 30 s or 50 MB, and a second video', () => {
    expect(validateSelection([{ kind: 'video', size: MB, duration: 31 }]).ok).toBe(false);
    expect(validateSelection([{ kind: 'video', size: 51 * MB, duration: 10 }]).ok).toBe(false);
    expect(validateSelection([{ kind: 'video', size: MB, duration: 5 }, { kind: 'video', size: MB, duration: 5 }]).ok).toBe(false);
  });

  it('tolerates the rounding of a 30 s recording', () => {
    expect(validateSelection([{ kind: 'video', size: MB, duration: 30.2 }]).ok).toBe(true);
  });
});

describe('frame-selection logic', () => {
  it('takes the first frame, the last frame and evenly spaced frames between them', () => {
    const t = selectFrameTimes(30, 8);
    expect(t).toHaveLength(8);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBeCloseTo(29.9, 1);
    const gaps = t.slice(1).map((v, i) => v - t[i]);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 2);
  });

  it('never seeks past the end of the clip', () => {
    for (const d of [0.5, 3, 12.34, 30]) {
      for (const time of selectFrameTimes(d)) expect(time).toBeLessThan(d);
    }
  });

  it('stays within 6–8 frames for normal clips', () => {
    expect(selectFrameTimes(10, 6)).toHaveLength(6);
    expect(selectFrameTimes(10, 12)).toHaveLength(MEDIA_LIMITS.maxFrames);
  });

  it('gives a very short clip fewer frames instead of duplicates', () => {
    const t = selectFrameTimes(0.6, 8);
    expect(new Set(t).size).toBe(t.length);
    expect(t.length).toBeLessThan(8);
    expect(t.length).toBeGreaterThanOrEqual(2);
  });

  it('handles an unknown duration safely', () => {
    expect(selectFrameTimes(NaN)).toEqual([0]);
    expect(selectFrameTimes(Infinity)).toEqual([0]);
  });
});

describe('compression targets', () => {
  it('keeps a screenshot at its own resolution up to 2576 px so small text stays readable', () => {
    expect(targetEdgeFor(2560, 1440, 'photo')).toBe(2560);
    expect(targetEdgeFor(1920, 1080, 'photo')).toBe(1920);
  });

  it('compresses larger photos to a 2000 px long edge', () => {
    expect(targetEdgeFor(4032, 3024, 'photo')).toBe(2000);
  });

  it('caps frames and thumbnails', () => {
    expect(targetEdgeFor(3840, 2160, 'frame')).toBe(MEDIA_LIMITS.frameLongEdge);
    expect(targetEdgeFor(3840, 2160, 'thumbnail')).toBe(MEDIA_LIMITS.thumbnailLongEdge);
  });

  it('splits the request budget so four photos and eight frames fit under the Vercel body limit', () => {
    const b = perItemByteBudget(4, 8);
    const total = 4 * b.photo + 8 * b.frame;
    expect(total).toBeLessThanOrEqual(MEDIA_LIMITS.requestBinaryBudget);
    // Base64 inflation plus envelope still below ~4.5 MB.
    expect(Math.ceil(total * 4 / 3)).toBeLessThan(4.5 * 1000 * 1000);
    expect(b.frame).toBeLessThan(b.photo);
  });

  it('computes decoded base64 length without decoding', () => {
    const raw = Buffer.from('hello world!!');
    expect(base64DecodedLength(raw.toString('base64'))).toBe(raw.length);
    expect(base64DecodedLength('')).toBe(0);
  });
});

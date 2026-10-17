import { describe, it, expect } from 'vitest';
import { parseVisualPayload } from '@/lib/visual-payload';

const USER = '11111111-2222-3333-4444-555555555555';
const OTHER = '99999999-2222-3333-4444-555555555555';

function b64(head: number[], size = 64): string {
  const buf = Buffer.alloc(size);
  Buffer.from(head).copy(buf);
  return buf.toString('base64');
}
const JPEG = b64([0xff, 0xd8, 0xff, 0xe0]);
const PNG = b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF = b64([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

function body(over: Record<string, unknown> = {}) {
  return { technique: 'LCMS', vendor: 'Agilent', model: 'InfinityLab Pro iQ Plus (G6170A)', description: 'error 6550', images: [{ data: JPEG, kind: 'photo' }], ...over };
}

describe('server-side payload validation', () => {
  it('accepts a valid submission and takes the image type from the bytes', () => {
    const r = parseVisualPayload(body({ images: [{ data: PNG, kind: 'photo', media_type: 'image/jpeg' }] }), USER);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.images[0].media_type).toBe('image/png');
  });

  it('rejects content that is not JPEG/PNG/WebP, whatever it claims to be', () => {
    const r = parseVisualPayload(body({ images: [{ data: GIF, kind: 'photo', media_type: 'image/jpeg' }] }), USER);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/JPEG, PNG or WebP/) });
  });

  it('rejects an unknown technique, no images, or invalid base64', () => {
    expect(parseVisualPayload(body({ technique: 'Spectro' }), USER).ok).toBe(false);
    expect(parseVisualPayload(body({ images: [] }), USER).ok).toBe(false);
    expect(parseVisualPayload(body({ images: [{ data: 'not base64!!', kind: 'photo' }] }), USER).ok).toBe(false);
  });

  it('enforces the photo and frame counts again on the server', () => {
    const photos = Array.from({ length: 5 }, () => ({ data: JPEG, kind: 'photo' }));
    expect(parseVisualPayload(body({ images: photos }), USER).ok).toBe(false);
    const frames = Array.from({ length: 9 }, (_, i) => ({ data: JPEG, kind: 'frame', frame_time: i }));
    expect(parseVisualPayload(body({ images: frames, video: { duration: 9, size: 1000 } }), USER).ok).toBe(false);
  });

  it('enforces the video limits again on the server', () => {
    const frames = [{ data: JPEG, kind: 'frame', frame_time: 0 }];
    expect(parseVisualPayload(body({ images: frames, video: { duration: 45, size: 1000 } }), USER).ok).toBe(false);
    expect(parseVisualPayload(body({ images: frames, video: { duration: 10, size: 60 * 1024 * 1024 } }), USER).ok).toBe(false);
    expect(parseVisualPayload(body({ images: frames, video: { duration: 10, size: 1000 } }), USER).ok).toBe(true);
  });

  it('rejects an oversized image', () => {
    const big = b64([0xff, 0xd8, 0xff, 0xe0], 3_100_000);
    expect(parseVisualPayload(body({ images: [{ data: big, kind: 'photo' }] }), USER).ok).toBe(false);
  });

  it('keeps a storage path only when it is inside the caller’s own folder', () => {
    const mine = `${USER}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;
    const theirs = `${OTHER}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;
    const r1 = parseVisualPayload(body({ images: [{ data: JPEG, kind: 'photo', storage_path: mine }] }), USER);
    const r2 = parseVisualPayload(body({ images: [{ data: JPEG, kind: 'photo', storage_path: theirs }] }), USER);
    const r3 = parseVisualPayload(body({ images: [{ data: JPEG, kind: 'photo', storage_path: `${USER}/../x.jpg` }] }), USER);
    expect(r1.ok && r1.payload.media[0].storage_path).toBe(mine);
    expect(r2.ok && r2.payload.media[0].storage_path).toBeNull();
    expect(r3.ok && r3.payload.media[0].storage_path).toBeNull();
  });

  it('strips control characters and bounds the description', () => {
    const r = parseVisualPayload(body({ description: `leak\u0000 below pump${'x'.repeat(5000)}` }), USER);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.description).not.toContain('\u0000');
      expect(r.payload.description!.length).toBeLessThanOrEqual(4000);
    }
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  TECHNIQUE_OPTIONS, MODELS_BY_TECHNIQUE_AND_VENDOR, getFilteredVendors, getFilteredModels,
} from '@/components/query-form-options';
import { isSameOriginRequest } from '@/lib/same-origin';
import { safeThumbnails } from '@/lib/visual-report';
import type { RankedAnswerV2 } from '@/lib/types';

describe('option-driven dropdown filtering (Technique → Manufacturer → Model)', () => {
  it('limits manufacturers to those with models for the technique', () => {
    const vendors = getFilteredVendors('LCMS');
    expect(vendors).toEqual(Object.keys(MODELS_BY_TECHNIQUE_AND_VENDOR.LCMS));
    expect(vendors).toContain('Agilent');
  });

  it('limits models to the technique and manufacturer', () => {
    const models = getFilteredModels('LCMS', 'Agilent');
    expect(models).toEqual(MODELS_BY_TECHNIQUE_AND_VENDOR.LCMS.Agilent);
    expect(models.some(m => m.includes('G6170A'))).toBe(true);
  });

  it('returns no models for a free-text "Other" manufacturer, so typing stays possible', () => {
    expect(getFilteredModels('LCMS', 'My Own Vendor')).toEqual([]);
  });

  it('every technique has at least one manufacturer', () => {
    for (const t of TECHNIQUE_OPTIONS) expect(getFilteredVendors(t).length, t).toBeGreaterThan(0);
  });

  it('the visual form reuses the existing helpers instead of a second hard-coded list', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components/visual/VisualTroubleshootingDialog.tsx'), 'utf-8');
    expect(src).toMatch(/import \{[^}]*getFilteredVendors[^}]*getFilteredModels[^}]*\} from '\.\.\/query-form-options'/);
    expect(src).not.toMatch(/'Thermo Fisher'|'Shimadzu'/);
  });

  it('upload inputs never carry the capture attribute', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components/visual/VisualTroubleshootingDialog.tsx'), 'utf-8');
    const inputs = src.match(/<input ref=\{(\w+)\}[^>]*>/g) ?? [];
    const upload = inputs.filter(i => /upload(Photo|Video)Ref/.test(i));
    const capture = inputs.filter(i => /capture(Photo|Video)Ref/.test(i));
    expect(upload).toHaveLength(2);
    expect(capture).toHaveLength(2);
    for (const i of upload) expect(i).not.toContain('capture=');
    for (const i of capture) expect(i).toContain('capture="environment"');
    expect(upload.find(i => i.includes('uploadPhotoRef'))).toContain('multiple');
  });
});

describe('same-origin (CSRF) check', () => {
  const url = 'https://labpulse-liart.vercel.app/api/troubleshooting/visual';
  const h = (o: Record<string, string>) => new Headers(o);

  it('accepts a same-origin request', () => {
    expect(isSameOriginRequest(h({ origin: 'https://labpulse-liart.vercel.app', 'sec-fetch-site': 'same-origin' }), url)).toBe(true);
  });

  it('rejects a cross-site request', () => {
    expect(isSameOriginRequest(h({ origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }), url)).toBe(false);
    expect(isSameOriginRequest(h({ origin: 'https://evil.example' }), url)).toBe(false);
  });

  it('rejects a request with neither header', () => {
    expect(isSameOriginRequest(h({}), url)).toBe(false);
  });
});

describe('thumbnails embedded in the PDF and email', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]).toString('base64');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]).toString('base64');
  const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200_000)]).toString('base64');
  const answer = (thumbs: string[]) => ({
    visual_findings: { media: thumbs.map((t, i) => ({ kind: 'photo', label: `P${i}`, thumbnail: t })) },
  }) as unknown as RankedAnswerV2;

  it('keeps small real JPEG data URLs only', () => {
    const out = safeThumbnails(answer([
      `data:image/jpeg;base64,${jpeg}`,
      `data:image/jpeg;base64,${png}`,     // claims JPEG, is PNG
      `data:image/jpeg;base64,${big}`,     // too large for an email
      'https://tracker.example/pixel.gif',
      'javascript:alert(1)',
    ]));
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('P0');
  });
});

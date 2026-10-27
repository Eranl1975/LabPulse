// Pure helpers for document ids and evidence tiers, shared by the curated
// catalogue (lib/document-seed.ts, server only) and manual registration, which
// the browser also imports. No Node imports here.

import type { DocType } from './document-types';
import type { EvidenceTier } from './types';

/** A curated doc tied to a specific model is exact-model evidence (tier 1). */
export function seedTier(docType: DocType, model: string | null): EvidenceTier {
  if (docType === 'application_note' || docType === 'tech_note' || docType === 'article') return 5;
  return model ? 1 : 2;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

/** Short deterministic suffix so two docs with the same number never collide. */
export function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

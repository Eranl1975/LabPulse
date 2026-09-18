// Converts the curated data/instrument-docs.json catalogue into DocumentRecords.
// Used to seed the documents table and as the offline fallback when Supabase is
// unavailable, mirroring how lib/store.ts falls back to the on-disk knowledge base.

import fs from 'fs';
import path from 'path';
import type { DocumentRecord, DocType } from './document-types';
import type { Technique, EvidenceTier } from './types';

interface RawDoc {
  type?: string;
  title?: string;
  document_number?: string;
  url?: string;
  source?: string;
}

interface RawInstrument {
  technique?: string;
  manufacturer?: string;
  model?: string;
  full_name?: string;
  documentation?: RawDoc[];
}

/** The catalogue uses richer type names than the documents table allows. */
const TYPE_MAP: Record<string, DocType> = {
  user_guide: 'user_guide',
  quick_reference: 'quick_reference',
  maintenance_guide: 'maintenance_guide',
  service_manual: 'service_manual',
  troubleshooting_guide: 'troubleshooting_guide',
  application_note: 'application_note',
  faq: 'faq',
  concepts_guide: 'user_guide',
  familiarization_guide: 'user_guide',
  site_preparation: 'tech_note',
  technical_overview: 'tech_note',
  supplies_reference: 'tech_note',
  white_paper: 'tech_note',
  brochure: 'article',
};

const VALID_TECHNIQUES = new Set<string>([
  'LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC',
  'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET',
  'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC',
]);

const CATALOGUE_PATH = path.join(process.cwd(), 'data', 'instrument-docs.json');

/** Read and convert the curated catalogue. Returns [] when the file is absent or invalid. */
export function loadSeedDocuments(filePath: string = CATALOGUE_PATH): DocumentRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
  return seedDocumentsFrom(parsed);
}

/** Conversion split out from file IO so it is directly testable. */
export function seedDocumentsFrom(parsed: unknown): DocumentRecord[] {
  if (typeof parsed !== 'object' || parsed === null) return [];
  const instruments = (parsed as { instruments?: unknown }).instruments;
  if (typeof instruments !== 'object' || instruments === null) return [];

  const now = new Date().toISOString();
  const out: DocumentRecord[] = [];
  const seenUrls = new Set<string>();

  for (const [instrumentKey, value] of Object.entries(instruments as Record<string, unknown>)) {
    const inst = value as RawInstrument;
    const vendor = inst.manufacturer?.trim();
    if (!vendor) continue;

    const technique = inst.technique && VALID_TECHNIQUES.has(inst.technique)
      ? (inst.technique as Technique)
      : null;
    if (!technique) continue;

    const model = inst.model?.trim() || null;
    const family = inst.full_name?.trim() || null;

    for (const doc of inst.documentation ?? []) {
      const url = doc.url?.trim();
      const title = doc.title?.trim();
      if (!url || !title) continue;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const docType = TYPE_MAP[doc.type ?? ''] ?? null;
      if (!docType) continue;

      out.push({
        id: `${slug(vendor)}--${slug(docType)}--${slug(doc.document_number || instrumentKey)}-${shortHash(url)}`,
        source_id: null,
        vendor,
        techniques: [technique],
        instrument_family: family,
        model,
        doc_type: docType,
        title,
        document_number: doc.document_number?.trim() || null,
        url,
        language: 'en',
        publication_date: null,
        content_hash: null,
        http_etag: null,
        http_last_modified: null,
        page_count: null,
        storage_path: null,
        authority_tier: seedTier(docType, model),
        status: 'active',
        discovered_by: 'seed',
        first_seen_at: now,
        last_checked_at: null,
        last_changed_at: null,
      });
    }
  }

  return out;
}

/** A curated doc tied to a specific model is exact-model evidence (tier 1). */
function seedTier(docType: DocType, model: string | null): EvidenceTier {
  if (docType === 'application_note' || docType === 'tech_note' || docType === 'article') return 5;
  return model ? 1 : 2;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

/** Short deterministic suffix so two docs with the same number never collide. */
function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

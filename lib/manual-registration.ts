// Register a manual that is not in the curated catalogue (v8.2).
//
// The catalogue (data/instrument-docs.json) covers one instrument family, and
// ingestion used to accept only files that matched one of its rows, so a manual
// for any other instrument could not be added at all. An admin can now add one
// by uploading its PDF with a few facts about it; its text is then stored in
// Supabase and searched before any AI call, like a catalogued manual.
//
// Pure: builds and validates the row; app/api/documents/ingest writes it.

import { isDocType, type DocType, type DocumentRecord } from './document-types';
import { seedTier, slug, shortHash } from './document-ids';
import type { Technique } from './types';

export const MANUAL_TECHNIQUES: readonly Technique[] = [
  'LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC',
  'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET',
  'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC',
];

export interface NewManualInput {
  vendor?: unknown;
  techniques?: unknown;
  model?: unknown;
  doc_type?: unknown;
  title?: unknown;
  document_number?: unknown;
  url?: unknown;
}

/** URL scheme for a manual LabPulse holds as text but has no public link for. */
export const LOCAL_MANUAL_SCHEME = 'labpulse-manual:';

function text(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Validate the admin's input and build the document row. The evidence tier
 * follows the curated catalogue's rule: a vendor manual tied to a model is
 * exact-model evidence (tier 1), without a model instrument-family (tier 2),
 * and application/technical notes and articles tier 5.
 */
export function buildManualRecord(
  input: NewManualInput,
  now: string = new Date().toISOString(),
): { record: DocumentRecord } | { error: string } {
  const vendor = text(input.vendor, 100);
  const title = text(input.title, 300);
  const model = text(input.model, 200) || null;
  const documentNumber = text(input.document_number, 100) || null;
  const rawUrl = text(input.url, 1000);

  if (!vendor) return { error: 'Manufacturer is required.' };
  if (!title) return { error: 'Title is required.' };
  if (!isDocType(input.doc_type)) return { error: 'Document type is not valid.' };
  const docType: DocType = input.doc_type;

  const techniques = Array.isArray(input.techniques)
    ? [...new Set(input.techniques.filter((t): t is Technique =>
        typeof t === 'string' && (MANUAL_TECHNIQUES as readonly string[]).includes(t)))]
    : [];
  if (techniques.length === 0) return { error: 'Choose at least one technique.' };

  if (rawUrl && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(rawUrl)) {
    return { error: 'The link must be an http(s) URL, or left empty.' };
  }

  const key = documentNumber || model || title;
  const id = `${slug(vendor)}--${slug(docType)}--${slug(key)}-${shortHash(`${vendor}|${title}|${documentNumber ?? ''}|${rawUrl}`)}`;

  return {
    record: {
      id,
      source_id: null,
      vendor,
      techniques,
      instrument_family: null,
      model,
      doc_type: docType,
      title,
      document_number: documentNumber,
      // documents.url is unique and required; a manual without a public link gets
      // a local identifier that the UI never renders as a link.
      url: rawUrl || `${LOCAL_MANUAL_SCHEME}${id}`,
      language: 'en',
      publication_date: null,
      content_hash: null,
      http_etag: null,
      http_last_modified: null,
      page_count: null,
      storage_path: null,
      authority_tier: seedTier(docType, model),
      status: 'active',
      discovered_by: 'manual',
      first_seen_at: now,
      last_checked_at: null,
      last_changed_at: null,
      ingested_at: null,
    },
  };
}

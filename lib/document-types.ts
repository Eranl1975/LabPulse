import type { Technique, EvidenceTier } from './types';

/** Document classes the agent is allowed to ingest. */
export type DocType =
  | 'troubleshooting_guide'
  | 'service_manual'
  | 'user_guide'
  | 'maintenance_guide'
  | 'quick_reference'
  | 'application_note'
  | 'tech_note'
  | 'faq'
  | 'article';

export const DOC_TYPES: readonly DocType[] = [
  'troubleshooting_guide', 'service_manual', 'user_guide',
  'maintenance_guide', 'quick_reference', 'application_note',
  'tech_note', 'faq', 'article',
] as const;

export function isDocType(v: unknown): v is DocType {
  return typeof v === 'string' && (DOC_TYPES as readonly string[]).includes(v);
}

export type DocumentStatus = 'active' | 'stale' | 'removed';
export type DiscoveredBy = 'crawler' | 'seed' | 'manual';

/** A document row (mirrors supabase/migrations/019_documents.sql). */
export interface DocumentRecord {
  id: string;
  source_id: string | null;
  vendor: string;
  techniques: Technique[];
  instrument_family: string | null;
  model: string | null;
  doc_type: DocType;
  title: string;
  document_number: string | null;
  url: string;
  language: string;
  publication_date: string | null;
  content_hash: string | null;
  http_etag: string | null;
  http_last_modified: string | null;
  page_count: number | null;
  storage_path: string | null;
  authority_tier: EvidenceTier;
  status: DocumentStatus;
  discovered_by: DiscoveredBy;
  first_seen_at: string;
  last_checked_at: string | null;
  last_changed_at: string | null;
  /** When an operator last ingested a local PDF into document_chunks (022). */
  ingested_at: string | null;
}

/** A searchable passage of a document (mirrors 020_document_chunks.sql). */
export interface DocumentChunk {
  document_id: string;
  chunk_index: number;
  heading: string | null;
  page_number: number | null;
  text: string;
}

/** A search hit: chunk plus the document metadata needed to cite it. */
export interface DocumentHit {
  document_id: string;
  title: string;
  vendor: string;
  doc_type: DocType;
  document_number: string | null;
  url: string;
  publication_date: string | null;
  heading: string | null;
  page_number: number | null;
  excerpt: string;
  /** Tier assigned for THIS query (exact-model vs family), not the stored default. */
  tier: EvidenceTier;
}

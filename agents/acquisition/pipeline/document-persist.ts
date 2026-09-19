// Persistence for documents + document_chunks (migrations 019/020).
// Mirrors the PersistenceAdapter pattern already used for knowledge_items:
// an interface, an in-memory mock for tests, and a Supabase implementation.

import type { DocumentRecord, DocumentChunk } from '@/lib/document-types';
import type { KnownDocument } from '../adapters/vendor-web';

export interface DocumentStore {
  /** Change-detection state for a vendor's known documents, keyed by URL. */
  getKnown(source_id: string): Promise<Map<string, KnownDocument>>;
  upsertDocuments(docs: DocumentRecord[]): Promise<{ inserted: number; updated: number }>;
  /** Replaces all chunks belonging to each document id present in `chunks`. */
  replaceChunks(chunks: DocumentChunk[]): Promise<number>;
}

export class MockDocumentStore implements DocumentStore {
  readonly documents = new Map<string, DocumentRecord>();
  readonly chunks = new Map<string, DocumentChunk[]>();

  async getKnown(source_id: string): Promise<Map<string, KnownDocument>> {
    const out = new Map<string, KnownDocument>();
    for (const doc of this.documents.values()) {
      if (doc.source_id !== source_id) continue;
      out.set(doc.url, {
        url: doc.url,
        content_hash: doc.content_hash,
        http_etag: doc.http_etag,
        http_last_modified: doc.http_last_modified,
      });
    }
    return out;
  }

  async upsertDocuments(docs: DocumentRecord[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    for (const doc of docs) {
      if (this.documents.has(doc.id)) updated++;
      else inserted++;
      this.documents.set(doc.id, doc);
    }
    return { inserted, updated };
  }

  async replaceChunks(chunks: DocumentChunk[]): Promise<number> {
    for (const id of new Set(chunks.map(c => c.document_id))) this.chunks.set(id, []);
    for (const chunk of chunks) {
      const list = this.chunks.get(chunk.document_id) ?? [];
      list.push(chunk);
      this.chunks.set(chunk.document_id, list);
    }
    return chunks.length;
  }
}

/** Writes require the service-role key; the anon key cannot write these tables. */
export function hasDocumentStoreCredentials(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export class SupabaseDocumentStore implements DocumentStore {
  private readonly url: string;
  private readonly key: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SupabaseDocumentStore requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    this.url = url.replace(/\/$/, '');
    this.key = key;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async getKnown(source_id: string): Promise<Map<string, KnownDocument>> {
    const endpoint =
      `${this.url}/rest/v1/documents` +
      `?select=url,content_hash,http_etag,http_last_modified` +
      `&source_id=eq.${encodeURIComponent(source_id)}&status=eq.active`;

    const res = await fetch(endpoint, { headers: this.headers(), cache: 'no-store' });
    if (!res.ok) throw new Error(`getKnown failed: HTTP ${res.status} ${await res.text()}`);

    const rows = (await res.json()) as KnownDocument[];
    return new Map(rows.map(r => [r.url, r]));
  }

  async upsertDocuments(docs: DocumentRecord[]): Promise<{ inserted: number; updated: number }> {
    if (docs.length === 0) return { inserted: 0, updated: 0 };

    const existing = await this.existingIds(docs.map(d => d.id));

    // first_seen_at must survive an update; the DB default only applies on insert.
    const rows = docs.map(d => {
      const row: Record<string, unknown> = { ...d };
      if (existing.has(d.id)) delete row.first_seen_at;
      return row;
    });

    const res = await fetch(`${this.url}/rest/v1/documents?on_conflict=id`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(`upsertDocuments failed: HTTP ${res.status} ${await res.text()}`);

    const inserted = docs.filter(d => !existing.has(d.id)).length;
    return { inserted, updated: docs.length - inserted };
  }

  async replaceChunks(chunks: DocumentChunk[]): Promise<number> {
    const documentIds = [...new Set(chunks.map(c => c.document_id))];
    if (documentIds.length === 0) return 0;

    // Delete then insert: a document's chunk count changes when it is revised.
    const list = documentIds.map(id => `"${id.replace(/"/g, '')}"`).join(',');
    const del = await fetch(
      `${this.url}/rest/v1/document_chunks?document_id=in.(${encodeURIComponent(list)})`,
      { method: 'DELETE', headers: this.headers({ Prefer: 'return=minimal' }) },
    );
    if (!del.ok) throw new Error(`replaceChunks delete failed: HTTP ${del.status} ${await del.text()}`);

    // Insert in batches so a large manual does not exceed the request size limit.
    const BATCH = 200;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const res = await fetch(`${this.url}/rest/v1/document_chunks`, {
        method: 'POST',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(batch),
      });
      if (!res.ok) throw new Error(`replaceChunks insert failed: HTTP ${res.status} ${await res.text()}`);
    }

    return chunks.length;
  }

  private async existingIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const list = ids.map(id => `"${id.replace(/"/g, '')}"`).join(',');
    const res = await fetch(
      `${this.url}/rest/v1/documents?select=id&id=in.(${encodeURIComponent(list)})`,
      { headers: this.headers(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`existingIds failed: HTTP ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as Array<{ id: string }>;
    return new Set(rows.map(r => r.id));
  }
}

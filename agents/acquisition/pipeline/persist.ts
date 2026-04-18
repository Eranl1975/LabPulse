// Persistence interface + in-memory mock + Supabase adapter.

import type { AcquiredItem } from '../types';

export interface PersistenceAdapter {
  getAll(): Promise<AcquiredItem[]>;
  getByIds(ids: string[]): Promise<AcquiredItem[]>;
  upsert(items: AcquiredItem[]): Promise<{ inserted: number; updated: number }>;
  deprecate(ids: string[]): Promise<void>;
}

// In-memory adapter for testing and development.
export class MockPersistenceAdapter implements PersistenceAdapter {
  private store = new Map<string, AcquiredItem>();

  async getAll(): Promise<AcquiredItem[]> {
    return [...this.store.values()];
  }

  async getByIds(ids: string[]): Promise<AcquiredItem[]> {
    return ids.flatMap(id => {
      const item = this.store.get(id);
      return item ? [item] : [];
    });
  }

  async upsert(items: AcquiredItem[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated  = 0;
    for (const item of items) {
      this.store.has(item.id) ? updated++ : inserted++;
      this.store.set(item.id, item);
    }
    return { inserted, updated };
  }

  async deprecate(ids: string[]): Promise<void> {
    for (const id of ids) {
      const item = this.store.get(id);
      if (item) this.store.set(id, { ...item, is_deprecated: true });
    }
  }

  // Helper for tests: read current store snapshot
  snapshot(): AcquiredItem[] {
    return [...this.store.values()];
  }
}

// ---------------------------------------------------------------------------
// SupabasePersistenceAdapter
// Maps AcquiredItem ↔ knowledge_items table (schema: supabase/migrations/002).
// Also upserts source records into the sources table (001) for traceability.
// ---------------------------------------------------------------------------
export class SupabasePersistenceAdapter implements PersistenceAdapter {
  private db: ReturnType<typeof import('@/lib/supabase').getSupabaseClient>;

  constructor() {
    // Defer client creation to first use so SSR prerender never fails.
    const { getSupabaseClient } = require('@/lib/supabase');
    this.db = getSupabaseClient();
  }

  async getAll(): Promise<AcquiredItem[]> {
    const { data, error } = await this.db
      .from('knowledge_items')
      .select('*')
      .eq('is_deprecated', false);

    if (error) throw new Error(`getAll failed: ${error.message}`);
    return (data ?? []).map(rowToAcquiredItem);
  }

  async getByIds(ids: string[]): Promise<AcquiredItem[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('knowledge_items')
      .select('*')
      .in('id', ids);

    if (error) throw new Error(`getByIds failed: ${error.message}`);
    return (data ?? []).map(rowToAcquiredItem);
  }

  async upsert(items: AcquiredItem[]): Promise<{ inserted: number; updated: number }> {
    if (items.length === 0) return { inserted: 0, updated: 0 };

    // 1. Upsert source records (ignore conflicts on id — source metadata is stable).
    const sourceRows = uniqueSources(items);
    if (sourceRows.length > 0) {
      const { error: srcErr } = await this.db
        .from('sources')
        .upsert(sourceRows, { onConflict: 'id', ignoreDuplicates: true });
      if (srcErr) throw new Error(`source upsert failed: ${srcErr.message}`);
    }

    // 2. Check which IDs already exist to compute inserted vs updated counts.
    const existingIds = new Set(
      (await this.getByIds(items.map(i => i.id))).map(i => i.id),
    );

    // 3. Upsert knowledge items.
    const rows = items.map(acquiredItemToRow);
    const { error } = await this.db
      .from('knowledge_items')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw new Error(`knowledge_items upsert failed: ${error.message}`);

    const inserted = items.filter(i => !existingIds.has(i.id)).length;
    const updated  = items.length - inserted;
    return { inserted, updated };
  }

  async deprecate(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.db
      .from('knowledge_items')
      .update({ is_deprecated: true, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw new Error(`deprecate failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function acquiredItemToRow(item: AcquiredItem): Record<string, unknown> {
  return {
    id:                   item.id,
    technique:            item.technique,
    instrument_family:    item.instrument_family,
    model:                item.model,
    issue_category:       item.issue_category,
    symptom:              item.symptom,
    likely_causes:        item.likely_causes,
    diagnostics:          item.diagnostics,
    corrective_actions:   item.corrective_actions,
    severity:             item.severity,
    escalation_conditions: item.escalation_conditions,
    primary_source_id:    item.source_id,
    source_type:          item.source_type,
    confidence_score:     item.confidence_score,
    evidence_strength:    item.evidence_strength,
    source_quality_score: item.source_quality_score,
    version:              item.version,
    is_deprecated:        item.is_deprecated,
    publication_date:     item.publication_date,
    extracted_at:         item.extracted_at,
    monthly_refresh_at:   item.monthly_refresh_at,
    updated_at:           item.updated_at,
    tags:                 item.tags,
    contradiction_flags:  item.contradiction_flags,
  };
}

function rowToAcquiredItem(row: Record<string, unknown>): AcquiredItem {
  return {
    id:                   row.id as string,
    technique:            row.technique as AcquiredItem['technique'],
    instrument_family:    row.instrument_family as string,
    model:                row.model as string | null,
    issue_category:       row.issue_category as string,
    symptom:              row.symptom as string,
    likely_causes:        (row.likely_causes as string[]) ?? [],
    diagnostics:          (row.diagnostics as string[]) ?? [],
    corrective_actions:   (row.corrective_actions as string[]) ?? [],
    severity:             row.severity as AcquiredItem['severity'],
    escalation_conditions: (row.escalation_conditions as string[]) ?? [],
    source_id:            row.primary_source_id as string,
    source_type:          row.source_type as AcquiredItem['source_type'],
    source_title:         '',   // not stored on knowledge_items; fetch from sources if needed
    source_url:           '',
    publication_date:     row.publication_date as string | null,
    confidence_score:     row.confidence_score as number,
    evidence_strength:    row.evidence_strength as AcquiredItem['evidence_strength'],
    source_quality_score: row.source_quality_score as number,
    extracted_at:         row.extracted_at as string,
    monthly_refresh_at:   row.monthly_refresh_at as string,
    updated_at:           row.updated_at as string,
    tags:                 (row.tags as string[]) ?? [],
    version:              row.version as number,
    is_deprecated:        row.is_deprecated as boolean,
    contradiction_flags:  (row.contradiction_flags as string[]) ?? [],
  };
}

function uniqueSources(items: AcquiredItem[]): Record<string, unknown>[] {
  const seen = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    if (!seen.has(item.source_id)) {
      seen.set(item.source_id, {
        id:              item.source_id,
        name:            item.source_title || item.source_id,
        source_type:     item.source_type,
        url:             item.source_url || null,
        authority_score: item.source_quality_score,
        updated_at:      new Date().toISOString(),
      });
    }
  }
  return [...seen.values()];
}

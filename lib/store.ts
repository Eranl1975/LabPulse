import fs from 'fs';
import path from 'path';
import type { KnowledgeItem } from './types';
import { createLogger } from './logger';

const log = createLogger('store');
const FILE = path.join(process.cwd(), 'data', 'knowledge-items.json');

// In-memory cache with TTL (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;
/** Ceiling on rows pulled from Supabase in one knowledge-base read. */
const MAX_SUPABASE_ITEMS = 5000;
let cachedItems: KnowledgeItem[] | null = null;
let cacheTimestamp = 0;

/** Read all active (non-deleted) items, with 5-min TTL cache */
export function readItems(): KnowledgeItem[] {
  const now = Date.now();
  if (cachedItems && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedItems;
  }
  try {
    const all = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as KnowledgeItem[];
    cachedItems = all.filter(item => !item.deleted_at);
    cacheTimestamp = now;
    return cachedItems;
  } catch {
    return [];
  }
}

/** Read ALL items including soft-deleted (for admin views) */
export function readAllItems(): KnowledgeItem[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as KnowledgeItem[];
  } catch {
    return [];
  }
}

export function writeItems(items: KnowledgeItem[]): void {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf-8');
  cachedItems = null;
  cacheTimestamp = 0;
}

/** Force cache invalidation */
export function invalidateCache(): void {
  cachedItems = null;
  cacheTimestamp = 0;
}

// ─── Supabase-backed KB with full-text search (V5) ─────────────────

/** Read items from Supabase with optional full-text search. Returns null if unavailable. */
export async function readItemsFromSupabase(
  searchQuery?: string,
): Promise<KnowledgeItem[] | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    // Bounded: the monthly agent appends to this table indefinitely, and the
    // caller ranks over the whole set. deleted_at requires migration 023.
    let endpoint = `${url}/rest/v1/knowledge_items?is_deprecated=eq.false&deleted_at=is.null&order=updated_at.desc&limit=${MAX_SUPABASE_ITEMS}`;
    if (searchQuery) {
      const terms = searchQuery.trim().split(/\s+/).join(' & ');
      endpoint += `&tsv=fts.${encodeURIComponent(terms)}`;
    }

    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 300 }, // 5-min cache
    });

    if (!res.ok) {
      log.warn('supabase-read', `Supabase KB query failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as KnowledgeItem[];
  } catch {
    return null;
  }
}

/**
 * Merge the curated catalogue with whatever the monthly agent has stored.
 *
 * This used to return the Supabase rows INSTEAD of the file whenever Supabase
 * had any match, which meant a handful of crawled items could displace the whole
 * curated knowledge base for a query. The curated items are the higher-quality
 * set, so they are always included; crawled items are additive.
 *
 * On an id collision the Supabase row wins: it is the same item, refreshed.
 * When Supabase is unavailable or empty the result is exactly the file contents,
 * so the offline behaviour is unchanged.
 */
export async function readItemsHybrid(searchQuery?: string): Promise<KnowledgeItem[]> {
  const supabaseItems = await readItemsFromSupabase(searchQuery);
  const fileItems = readItems();
  if (!supabaseItems || supabaseItems.length === 0) return fileItems;

  // Supersede in place rather than rebuilding from a Map keyed by id: the
  // curated catalogue currently contains two different TGA items that share the
  // id 'tga-002', and keying by id would silently drop one of them.
  const supabaseById = new Map(supabaseItems.map(item => [item.id, item]));
  const merged = fileItems.map(item => supabaseById.get(item.id) ?? item);

  const fileIds = new Set(fileItems.map(item => item.id));
  for (const item of supabaseItems) {
    if (!fileIds.has(item.id)) merged.push(item);
  }
  return merged;
}

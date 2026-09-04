import fs from 'fs';
import path from 'path';
import type { KnowledgeItem } from './types';
import { createLogger } from './logger';

const log = createLogger('store');
const FILE = path.join(process.cwd(), 'data', 'knowledge-items.json');

// In-memory cache with TTL (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;
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

    let endpoint = `${url}/rest/v1/knowledge_items?is_deprecated=eq.false&deleted_at=is.null&order=updated_at.desc`;
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

/** Hybrid read: tries Supabase first, falls back to JSON file. */
export async function readItemsHybrid(searchQuery?: string): Promise<KnowledgeItem[]> {
  const supabaseItems = await readItemsFromSupabase(searchQuery);
  if (supabaseItems && supabaseItems.length > 0) return supabaseItems;
  return readItems();
}

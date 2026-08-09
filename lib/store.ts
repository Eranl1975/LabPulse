import fs from 'fs';
import path from 'path';
import type { KnowledgeItem } from './types';

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

import fs from 'fs';
import path from 'path';
import type { KnowledgeItem } from './types';

const FILE = path.join(process.cwd(), 'data', 'knowledge-items.json');

export function readItems(): KnowledgeItem[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as KnowledgeItem[];
  } catch {
    return [];
  }
}

export function writeItems(items: KnowledgeItem[]): void {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf-8');
}

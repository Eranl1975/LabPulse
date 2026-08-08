import fs from 'fs';
import path from 'path';
import type { CleaningProcedureContent } from './cleaning-types';

const FILE = path.join(process.cwd(), 'data', 'cleaning-procedures.json');

/** Load all cleaning procedures from the local JSON knowledge base. */
export function readCleaningProcedures(): CleaningProcedureContent[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as CleaningProcedureContent[];
  } catch {
    return [];
  }
}

/**
 * Find the best-matching cleaning procedure from local data.
 * Matching priority:
 *   1. Exact: technique + manufacturer + model
 *   2. Vendor: technique + manufacturer (any model)
 *   3. Generic: technique only (manufacturer = "Generic")
 *   4. null if no match
 */
export function findCleaningProcedure(
  technique: string,
  vendor?: string | null,
  model?: string | null,
): CleaningProcedureContent | null {
  const items = readCleaningProcedures();
  const byTechnique = items.filter(p => p.technique === technique);

  if (byTechnique.length === 0) return null;

  // 1. Exact match: technique + vendor + model
  if (vendor && model) {
    const exact = byTechnique.find(
      p => p.manufacturer.toLowerCase() === vendor.toLowerCase()
        && p.model.toLowerCase() === model.toLowerCase(),
    );
    if (exact) return exact;
  }

  // 2. Vendor match: technique + vendor (any model)
  if (vendor) {
    const vendorMatch = byTechnique.find(
      p => p.manufacturer.toLowerCase() === vendor.toLowerCase(),
    );
    if (vendorMatch) return vendorMatch;
  }

  // 3. Generic match: technique only
  const generic = byTechnique.find(
    p => p.manufacturer === 'Generic',
  );
  if (generic) return generic;

  // 4. Return the first available for this technique
  return byTechnique[0];
}

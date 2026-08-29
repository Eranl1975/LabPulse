import { describe, it, expect } from 'vitest';
import { deduplicateItems } from '@/lib/deduplication';

describe('deduplicateItems', () => {
  it('returns empty arrays for empty input', () => {
    const result = deduplicateItems([]);
    expect(result.main).toEqual([]);
    expect(result.additional).toEqual([]);
  });

  it('preserves distinct items in main', () => {
    const items = [
      'Check column back-pressure',
      'Inspect ion source for contamination',
      'Verify mobile phase composition',
    ];
    const result = deduplicateItems(items);
    expect(result.main).toHaveLength(3);
    expect(result.additional).toHaveLength(0);
  });

  it('deduplicates near-identical strings', () => {
    const items = [
      'Check the column for degradation and replace the column with a new one',
      'Check the column for degradation and replace the column immediately',
      'Inspect ion source for contamination',
    ];
    const result = deduplicateItems(items);
    // The two near-identical column items should be deduplicated
    expect(result.main.length).toBeLessThan(3);
    expect(result.additional.length).toBeGreaterThan(0);
  });

  it('keeps at most maxMain items in main', () => {
    const items = Array.from({ length: 10 }, (_, i) => `Unique action step number ${i + 1} with distinct words_${i}`);
    const result = deduplicateItems(items, 4);
    expect(result.main.length).toBeLessThanOrEqual(4);
    expect(result.main.length + result.additional.length).toBe(10);
  });

  it('prioritizes items with diagnostic keywords', () => {
    const items = [
      'General observation about the system',
      'Check the column pressure and verify flow rate',
      'The instrument is old and may need replacement',
    ];
    const result = deduplicateItems(items);
    // 'Check' and 'verify' are diagnostic keywords — should be ranked first
    expect(result.main[0]).toContain('Check');
  });

  it('handles single item correctly', () => {
    const result = deduplicateItems(['Single item']);
    expect(result.main).toEqual(['Single item']);
    expect(result.additional).toEqual([]);
  });

  it('treats completely different items as distinct', () => {
    const items = [
      'Replace the ion source gasket',
      'Calibrate mass accuracy using tune mix',
      'Flush mobile phase lines with fresh solvent',
      'Run system suitability standard',
    ];
    const result = deduplicateItems(items);
    expect(result.main).toHaveLength(4);
    expect(result.additional).toHaveLength(0);
  });

  it('moves duplicates to additional rather than discarding', () => {
    const items = [
      'Verify the column temperature is stable and within specification range',
      'Verify the column temperature is stable and within acceptable range',
      'Inspect detector lamp for aging and check intensity',
    ];
    const result = deduplicateItems(items);
    expect(result.main.length + result.additional.length).toBe(3);
    // Two near-identical column temperature items should produce 1 in additional
    expect(result.additional.length).toBeGreaterThanOrEqual(1);
  });
});

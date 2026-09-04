import { describe, it, expect } from 'vitest';
import { paginate } from '@/lib/pagination';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

  it('returns first page correctly', () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toBe('item-1');
    expect(result.page).toBe(1);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('returns middle page', () => {
    const result = paginate(items, 2, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toBe('item-11');
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
  });

  it('returns last page with partial items', () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toBe('item-21');
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it('clamps page to valid range (too high)', () => {
    const result = paginate(items, 999, 10);
    expect(result.page).toBe(3);
    expect(result.items[0]).toBe('item-21');
  });

  it('clamps page to valid range (too low)', () => {
    const result = paginate(items, -1, 10);
    expect(result.page).toBe(1);
  });

  it('handles empty array', () => {
    const result = paginate([], 1, 10);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it('clamps limit to max 100', () => {
    const result = paginate(items, 1, 500);
    expect(result.limit).toBe(100);
  });

  it('handles single-item array', () => {
    const result = paginate(['one'], 1, 10);
    expect(result.items).toEqual(['one']);
    expect(result.totalPages).toBe(1);
  });
});

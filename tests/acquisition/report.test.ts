import { describe, it, expect } from 'vitest';
import { buildReport, detectKnowledgeGaps, formatReport } from '@/agents/acquisition/pipeline/report';
import type { PipelineRunStats } from '@/agents/acquisition/types';

const baseStats: PipelineRunStats = {
  run_date: '2025-06-01',
  sources_checked: 2,
  sources_skipped_unchanged: 0,
  items_fetched: 5,
  items_extracted: 5,
  items_new: 3,
  items_updated: 1,
  items_duplicate: 1,
  items_deprecated: 0,
  contradictions_found: [],
  knowledge_gaps: [],
  errors: [],
};

describe('detectKnowledgeGaps', () => {
  it('flags categories with 0 items', () => {
    const gaps = detectKnowledgeGaps({});
    expect(gaps.length).toBe(12); // all 12 required categories
    expect(gaps[0]).toContain('Gap:');
  });

  it('flags categories below minimum threshold', () => {
    const gaps = detectKnowledgeGaps({ 'retention time shift': 1 }); // min is 2
    const rtGap = gaps.find(g => g.includes('retention time shift'));
    expect(rtGap).toBeDefined();
  });

  it('does not flag categories meeting minimum', () => {
    const counts: Record<string, number> = {};
    ['retention time shift', 'peak tailing'].forEach(c => { counts[c] = 3; });
    const gaps = detectKnowledgeGaps(counts);
    expect(gaps.some(g => g.includes('retention time shift'))).toBe(false);
    expect(gaps.some(g => g.includes('peak tailing'))).toBe(false);
  });
});

describe('buildReport', () => {
  it('maps stats to MonthlyUpdateReport correctly', () => {
    const stats = { ...baseStats, contradictions_found: ['conflict-a'], knowledge_gaps: ['gap-a'] };
    const report = buildReport(stats);
    expect(report.run_date).toBe('2025-06-01');
    expect(report.new_sources).toBe(3);
    expect(report.updated_sources).toBe(1);
    expect(report.deprecated_items).toBe(0);
    expect(report.conflicts_found).toEqual(['conflict-a']);
    expect(report.knowledge_gaps).toEqual(['gap-a']);
  });
});

describe('formatReport', () => {
  it('includes run date', () => {
    expect(formatReport(buildReport(baseStats))).toContain('2025-06-01');
  });

  it('includes new/updated/deprecated counts', () => {
    const text = formatReport(buildReport(baseStats));
    expect(text).toContain('New: 3');
    expect(text).toContain('Updated: 1');
    expect(text).toContain('Deprecated: 0');
  });

  it('lists conflicts when present', () => {
    const stats = { ...baseStats, contradictions_found: ['Contradiction: source-a vs source-b'] };
    expect(formatReport(buildReport(stats))).toContain('source-a vs source-b');
  });

  it('lists gaps when present', () => {
    const stats = { ...baseStats, knowledge_gaps: ['Gap: "no peak" has 0 item(s)'] };
    expect(formatReport(buildReport(stats))).toContain('no peak');
  });

  it('reports clean status when no conflicts or gaps', () => {
    expect(formatReport(buildReport(baseStats))).toContain('No conflicts or gaps');
  });

  it('truncates gap list beyond 5 items', () => {
    const stats = {
      ...baseStats,
      knowledge_gaps: ['g1','g2','g3','g4','g5','g6','g7'],
    };
    const text = formatReport(buildReport(stats));
    expect(text).toContain('and 2 more');
  });
});

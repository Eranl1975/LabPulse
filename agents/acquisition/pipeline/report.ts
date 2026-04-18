// Report generation — short and actionable per source-policy.md.

import type { PipelineRunStats } from '../types';
import type { MonthlyUpdateReport } from '@/lib/types';

// Required coverage per project-spec.md — gaps flagged when count < MIN_ITEMS_PER_CATEGORY
const REQUIRED_CATEGORIES = [
  'retention time shift', 'peak tailing', 'peak broadening', 'low sensitivity',
  'no peak', 'carryover', 'noisy baseline', 'high backpressure',
  'LCMS source contamination', 'GC ghost peaks', 'poor GC peak shape', 'GCMS signal loss',
] as const;

const MIN_ITEMS_PER_CATEGORY = 2;

export function detectKnowledgeGaps(
  categoryCounts: Record<string, number>,
): string[] {
  return REQUIRED_CATEGORIES
    .filter(cat => (categoryCounts[cat] ?? 0) < MIN_ITEMS_PER_CATEGORY)
    .map(cat => `Gap: "${cat}" has ${categoryCounts[cat] ?? 0} item(s) (min ${MIN_ITEMS_PER_CATEGORY})`);
}

export function buildReport(stats: PipelineRunStats): MonthlyUpdateReport {
  return {
    run_date:         stats.run_date,
    new_sources:      stats.items_new,
    updated_sources:  stats.items_updated,
    deprecated_items: stats.items_deprecated,
    conflicts_found:  stats.contradictions_found,
    knowledge_gaps:   stats.knowledge_gaps,
  };
}

// Next recommended update priorities — up to 5 actionable items.
// Based on knowledge gaps, unresolved contradictions, and stub-only sources.
export function recommendNextPriorities(
  stats: PipelineRunStats,
  stubSourceIds: string[] = [],
): string[] {
  const priorities: string[] = [];

  // 1. Unresolved contradictions take top priority — they erode confidence.
  for (const c of stats.contradictions_found.slice(0, 2)) {
    priorities.push(`Resolve: ${c}`);
  }

  // 2. Knowledge gaps — categories with too few items are the next most urgent.
  for (const gap of stats.knowledge_gaps.slice(0, 2)) {
    priorities.push(`Acquire: ${gap.replace('Gap: ', '')}`);
  }

  // 3. Stub sources — recommend integrating the highest-priority unconnected vendor.
  const vendorStubs = stubSourceIds.filter(id => {
    const lower = id.toLowerCase();
    return ['waters','thermo','shimadzu','sciex','restek','perkinelmer','phenomenex','supelco']
      .some(v => lower.startsWith(v));
  });
  if (vendorStubs.length > 0 && priorities.length < 5) {
    priorities.push(`Integrate: build live adapter for ${vendorStubs[0]}`);
  }

  return priorities.slice(0, 5);
}

// Short actionable text for logs/notifications — keep it under 15 lines.
export function formatReport(report: MonthlyUpdateReport): string {
  const lines = [
    `## Monthly Refresh — ${report.run_date}`,
    `New: ${report.new_sources} | Updated: ${report.updated_sources} | Deprecated: ${report.deprecated_items}`,
  ];

  if (report.conflicts_found.length > 0) {
    lines.push(`Conflicts (${report.conflicts_found.length}):`);
    report.conflicts_found.forEach(c => lines.push(`  - ${c}`));
  }

  if (report.knowledge_gaps.length > 0) {
    lines.push(`Gaps (${report.knowledge_gaps.length}):`);
    report.knowledge_gaps.slice(0, 5).forEach(g => lines.push(`  - ${g}`));
    if (report.knowledge_gaps.length > 5) {
      lines.push(`  ... and ${report.knowledge_gaps.length - 5} more`);
    }
  }

  if (report.conflicts_found.length === 0 && report.knowledge_gaps.length === 0) {
    lines.push('No conflicts or gaps detected.');
  }

  return lines.join('\n');
}

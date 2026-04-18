// Acquisition Agent — monthly knowledge update pipeline.
// Stages: fetch → extract → score → quality-gate → normalize → community-cap → dedup → persist → report.

import type { Technique, MonthlyUpdateReport } from '@/lib/types';
import type { SourceAdapter } from './adapters/interface';
import type { AdapterFetchQuery, PipelineRunStats, AcquiredItem } from './types';
import type { PersistenceAdapter } from './pipeline/persist';
import { extractItem }          from './pipeline/extract';
import { scoreSourceQuality }   from './pipeline/score';
import { normalizeItem }        from './pipeline/normalize';
import { deduplicateAndFlag }   from './pipeline/dedup';
import {
  buildReport,
  detectKnowledgeGaps,
  formatReport,
  recommendNextPriorities,
} from './pipeline/report';
import {
  MIN_SOURCE_QUALITY,
  COMMUNITY_MAX_EVIDENCE_STRENGTH,
  COMMUNITY_MAX_CONFIDENCE,
} from './config/sources';

export interface PipelineOptions {
  techniques?:         Technique[];   // default: all four
  issue_categories?:   string[];      // default: all
  since?:              string | null; // skip unchanged sources
  dry_run?:            boolean;       // skip persistence writes
  min_source_quality?: number;        // default: MIN_SOURCE_QUALITY (0.40)
}

const DEFAULT_TECHNIQUES: Technique[] = ['LCMS', 'HPLC', 'GC', 'GCMS'];

// Strengths that exceed the community cap (weak); anything stronger gets capped.
const ABOVE_WEAK = new Set<string>(['strong', 'moderate']);

function capCommunityItem(item: AcquiredItem): AcquiredItem {
  return {
    ...item,
    evidence_strength: ABOVE_WEAK.has(item.evidence_strength)
      ? COMMUNITY_MAX_EVIDENCE_STRENGTH
      : item.evidence_strength,
    confidence_score: Math.min(item.confidence_score, COMMUNITY_MAX_CONFIDENCE),
  };
}

export async function runAcquisitionPipeline(
  adapters: SourceAdapter[],
  persistence: PersistenceAdapter,
  opts: PipelineOptions = {},
): Promise<{ report: MonthlyUpdateReport; stats: PipelineRunStats; next_priorities: string[] }> {
  const runDate          = new Date().toISOString().slice(0, 10);
  const since            = opts.since ?? null;
  const techniques       = opts.techniques ?? DEFAULT_TECHNIQUES;
  const issue_categories = opts.issue_categories ?? [];
  const minQuality       = opts.min_source_quality ?? MIN_SOURCE_QUALITY;

  const query: AdapterFetchQuery = { techniques, issue_categories, since };

  const stats: PipelineRunStats = {
    run_date:                  runDate,
    sources_checked:           adapters.length,
    sources_skipped_unchanged: 0,
    items_fetched:             0,
    items_extracted:           0,
    items_new:                 0,
    items_updated:             0,
    items_duplicate:           0,
    items_deprecated:          0,
    items_skipped_weak_source: 0,
    contradictions_found:      [],
    knowledge_gaps:            [],
    errors:                    [],
  };

  const acquiredItems: AcquiredItem[] = [];
  const stubSourceIds:  string[]      = [];

  // Stages 1–4: fetch → extract → score → quality-gate → normalize → community-cap
  for (const adapter of adapters) {
    const hasUpdates = await adapter.hasUpdates(since);
    if (!hasUpdates) {
      stats.sources_skipped_unchanged++;
      // Stubs (never have updates, even on a full run) feed the priority recommendations.
      if (since === null) stubSourceIds.push(adapter.source_id);
      continue;
    }

    let rawItems;
    try {
      rawItems = await adapter.fetch(query);
    } catch (err) {
      stats.errors.push(`Fetch error [${adapter.source_id}]: ${String(err)}`);
      continue;
    }

    stats.items_fetched += rawItems.length;

    for (const raw of rawItems) {
      const extracted = extractItem(raw);
      if (!extracted) {
        stats.errors.push(`Extraction failed: ${raw.source_id} / ${raw.source_url}`);
        continue;
      }
      stats.items_extracted++;

      const quality = scoreSourceQuality(extracted);

      // Quality gate: discard items that fall below the minimum composite threshold.
      if (quality.composite < minQuality) {
        stats.items_skipped_weak_source++;
        stats.errors.push(
          `Skipped (quality ${quality.composite.toFixed(2)} < ${minQuality}): ${raw.source_id}`,
        );
        continue;
      }

      let acquired = normalizeItem(extracted, quality, runDate);

      // Community cap: community items are supporting evidence only — never primary.
      if (acquired.source_type === 'community') {
        acquired = capCommunityItem(acquired);
      }

      acquiredItems.push(acquired);
    }
  }

  // Stage 5: deduplication + contradiction detection
  const existing = await persistence.getAll();
  const { results, contradictions } = deduplicateAndFlag(acquiredItems, existing);

  stats.contradictions_found = contradictions;

  const toUpsert: AcquiredItem[] = [];
  for (const r of results) {
    if (r.status === 'duplicate') {
      stats.items_duplicate++;
    } else if (r.status === 'new') {
      stats.items_new++;
      toUpsert.push(r.item);
    } else {
      stats.items_updated++;
      toUpsert.push(r.item);
    }
  }

  // Stage 6: persist
  if (!opts.dry_run && toUpsert.length > 0) {
    try {
      await persistence.upsert(toUpsert);
    } catch (err) {
      stats.errors.push(`Persist error: ${String(err)}`);
    }
  }

  // Stage 7: detect knowledge gaps from full store
  const allItems = opts.dry_run ? existing : await persistence.getAll();
  const categoryCounts: Record<string, number> = {};
  for (const item of allItems) {
    categoryCounts[item.issue_category] = (categoryCounts[item.issue_category] ?? 0) + 1;
  }
  stats.knowledge_gaps = detectKnowledgeGaps(categoryCounts);

  // Stage 8: build report + recommended priorities
  const report          = buildReport(stats);
  const next_priorities = recommendNextPriorities(stats, stubSourceIds);

  return { report, stats, next_priorities };
}

// Re-exports
export { formatReport, recommendNextPriorities } from './pipeline/report';
export type { AcquiredItem, PipelineRunStats }   from './types';
export type { SourceAdapter }                    from './adapters/interface';
export type { PersistenceAdapter }               from './pipeline/persist';
export { MockPersistenceAdapter, SupabasePersistenceAdapter } from './pipeline/persist';
export { MockVendorAdapter }                     from './adapters/mock-vendor';
export { MockCommunityAdapter }                  from './adapters/mock-community';
export {
  getConfiguredAdapters,
  getPrimaryAdapters,
  describeConfiguredSources,
  MIN_SOURCE_QUALITY,
  COMMUNITY_MAX_EVIDENCE_STRENGTH,
  COMMUNITY_MAX_CONFIDENCE,
} from './config/sources';

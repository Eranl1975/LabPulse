// Authorised source registry — only sources listed here are queried during monthly refresh.
// Priority: vendor > scientific > community (per source-policy.md).
// Replace stubs with concrete adapters as real integrations are built.

import type { SourceAdapter } from '../adapters/interface';
import type { AdapterFetchQuery, RawFetchedItem, SourceType } from '../types';
import { MockVendorAdapter }    from '../adapters/mock-vendor';
import { MockCommunityAdapter } from '../adapters/mock-community';

// Minimum composite quality score to accept an extracted item.
// Items below this threshold are logged and discarded, not stored.
export const MIN_SOURCE_QUALITY = 0.40;

// Community items are additionally capped here; they are supporting evidence only.
// Even a high-specificity community item must not be treated as primary evidence.
export const COMMUNITY_MAX_EVIDENCE_STRENGTH = 'weak' as const;
export const COMMUNITY_MAX_CONFIDENCE        = 0.50;

// --------------------------------------------------------------------------
// Stub adapter: models a source with no active integration yet.
// hasUpdates() always returns false → pipeline always skips it cleanly.
// fetch() returns [] if somehow called.
// --------------------------------------------------------------------------
class StubAdapter implements SourceAdapter {
  constructor(
    readonly source_id:    string,
    readonly source_type:  SourceType,
    readonly display_name: string,
  ) {}

  async hasUpdates(_since: string | null): Promise<boolean> {
    return false; // no integration yet — skip every time
  }

  async fetch(_query: AdapterFetchQuery): Promise<RawFetchedItem[]> {
    return [];
  }
}

// --------------------------------------------------------------------------
// Configured source list (ordered by priority within each tier).
// --------------------------------------------------------------------------
export const CONFIGURED_SOURCES: SourceAdapter[] = [
  // ── Vendor (priority 1) ─────────────────────────────────────────────────
  new MockVendorAdapter(),   // Agilent HPLC — mock live adapter

  new StubAdapter(
    'waters-ms-troubleshooting-guide',
    'vendor',
    'Waters MS Troubleshooting Guide',
  ),
  new StubAdapter(
    'thermo-lcms-troubleshooting-guide',
    'vendor',
    'Thermo Fisher LCMS Troubleshooting Guide',
  ),
  new StubAdapter(
    'shimadzu-hplc-troubleshooting-guide',
    'vendor',
    'Shimadzu HPLC Troubleshooting Guide',
  ),
  new StubAdapter(
    'sciex-ms-troubleshooting-guide',
    'vendor',
    'Sciex MS Troubleshooting Guide',
  ),
  new StubAdapter(
    'restek-gc-troubleshooting-guide',
    'vendor',
    'Restek GC Troubleshooting Guide',
  ),
  new StubAdapter(
    'perkinelmer-gc-troubleshooting-guide',
    'vendor',
    'PerkinElmer GC Troubleshooting Guide',
  ),
  new StubAdapter(
    'phenomenex-hplc-troubleshooting',
    'vendor',
    'Phenomenex HPLC Troubleshooting',
  ),
  new StubAdapter(
    'supelco-gc-column-care',
    'vendor',
    'Supelco GC Column Care Guide',
  ),

  // ── Scientific (priority 2) ─────────────────────────────────────────────
  new StubAdapter(
    'jchroma-hplc-troubleshooting-paper',
    'scientific',
    'Journal of Chromatography — HPLC Troubleshooting Review',
  ),
  new StubAdapter(
    'analytical-chemistry-lcms-review',
    'scientific',
    'Analytical Chemistry — LCMS Sensitivity Review',
  ),

  // ── Community (priority 3, supporting evidence only) ────────────────────
  new MockCommunityAdapter(),  // LCMS community forum — mock live adapter
];

// Returns all configured adapters (vendor + scientific + community).
export function getConfiguredAdapters(): SourceAdapter[] {
  return CONFIGURED_SOURCES;
}

// Returns only vendor + scientific adapters (strict mode; excludes community).
export function getPrimaryAdapters(): SourceAdapter[] {
  return CONFIGURED_SOURCES.filter(a => a.source_type !== 'community');
}

// Human-readable summary of configured sources for logs/reports.
export function describeConfiguredSources(): string[] {
  return CONFIGURED_SOURCES.map(
    a => `[${a.source_type.padEnd(10)}] ${a.source_id}`,
  );
}

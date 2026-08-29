import type { EvidenceTier, EvidenceClassification } from './types';
import { VENDOR_SOURCE_PREFIXES } from '@/agents/ranking/weights';

// ─── Evidence Tier Authority Scores ──────────────────────────────────

const TIER_AUTHORITY_SCORES: Record<EvidenceTier, number> = {
  1: 1.00,  // exact-model manufacturer docs
  2: 0.90,  // instrument-family manufacturer docs
  3: 0.85,  // regulatory standards (ICH, USP, FDA, EMA, ISO)
  4: 0.75,  // peer-reviewed publications
  5: 0.60,  // verified technical docs (app notes, tech notes)
  6: 0.45,  // general manufacturer-independent
  7: 0.30,  // AI-generated inference
};

// ─── Detection Patterns ─────────────────────────────────────────────

const REGULATORY_KEYWORDS = ['ich', 'usp', 'fda', 'ema', 'iso', 'ep-', 'ph-eur', 'pharmacop'];
const PEER_REVIEWED_KEYWORDS = ['journal', 'doi', 'publication', 'paper', 'review', 'j-anal', 'j-chrom', 'anal-chem'];
const TECH_DOC_KEYWORDS = ['app-note', 'application-note', 'tech-note', 'technical-note', 'white-paper', 'whitepaper'];
const AI_PREFIXES = ['claude-', 'ai-', 'llm-'];

/**
 * Classify a source into the 7-tier evidence hierarchy.
 * Uses source_id patterns plus vendor/model context to determine classification.
 */
export function classifySource(
  source_id: string,
  query_vendor: string | null,
  query_model: string | null,
): { tier: EvidenceTier; classification: EvidenceClassification } {
  const sid = source_id.toLowerCase();

  // Tier 7: AI-generated inference
  if (AI_PREFIXES.some(p => sid.startsWith(p))) {
    return { tier: 7, classification: 'ai-inference' };
  }

  // Check if source is from a known vendor
  const matchedVendor = VENDOR_SOURCE_PREFIXES.find(prefix => sid.startsWith(prefix));

  if (matchedVendor) {
    // Check if vendor matches query vendor
    const vendorMatchesQuery = query_vendor
      ? matchedVendor.startsWith(query_vendor.toLowerCase().replace(/\s+/g, ''))
        || query_vendor.toLowerCase().replace(/\s+/g, '').startsWith(matchedVendor)
      : false;

    if (vendorMatchesQuery) {
      // Check for model-specific match (Tier 1 vs Tier 2)
      if (query_model && hasModelMatch(sid, query_model)) {
        return { tier: 1, classification: 'exact-model' };
      }
      return { tier: 2, classification: 'instrument-family' };
    }

    // Vendor source but for a different vendor — still instrument-family tier
    // (cross-vendor validation handled separately by validateSourceForVendor)
    return { tier: 2, classification: 'instrument-family' };
  }

  // Tier 3: Regulatory standards
  if (REGULATORY_KEYWORDS.some(kw => sid.includes(kw))) {
    return { tier: 3, classification: 'regulatory-standard' };
  }

  // Tier 4: Peer-reviewed publications
  if (PEER_REVIEWED_KEYWORDS.some(kw => sid.includes(kw))) {
    return { tier: 4, classification: 'peer-reviewed' };
  }

  // Tier 5: Verified technical docs
  if (TECH_DOC_KEYWORDS.some(kw => sid.includes(kw))) {
    return { tier: 5, classification: 'verified-technical' };
  }

  // Tier 6: General manufacturer-independent
  return { tier: 6, classification: 'general-manufacturer-independent' };
}

/**
 * Convert an evidence tier to its corresponding authority score (0–1).
 */
export function tierToAuthorityScore(tier: EvidenceTier): number {
  return TIER_AUTHORITY_SCORES[tier];
}

/**
 * Validate that a source is appropriate for the queried vendor.
 * Returns false if a vendor-specific source belongs to a different vendor
 * than the one being queried (prevents cross-vendor misclassification).
 */
export function validateSourceForVendor(
  source_id: string,
  query_vendor: string | null,
): boolean {
  if (!query_vendor) return true; // no vendor filter, all sources valid

  const sid = source_id.toLowerCase();
  const matchedVendor = VENDOR_SOURCE_PREFIXES.find(prefix => sid.startsWith(prefix));

  if (!matchedVendor) return true; // not a vendor-specific source

  // Source is vendor-specific — check if it matches the query vendor
  const normalizedQuery = query_vendor.toLowerCase().replace(/\s+/g, '');
  return matchedVendor.startsWith(normalizedQuery)
    || normalizedQuery.startsWith(matchedVendor);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hasModelMatch(source_id: string, model: string): boolean {
  // Normalize: "G6170A" → "g6170a", "1290 Infinity" → "1290-infinity"
  const normalizedModel = model.toLowerCase().replace(/\s+/g, '-');
  const normalizedSid = source_id.toLowerCase();

  // Direct substring match
  if (normalizedSid.includes(normalizedModel)) return true;

  // Try without hyphens: "1290infinity"
  const compactModel = model.toLowerCase().replace(/[\s-]+/g, '');
  if (normalizedSid.replace(/-/g, '').includes(compactModel)) return true;

  // Try just the alphanumeric model number: "G6170A" from "InfinityLab Pro iQ Plus (G6170A)"
  const modelNumbers = model.match(/[A-Z]?\d{3,}[A-Z]?/gi);
  if (modelNumbers) {
    return modelNumbers.some(mn => normalizedSid.includes(mn.toLowerCase()));
  }

  return false;
}

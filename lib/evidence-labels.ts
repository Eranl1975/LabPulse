// Maps evidence onto the four user-facing labels. Built on the 7 tiers of
// lib/evidence-hierarchy.ts; the label never upgrades a source past what its
// tier and provenance support. In particular, nothing becomes OFFICIAL
// MANUFACTURER GUIDANCE without a real manufacturer document or URL, and AI
// output (tier 7) is never presented as a manufacturer instruction.

import type { ActionDetail, ContentSource, EvidenceSummaryV2, EvidenceTier, GenerationStatus } from './types';
import type { EvidenceLabel } from './visual-types';

export const EVIDENCE_LABELS: readonly EvidenceLabel[] = [
  'OFFICIAL MANUFACTURER GUIDANCE',
  'LABPULSE INTERNAL KNOWLEDGE',
  'TECHNICAL / SCIENTIFIC SOURCE',
  'AI-GENERATED RECOMMENDATION',
];

const AI_SOURCE_PREFIXES = ['claude-', 'ai-', 'llm-'];

function isHttpUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url.trim());
}

/**
 * Label from a tier plus the two facts the tier alone does not carry: whether
 * a real document/URL backs it, and whether it came from inside LabPulse.
 */
export function labelForTier(
  tier: EvidenceTier,
  opts: { hasDocumentOrUrl: boolean; internal: boolean },
): EvidenceLabel {
  if (tier === 7) return 'AI-GENERATED RECOMMENDATION';
  if ((tier === 1 || tier === 2) && opts.hasDocumentOrUrl) return 'OFFICIAL MANUFACTURER GUIDANCE';
  if (opts.internal) return 'LABPULSE INTERNAL KNOWLEDGE';
  if (tier >= 3 && tier <= 5) return 'TECHNICAL / SCIENTIFIC SOURCE';
  // Tier 1–2 without a document, or tier 6, reaching here came from outside
  // LabPulse (e.g. a web page): treat as a technical source, never official.
  return 'TECHNICAL / SCIENTIFIC SOURCE';
}

/** Label for one cited source in an answer (KB item, ingested document, AI, web page). */
export function labelForSource(source: EvidenceSummaryV2): EvidenceLabel {
  const sid = source.source_id.toLowerCase();
  if (source.classification === 'ai-inference' || AI_SOURCE_PREFIXES.some(p => sid.startsWith(p))) {
    return 'AI-GENERATED RECOMMENDATION';
  }
  const meta = source.source_metadata;
  const tier: EvidenceTier = meta?.tier ?? tierFromClassification(source.classification);
  const isWeb = sid.startsWith('web:');
  return labelForTier(tier, {
    hasDocumentOrUrl: isHttpUrl(meta?.url) || !!meta?.doc_number,
    internal: !isWeb,
  });
}

function tierFromClassification(c: EvidenceSummaryV2['classification']): EvidenceTier {
  switch (c) {
    case 'exact-model': return 1;
    case 'instrument-family': return 2;
    case 'regulatory-standard': return 3;
    case 'peer-reviewed': return 4;
    case 'verified-technical': return 5;
    case 'general-manufacturer-independent': return 6;
    default: return 7;
  }
}

/** Label for the ranked recommendations as a whole, from how the pipeline produced them. */
export function labelForContentSource(source: ContentSource | undefined): EvidenceLabel {
  return source === 'ai' ? 'AI-GENERATED RECOMMENDATION' : 'LABPULSE INTERNAL KNOWLEDGE';
}

export function labelForGeneration(generation: GenerationStatus | undefined): EvidenceLabel {
  return labelForContentSource(generation?.content_source);
}

/**
 * Label for one corrective action. An AI answer's action is AI-generated even
 * when its evidence_source names a manual: the model wrote the step, and the
 * manual has not been verified to contain it.
 */
export function labelForAction(action: ActionDetail, generation: GenerationStatus | undefined): EvidenceLabel {
  if (generation?.content_source === 'ai') return 'AI-GENERATED RECOMMENDATION';
  const src = action.evidence_source.toLowerCase();
  if (/\btier\s*7\b|ai-inference|ai-generated/.test(src)) return 'AI-GENERATED RECOMMENDATION';
  return 'LABPULSE INTERNAL KNOWLEDGE';
}

/** Short badge colours shared by the web UI, PDF and email. */
export const LABEL_COLOURS: Record<EvidenceLabel, { fg: string; bg: string; border: string }> = {
  'OFFICIAL MANUFACTURER GUIDANCE': { fg: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' },
  'LABPULSE INTERNAL KNOWLEDGE':    { fg: '#0f766e', bg: '#f0fdfa', border: '#5eead4' },
  'TECHNICAL / SCIENTIFIC SOURCE':  { fg: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  'AI-GENERATED RECOMMENDATION':    { fg: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
};

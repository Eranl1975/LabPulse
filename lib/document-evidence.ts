// Bridges document search hits into the answer's evidence structures and into
// the grounding context handed to the AI layer.

import type { DocumentHit } from './document-types';
import type {
  EvidenceSummaryV2, EvidenceClassification, EvidenceStrength,
  EvidenceTier, RankedAnswerV2,
} from './types';

const TIER_CLASSIFICATION: Record<EvidenceTier, EvidenceClassification> = {
  1: 'exact-model',
  2: 'instrument-family',
  3: 'regulatory-standard',
  4: 'peer-reviewed',
  5: 'verified-technical',
  6: 'general-manufacturer-independent',
  7: 'ai-inference',
};

/** Vendor documentation is strong evidence; notes and articles are moderate. */
function strengthForTier(tier: EvidenceTier): EvidenceStrength {
  if (tier <= 2) return 'strong';
  if (tier <= 5) return 'moderate';
  return 'weak';
}

/** Human-readable location for a citation, e.g. "p. 42 — ESI Source Cleaning". */
export function describeLocation(hit: DocumentHit): string | null {
  const parts: string[] = [];
  if (hit.page_number !== null) parts.push(`p. ${hit.page_number}`);
  if (hit.heading) parts.push(hit.heading);
  return parts.length > 0 ? parts.join(' — ') : null;
}

export function hitToEvidence(hit: DocumentHit): EvidenceSummaryV2 {
  const classification = TIER_CLASSIFICATION[hit.tier];
  return {
    source_id: hit.document_id,
    excerpt: hit.excerpt,
    evidence_strength: strengthForTier(hit.tier),
    classification,
    source_metadata: {
      title: hit.title,
      manufacturer_or_org: hit.vendor,
      doc_number: hit.document_number,
      pub_date: hit.publication_date,
      url: hit.url,
      page_or_section: describeLocation(hit),
      classification,
      tier: hit.tier,
    },
  };
}

/**
 * Merge document hits into an answer's evidence lists.
 * Existing evidence is kept; document evidence is inserted ahead of anything of
 * a weaker tier so exact-model manuals outrank AI inference in the rendered answer.
 */
export function mergeDocumentEvidence(
  answer: RankedAnswerV2,
  hits: DocumentHit[],
): { answer: RankedAnswerV2; added: number } {
  if (hits.length === 0) return { answer, added: 0 };

  const existingIds = new Set(answer.sources_with_metadata.map(s => s.source_id));
  const fresh = hits.filter(h => !existingIds.has(h.document_id)).map(hitToEvidence);
  if (fresh.length === 0) return { answer, added: 0 };

  const tierOf = (e: EvidenceSummaryV2): number => e.source_metadata?.tier ?? 6;

  const sources_with_metadata = [...answer.sources_with_metadata, ...fresh]
    .sort((a, b) => tierOf(a) - tierOf(b));

  const evidence_summary = [
    ...answer.evidence_summary,
    ...fresh.map(e => ({
      source_id: e.source_id,
      excerpt: e.excerpt,
      evidence_strength: e.evidence_strength,
    })),
  ];

  return {
    answer: { ...answer, sources_with_metadata, evidence_summary },
    added: fresh.length,
  };
}

/**
 * Render hits as grounding text for the AI layer, so cited documents are real.
 * Each block carries the exact citation the model must reuse.
 */
export function buildGroundingContext(hits: DocumentHit[], maxChars = 6000): string {
  if (hits.length === 0) return '';

  const blocks: string[] = [];
  let used = 0;

  for (const [i, hit] of hits.entries()) {
    const location = describeLocation(hit);
    const header = [
      `[DOC ${i + 1}] ${hit.title}`,
      `vendor: ${hit.vendor}`,
      `tier: ${hit.tier} (${TIER_CLASSIFICATION[hit.tier]})`,
      hit.document_number ? `document number: ${hit.document_number}` : null,
      location ? `location: ${location}` : null,
      `url: ${hit.url}`,
    ].filter(Boolean).join(' | ');

    const block = `${header}\n${hit.excerpt}`;
    if (used + block.length > maxChars) break;
    blocks.push(block);
    used += block.length;
  }

  if (blocks.length === 0) return '';

  return [
    'RETRIEVED VENDOR DOCUMENTATION — cite these by their exact title, document number and location.',
    'Do not invent any other document reference. Anything you assert that is not supported by',
    'one of these blocks must be labelled tier 7 (AI-generated inference).',
    '',
    blocks.join('\n\n'),
  ].join('\n');
}

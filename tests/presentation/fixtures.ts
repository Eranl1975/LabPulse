import type { RankedAnswer } from '@/lib/types';

// High-confidence answer derived from seed-001 (HPLC retention time shift)
export const highConfidenceAnswer: RankedAnswer = {
  problem_summary: 'Retention times shifted earlier than expected',
  likely_causes: ['column degradation', 'mobile phase composition change', 'temperature fluctuation'],
  checks: ['check column age and void volume', 'verify mobile phase batch', 'check column oven temperature log'],
  corrective_actions: ['replace column', 'prepare fresh mobile phase', 'recalibrate column oven'],
  stop_conditions: ['shift > 10% of expected RT', 'multiple analytes affected simultaneously'],
  confidence: 0.85,
  evidence_summary: [
    {
      source_id: 'agilent-hplc-troubleshooting-guide',
      excerpt: 'Retention times shifted earlier than expected',
      evidence_strength: 'strong',
    },
  ],
  uncertainties: [],
  next_questions: ['verify mobile phase batch'],
};

// Low-confidence answer: no matching items
export const noEvidenceAnswer: RankedAnswer = {
  problem_summary: 'Unknown instrument issue',
  likely_causes: [],
  checks: [],
  corrective_actions: [],
  stop_conditions: [],
  confidence: 0,
  evidence_summary: [],
  uncertainties: ['No matching knowledge items found for this technique and issue.'],
  next_questions: ['Is the technique selection correct?'],
};

// Answer with contradicting evidence
export const conflictingAnswer: RankedAnswer = {
  ...highConfidenceAnswer,
  confidence: 0.55,
  uncertainties: [
    'Conflicting causes for "retention time shift": source-a vs source-b. Verify both sources.',
  ],
};

// Answer derived from seed-002 (LCMS source contamination) with high severity
export const highSeverityAnswer: RankedAnswer = {
  problem_summary: 'Gradual loss of sensitivity over multiple injections',
  likely_causes: ['matrix buildup on source', 'dirty spray shield', 'blocked capillary'],
  checks: ['inspect spray shield visually', 'run solvent blank and compare background', 'check capillary condition'],
  corrective_actions: ['clean source components', 'replace spray shield', 'flush capillary with strong solvent'],
  stop_conditions: ['sensitivity loss > 50%', 'source cleaning does not restore signal'],
  confidence: 0.90,
  evidence_summary: [
    {
      source_id: 'waters-ms-source-maintenance',
      excerpt: 'Gradual loss of sensitivity over multiple injections',
      evidence_strength: 'strong',
    },
  ],
  uncertainties: [],
  next_questions: [],
};

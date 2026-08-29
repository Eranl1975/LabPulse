import type { RankedAnswerV2, EvidenceSummaryV2 } from './types';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import { getCapability, validateRecommendation } from './instrument-capabilities';
import { validateSourceForVendor } from './evidence-hierarchy';

export interface QCFailure {
  check: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface QualityCheckResult {
  passed: boolean;
  failures: QCFailure[];
  action: 'pass' | 'downgrade' | 'regenerate';
  /** The maximum confidence the answer should have based on QC failures. */
  recommended_confidence: number | null;
}

/**
 * Run all automated quality checks on a troubleshooting answer before display/email.
 */
export function runQualityChecks(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
): QualityCheckResult {
  const failures: QCFailure[] = [];

  checkDuplicates(answer, failures);
  checkUnsupportedConfidence(answer, failures);
  checkMissingCitations(answer, failures);
  checkCrossVendorMisclassification(answer, query, failures);
  checkIncompatibleRecommendations(answer, query, failures);
  checkSymptomCauseConfusion(answer, query, failures);
  checkPrematureCorrectiveActions(answer, failures);
  checkSectionContradictions(answer, failures);

  const errors = failures.filter(f => f.severity === 'error');
  const passed = errors.length === 0;

  let action: QualityCheckResult['action'] = 'pass';
  if (errors.length >= 3) {
    action = 'regenerate';
  } else if (errors.length > 0) {
    action = 'downgrade';
  }

  // Compute recommended confidence from cap-related failures
  let recommended_confidence: number | null = null;
  for (const f of errors) {
    const capMatch = f.message.match(/max (\d+)% allowed/);
    if (capMatch) {
      const cap = parseInt(capMatch[1], 10) / 100;
      recommended_confidence = recommended_confidence === null
        ? cap
        : Math.min(recommended_confidence, cap);
    }
  }

  return { passed, failures, action, recommended_confidence };
}

// ─── Individual Checks ──────────────────────────────────────────────

function checkDuplicates(answer: RankedAnswerV2, failures: QCFailure[]): void {
  const allSections = [
    { name: 'likely_causes', items: answer.likely_causes },
    { name: 'checks', items: answer.checks },
    { name: 'corrective_actions', items: answer.corrective_actions },
  ];

  for (const section of allSections) {
    const seen = new Set<string>();
    for (const item of section.items) {
      const normalized = item.toLowerCase().trim();
      if (seen.has(normalized)) {
        failures.push({
          check: 'duplicate_detection',
          severity: 'warning',
          message: `Duplicate item in ${section.name}: "${item.substring(0, 80)}..."`,
        });
      }
      seen.add(normalized);
    }
  }
}

function checkUnsupportedConfidence(answer: RankedAnswerV2, failures: QCFailure[]): void {
  const confidence = answer.confidence_breakdown?.final_score ?? answer.confidence;

  // >70% without exact-model source
  if (confidence > 0.70) {
    const hasExactModel = answer.sources_with_metadata?.some(
      s => s.classification === 'exact-model'
    );
    if (!hasExactModel) {
      failures.push({
        check: 'unsupported_confidence',
        severity: 'error',
        message: `Confidence ${(confidence * 100).toFixed(0)}% without exact-model source evidence (max 70% allowed)`,
      });
    }
  }

  // >60% with missing critical info
  if (confidence > 0.60 && answer.missing_information?.critical_missing?.length > 0) {
    failures.push({
      check: 'unsupported_confidence',
      severity: 'error',
      message: `Confidence ${(confidence * 100).toFixed(0)}% with ${answer.missing_information.critical_missing.length} critical fields missing (max 60% allowed)`,
    });
  }
}

function checkMissingCitations(answer: RankedAnswerV2, failures: QCFailure[]): void {
  const sourceIds = new Set(
    (answer.evidence_summary ?? []).map(s => s.source_id)
  );

  if (answer.likely_causes.length > 0 && sourceIds.size === 0) {
    failures.push({
      check: 'missing_citations',
      severity: 'error',
      message: 'Likely causes listed without any supporting source citations',
    });
  }
}

function checkCrossVendorMisclassification(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
  failures: QCFailure[],
): void {
  if (!query.vendor) return;

  const sources = answer.sources_with_metadata ?? [];
  for (const src of sources) {
    if (src.classification === 'exact-model' || src.classification === 'instrument-family') {
      if (!validateSourceForVendor(src.source_id, query.vendor)) {
        failures.push({
          check: 'cross_vendor_misclassification',
          severity: 'error',
          message: `Source "${src.source_id}" classified as ${src.classification} but belongs to a different vendor than "${query.vendor}"`,
        });
      }
    }
  }
}

function checkIncompatibleRecommendations(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
  failures: QCFailure[],
): void {
  const capability = getCapability(query.vendor, query.model);
  if (!capability) return;

  const allRecs = [
    ...answer.likely_causes,
    ...answer.corrective_actions,
    ...answer.checks,
  ];

  for (const rec of allRecs) {
    const result = validateRecommendation(rec, capability);
    if (!result.valid) {
      failures.push({
        check: 'incompatible_recommendation',
        severity: 'error',
        message: result.reason!,
      });
    }
  }
}

function checkSymptomCauseConfusion(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
  failures: QCFailure[],
): void {
  const symptomWords = getSignificantWords(query.symptom_description);
  if (symptomWords.size < 3) return;

  for (const cause of answer.likely_causes) {
    const causeWords = getSignificantWords(cause);
    const overlap = intersection(symptomWords, causeWords);
    const similarity = overlap / Math.max(symptomWords.size, causeWords.size);

    if (similarity > 0.8) {
      failures.push({
        check: 'symptom_cause_confusion',
        severity: 'warning',
        message: `Likely cause appears to restate the symptom: "${cause.substring(0, 80)}..."`,
      });
    }
  }
}

function checkPrematureCorrectiveActions(
  answer: RankedAnswerV2,
  failures: QCFailure[],
): void {
  // Corrective actions present but no diagnostic checks
  if (answer.corrective_actions.length > 0 && answer.checks.length === 0) {
    failures.push({
      check: 'premature_corrective_actions',
      severity: 'warning',
      message: 'Corrective actions recommended without preceding diagnostic checks',
    });
  }

  // Hypotheses all "suspected" but corrective actions treat them as confirmed
  const hypotheses = answer.hypotheses ?? [];
  if (hypotheses.length > 0 && hypotheses.every(h => h.status === 'suspected')) {
    const confirmWords = ['replace', 'install', 'order', 'send for service'];
    for (const action of answer.corrective_actions) {
      const lower = action.toLowerCase();
      if (confirmWords.some(w => lower.includes(w))) {
        failures.push({
          check: 'premature_corrective_actions',
          severity: 'warning',
          message: `Corrective action "${action.substring(0, 60)}..." suggests definitive action while all hypotheses are still "suspected"`,
        });
        break; // one warning is enough
      }
    }
  }
}

function checkSectionContradictions(
  answer: RankedAnswerV2,
  failures: QCFailure[],
): void {
  // Check if escalation criteria conflict with corrective actions
  // e.g., escalation says "contact service" but action says "user-serviceable"
  const escalation = answer.escalation_criteria ?? answer.stop_conditions;
  if (escalation.length === 0 || answer.corrective_actions.length === 0) return;

  const escalationText = escalation.join(' ').toLowerCase();
  const actionsText = answer.corrective_actions.join(' ').toLowerCase();

  // Simple contradiction: escalation mentions "do not attempt" but actions say "replace"
  if (
    escalationText.includes('do not attempt') &&
    (actionsText.includes('replace') || actionsText.includes('disassemble'))
  ) {
    failures.push({
      check: 'section_contradictions',
      severity: 'warning',
      message: 'Escalation criteria warns against user intervention, but corrective actions suggest hardware replacement/disassembly',
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getSignificantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
}

function intersection(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const word of a) {
    if (b.has(word)) count++;
  }
  return count;
}

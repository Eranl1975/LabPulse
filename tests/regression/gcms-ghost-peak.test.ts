/**
 * Regression: the 2026-09-28 GC ghost-peak query.
 *
 * A GC-MS user reported a peak at the start of every run, visible in both the
 * FID trace and the TIC, whose mass spectrum showed CO₂ and argon. The report
 * that came back had three defects:
 *
 *   1. no mass-spectral checks at all, because the knowledge base is keyed on
 *      technique and the user had selected "GC";
 *   2. four separate ranked hypotheses with byte-identical evidence, diagnostic
 *      test and expected result, because every cause of one knowledge item
 *      became its own entry;
 *   3. a standard report padded with per-action verification filler and a
 *      checklist that repeated sections 5 and 6 verbatim.
 */
import { describe, it, expect } from 'vitest';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import { formatStandard } from '@/agents/presentation/index';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { RankedAnswerV2 } from '@/lib/types';

const query: RankingQueryV2 = {
  technique: 'GC',
  vendor: 'Agilent',
  model: '7890B',
  issue_category: null,
  symptom_description:
    'A peak that appear at the start of the FID in all the runs with mass of CO2 and Ar, seen in the TIC too. ghost peaks',
  method_conditions: '3mL/min, constant flow 180C 40C(3min)-->15',
  already_checked: [],
};

async function run(overrides: Partial<RankingQueryV2> = {}) {
  return runTroubleshootingPipeline(
    { ...query, ...overrides },
    { hasAIKey: false, useDocuments: false },
  );
}

describe('GC-MS ghost peak regression', () => {
  it('returns mass-spectral checks even though the technique is GC', async () => {
    const { answer } = await run();

    const ms = answer.detector_checks?.find(b => b.detector === 'ms');
    expect(ms, 'no mass-spectral check block was produced').toBeDefined();
    expect(ms!.checks.length).toBeGreaterThan(3);
  });

  it('tells the user to identify the ions and gives the air-ingress ion set', async () => {
    const { answer } = await run();
    const ms = answer.detector_checks!.find(b => b.detector === 'ms')!;
    const text = ms.checks.join(' ');

    expect(text).toMatch(/background-subtract/i);
    const ions = (ms.ion_reference ?? []).map(r => `${r.ions} — ${r.meaning}`).join('\n');
    expect(ions).toMatch(/m\/z 28 and 32/);
    expect(ions).toMatch(/argon/i);
    expect(ions).toMatch(/207, 281, 355/);
  });

  it('gives the FID-versus-TIC test that localises where the peak entered', async () => {
    const { answer } = await run();
    const text = answer.checks.join('\n');
    expect(text).toMatch(/FID/);
    expect(text).toMatch(/TIC ONLY/);
  });

  it('does not repeat the same diagnostic test across ranked causes', async () => {
    const { answer } = await run();
    const tests = answer.hypotheses.map(h => h.diagnostic_test.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    expect(new Set(tests).size).toBe(tests.length);
  });

  it('keeps every candidate cause when it clusters them', async () => {
    const { answer } = await run();
    const causeCount = answer.hypotheses.reduce(
      (n, h) => n + Math.max(1, h.grouped_causes?.length ?? 1), 0,
    );
    expect(causeCount).toBeGreaterThanOrEqual(4);
    // A clustered entry names all of its causes rather than hiding them.
    for (const h of answer.hypotheses) {
      if (h.grouped_causes) {
        expect(h.grouped_causes.length).toBeGreaterThan(1);
        expect(h.grouped_causes).toContain(h.cause);
      }
    }
  });

  it('renders the detector section in the standard report', async () => {
    const { answer } = await run();
    const { text } = formatStandard(answer as RankedAnswerV2);

    expect(text).toContain('## 5b. Detector-Specific Checks');
    expect(text).toContain('Mass spectrometer (MS / TIC)');
    expect(text).toMatch(/Reference ion sets/);
  });

  it('drops the per-action verification filler and the duplicated checklist', async () => {
    const { answer } = await run();
    const { text } = formatStandard(answer as RankedAnswerV2);

    expect(text).not.toMatch(/verify the symptom is resolved and system performance is within specification/);
    expect(text).not.toMatch(/If this cause is correct, the diagnostic should confirm the issue/);
    // Section 11 points at the printable copy instead of repeating sections 5 and 6.
    expect(text).toMatch(/## 11\. Checklist/);
    expect(text).not.toMatch(/☐ Check 1:/);
  });

  it('still names the inlet and septum causes the knowledge base contributed', async () => {
    const { answer } = await run();
    const causes = answer.hypotheses
      .flatMap(h => h.grouped_causes ?? [h.cause])
      .join(' ')
      .toLowerCase();
    expect(causes).toMatch(/liner|septum|bleed|contamina/);
  });

  it('adds the FID block too, since the peak was seen in the FID', async () => {
    const { answer } = await run();
    expect((answer.detector_checks ?? []).map(b => b.detector)).toContain('fid');
  });

  it('does not attach detector checks to a technique that has no detector clue', async () => {
    const { answer } = await run({
      technique: 'XRD',
      symptom_description: 'peak shift in 2theta between runs',
      method_conditions: null,
    });
    expect(answer.detector_checks ?? []).toHaveLength(0);
  });
});

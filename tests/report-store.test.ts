/**
 * Report history (localStorage) after v8.1: each report keeps its analysis so it
 * can be reopened in either format, legacy entries still load, and a full
 * browser store never loses the reports themselves.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addReport, getReports, saveReports, snapshotAnswer, updateReportFormat, updateReportStatus, MAX_SAVED_ANALYSES,
} from '@/lib/reportStore';
import { buildQuickSummary } from '@/lib/quick-summary';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import type { LabReport, RankedAnswerV2 } from '@/lib/types';

class FakeStorage {
  data = new Map<string, string>();
  quota = Infinity;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) {
    if (v.length > this.quota) throw new DOMException('quota', 'QuotaExceededError');
    this.data.set(k, v);
  }
  removeItem(k: string) { this.data.delete(k); }
}

let store: FakeStorage;
beforeEach(() => {
  store = new FakeStorage();
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = store;
});
afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
});

function base(id: string, extra: Partial<LabReport> = {}): LabReport {
  return {
    id, created_at: '2026-10-21T10:00:00Z', technique: 'HPLC', vendor: null, model: null, issue_category: null,
    symptom_description: 'Pressure fluctuates', confidence: 0.3, ai_assisted: false, status: 'pending',
    resolution_note: null, resolved_at: null, ...extra,
  };
}

async function sampleAnswer(): Promise<RankedAnswerV2> {
  const { answer } = await runTroubleshootingPipeline({
    technique: 'HPLC', vendor: null, model: null, issue_category: 'pressure',
    symptom_description: 'System pressure fluctuates by +/- 40 bar', method_conditions: null, already_checked: [],
  }, { hasAIKey: false, useDocuments: false });
  return answer;
}

describe('report history', () => {
  it('stores the analysis with the report, so both formats reopen from the same report id', async () => {
    const answer = await sampleAnswer();
    addReport(base('r1', { answer: snapshotAnswer(answer), response_format: 'summary' }));
    const saved = getReports()[0];
    expect(saved.id).toBe('r1');
    expect(saved.response_format).toBe('summary');
    expect(buildQuickSummary(saved.answer!)).toEqual(buildQuickSummary(answer));

    updateReportFormat('r1', 'detailed');
    expect(getReports()[0].response_format).toBe('detailed');
    expect(getReports()[0].answer).toBeTruthy();
  });

  it('still loads reports saved before v8.1 (no analysis, no format)', () => {
    store.setItem('LABPULSE_REPORTS', JSON.stringify([base('old')]));
    const [old] = getReports();
    expect(old.answer).toBeUndefined();
    updateReportStatus('old', 'resolved', 'fixed');
    expect(getReports()[0]).toMatchObject({ id: 'old', status: 'resolved', resolution_note: 'fixed' });
  });

  it('drops image thumbnails from the stored analysis but keeps the findings', async () => {
    const answer = await sampleAnswer();
    const withMedia: RankedAnswerV2 = {
      ...answer,
      visual_findings: {
        media: [{ kind: 'photo', label: 'Photo 1', thumbnail: 'data:image/jpeg;base64,' + 'A'.repeat(50_000), storage_path: 'u/1.jpg' }],
        user_description: 'leak', analysis: null, safety_first: ['Unplug first.'], internal_references: [], web_sources: [],
        status: { vision_status: 'ok', vision_error_code: null, vision_reason: null, vision_model: null, web_status: 'ok', web_reason: null, web_queries: [], partial: false, notices: [] },
        recommendations_label: 'LABPULSE INTERNAL KNOWLEDGE',
      },
    };
    const snap = snapshotAnswer(withMedia);
    expect(snap.visual_findings!.media[0]).toMatchObject({ label: 'Photo 1', thumbnail: null, storage_path: 'u/1.jpg' });
    expect(snap.visual_findings!.safety_first).toEqual(['Unplug first.']);
    expect(withMedia.visual_findings!.media[0].thumbnail).toBeTruthy(); // original untouched
  });

  it(`keeps the analysis for the newest ${MAX_SAVED_ANALYSES} reports only`, async () => {
    const answer = snapshotAnswer(await sampleAnswer());
    for (let i = 0; i < MAX_SAVED_ANALYSES + 3; i++) addReport(base(`r${i}`, { answer }));
    const reports = getReports();
    expect(reports).toHaveLength(MAX_SAVED_ANALYSES + 3);
    expect(reports.filter(r => r.answer).length).toBe(MAX_SAVED_ANALYSES);
    expect(reports[0].answer).toBeTruthy();
    expect(reports[reports.length - 1].answer).toBeNull();
  });

  it('when storage is full, drops the oldest analyses but never a report', async () => {
    const answer = snapshotAnswer(await sampleAnswer());
    const size = JSON.stringify(answer).length;
    const reports = [0, 1, 2, 3].map(i => base(`r${i}`, { answer }));
    store.quota = size * 2.5; // room for two analyses
    expect(saveReports(reports)).toBe(true);
    const saved = getReports();
    expect(saved.map(r => r.id)).toEqual(['r0', 'r1', 'r2', 'r3']);
    expect(saved.map(r => !!r.answer)).toEqual([true, true, false, false]);
  });

  it('never throws when nothing fits', () => {
    store.quota = 10;
    expect(() => addReport(base('x'))).not.toThrow();
  });
});

import type { LabReport, ReportStatus, AnalyticsSummary, RankedAnswerV2 } from './types';

const KEY = 'LABPULSE_REPORTS';

/** Reports that keep their full analysis; older ones keep their metadata only. */
export const MAX_SAVED_ANALYSES = 30;

export function getReports(): LabReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LabReport[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save, never throwing. Saved analyses are the large part of the history, so
 * when storage is full they are dropped from the oldest reports first; the
 * reports themselves (status, notes, confidence) are always kept.
 */
export function saveReports(reports: LabReport[]): boolean {
  if (typeof window === 'undefined') return false;
  let list = reports;
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch {
      const last = list.map(r => !!r.answer).lastIndexOf(true);
      if (last === -1) return false;
      list = list.map((r, i) => (i === last ? { ...r, answer: null } : r));
    }
  }
}

/**
 * The analysis as stored with a report: image thumbnails (data URLs of up to
 * ~60 KB each) are left out to keep the history small. Everything the Quick
 * Summary and the Detailed Analysis read is kept.
 */
export function snapshotAnswer(answer: RankedAnswerV2): RankedAnswerV2 {
  if (!answer.visual_findings) return answer;
  return {
    ...answer,
    visual_findings: {
      ...answer.visual_findings,
      media: answer.visual_findings.media.map(m => ({ ...m, thumbnail: null })),
    },
  };
}

export function addReport(report: LabReport): void {
  const reports = getReports();
  reports.unshift(report);
  saveReports(reports.map((r, i) => (i >= MAX_SAVED_ANALYSES && r.answer ? { ...r, answer: null } : r)));
}

/** Remember which view a report was last shown in. */
export function updateReportFormat(id: string, format: 'summary' | 'detailed'): void {
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1 || reports[idx].response_format === format) return;
  reports[idx] = { ...reports[idx], response_format: format };
  saveReports(reports);
}

export function updateReportStatus(id: string, status: ReportStatus, note?: string): void {
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1) return;
  reports[idx] = {
    ...reports[idx],
    status,
    resolution_note: note ?? null,
    resolved_at: status !== 'pending' ? new Date().toISOString() : null,
  };
  saveReports(reports);
}

export function getAnalyticsSummary(reports: LabReport[]): AnalyticsSummary {
  const total = reports.length;
  const resolved     = reports.filter(r => r.status === 'resolved').length;
  const partially    = reports.filter(r => r.status === 'partially').length;
  const not_resolved = reports.filter(r => r.status === 'not_resolved').length;
  const pending      = reports.filter(r => r.status === 'pending').length;
  const avg_confidence = total > 0
    ? reports.reduce((s, r) => s + r.confidence, 0) / total
    : 0;
  const ai_assisted_count = reports.filter(r => r.ai_assisted).length;

  const by_technique: Record<string, number> = {};
  for (const r of reports) {
    by_technique[r.technique] = (by_technique[r.technique] ?? 0) + 1;
  }

  const by_day: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    by_day.push({
      date: dateStr,
      count: reports.filter(r => r.created_at.startsWith(dateStr)).length,
    });
  }

  return { total, resolved, partially, not_resolved, pending, avg_confidence, ai_assisted_count, by_technique, by_day };
}

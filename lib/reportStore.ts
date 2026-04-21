import type { LabReport, ReportStatus, AnalyticsSummary } from './types';

const KEY = 'LABPULSE_REPORTS';

export function getReports(): LabReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LabReport[]) : [];
  } catch {
    return [];
  }
}

export function saveReports(reports: LabReport[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(reports));
}

export function addReport(report: LabReport): void {
  const reports = getReports();
  reports.unshift(report);
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

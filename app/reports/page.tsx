'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LabReport, ReportStatus, AnalyticsSummary } from '@/lib/types';
import { getReports, getAnalyticsSummary } from '@/lib/reportStore';
import ReportModal from '@/components/ReportModal';

// ── PDF export ────────────────────────────────────────────────────────────────

function exportPDF(report: LabReport) {
  const STATUS_LABEL: Record<ReportStatus, string> = {
    resolved: 'Resolved', partially: 'Partially Resolved',
    not_resolved: 'Not Resolved', pending: 'Pending',
  };
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>LabPulse — ${report.technique} — ${report.created_at.slice(0,10)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:40px auto;padding:0 24px;color:#0f172a}
  h1{font-size:22px;color:#14b8a6;margin:0 0 4px}
  .sub{color:#64748b;font-size:13px;margin:0 0 28px}
  table{width:100%;border-collapse:collapse}
  td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;vertical-align:top}
  td:first-child{font-weight:600;color:#64748b;width:160px;white-space:nowrap}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .resolved{background:#dcfce7;color:#16a34a}
  .partially{background:#ffedd5;color:#ea580c}
  .not_resolved{background:#fee2e2;color:#dc2626}
  .pending{background:#f1f5f9;color:#64748b}
  .btn{margin-top:24px;padding:8px 20px;background:#0f172a;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer}
  @media print{.btn{display:none}}
</style></head><body>
<h1>LabPulse Troubleshooting Report</h1>
<p class="sub">Generated ${new Date().toLocaleString()}</p>
<table>
<tr><td>Date</td><td>${new Date(report.created_at).toLocaleString()}</td></tr>
<tr><td>Technique</td><td>${report.technique}</td></tr>
${report.vendor ? `<tr><td>Vendor</td><td>${report.vendor}</td></tr>` : ''}
${report.model ? `<tr><td>Model</td><td>${report.model}</td></tr>` : ''}
${report.issue_category ? `<tr><td>Issue Type</td><td>${report.issue_category}</td></tr>` : ''}
<tr><td>Problem</td><td>${report.symptom_description.replace(/\n/g,'<br>')}</td></tr>
<tr><td>Confidence</td><td>${Math.round(report.confidence * 100)}%</td></tr>
<tr><td>AI Assisted</td><td>${report.ai_assisted ? 'Yes (Claude)' : 'No (rule-based)'}</td></tr>
<tr><td>Status</td><td><span class="badge ${report.status}">${STATUS_LABEL[report.status]}</span></td></tr>
${report.resolution_note ? `<tr><td>Resolution Note</td><td>${report.resolution_note.replace(/\n/g,'<br>')}</td></tr>` : ''}
${report.resolved_at ? `<tr><td>Resolved At</td><td>${new Date(report.resolved_at).toLocaleString()}</td></tr>` : ''}
</table>
<button class="btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// ── SVG Charts ────────────────────────────────────────────────────────────────

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'140px',color:'var(--color-slate-300)',fontSize:'0.875rem' }}>
      No data yet
    </div>
  );

  const cx = 70, cy = 70, R = 56, r = 34;
  const segs: { d: string; color: string }[] = [];
  let angle = -Math.PI / 2;

  for (const slice of data) {
    if (slice.value === 0) continue;
    const a = (slice.value / total) * 2 * Math.PI;
    // Draw full circle as two half-arcs when a ≥ 2π
    const arcs = a >= 2 * Math.PI - 0.001 ? [Math.PI, Math.PI] : [a];
    let start = angle;
    for (const arc of arcs) {
      const end = start + arc;
      const x1  = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      const x2  = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
      const ix1 = cx + r * Math.cos(end),   iy1 = cy + r * Math.sin(end);
      const ix2 = cx + r * Math.cos(start), iy2 = cy + r * Math.sin(start);
      const lg  = arc > Math.PI ? 1 : 0;
      segs.push({ d: `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${ix1},${iy1} A${r},${r},0,${lg},0,${ix2},${iy2}Z`, color: slice.color });
      start = end;
    }
    angle += a;
  }

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {segs.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
      <text x={cx} y={cy - 6} textAnchor="middle" fontWeight="800" fontSize="20" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
    </svg>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  if (data.length === 0) return (
    <div style={{ height:'100px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-slate-300)',fontSize:'0.875rem' }}>
      No data yet
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 280, H = 100, bw = Math.min(36, (W - 16) / data.length - 8), gap = (W - data.length * bw) / (data.length + 1);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',maxWidth:`${W}px` }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * 72, d.value > 0 ? 4 : 0);
        const x    = gap + i * (bw + gap);
        return (
          <g key={d.label}>
            <rect x={x} y={H - 22 - barH} width={bw} height={barH}
              fill={d.color ?? '#14b8a6'} rx={3} />
            {d.value > 0 && (
              <text x={x + bw / 2} y={H - 26 - barH} textAnchor="middle"
                fontSize="11" fontWeight="700" fill="#0f172a">{d.value}</text>
            )}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle"
              fontSize="9" fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 280, H = 88, pH = 16, pV = 12;
  const IW = W - pH * 2, IH = H - pV * 2;
  const pts = data.map((d, i) => ({
    x: pH + (i / (data.length - 1)) * IW,
    y: pV + (1 - d.count / max) * IH,
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${H - pV} L${pts[0].x},${H - pV}Z`;
  const dayLabel = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',maxWidth:`${W}px` }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)" />
      <path d={line} stroke="#14b8a6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#14b8a6" />
          {i % 2 === 0 && (
            <text x={p.x} y={H - 0} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{dayLabel(p.date)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReportStatus, string> = {
  resolved: '#16a34a', partially: '#ea580c',
  not_resolved: '#dc2626', pending: '#64748b',
};
const STATUS_BG: Record<ReportStatus, string> = {
  resolved: '#dcfce7', partially: '#ffedd5',
  not_resolved: '#fee2e2', pending: '#f1f5f9',
};
const STATUS_LABEL: Record<ReportStatus, string> = {
  resolved: 'Resolved', partially: 'Partial',
  not_resolved: 'Not Resolved', pending: 'Pending',
};

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: STATUS_COLORS[status],
      background: STATUS_BG[status],
      letterSpacing: '0.03em',
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function KpiCard({ label, value, sub, color = '#14b8a6' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--color-slate-200)',
      borderRadius: '12px',
      padding: '1.125rem 1.25rem',
      boxShadow: '0 1px 3px rgba(15,23,42,.04)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem', fontWeight: 800,
        color, letterSpacing: '-0.04em', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.75rem', fontWeight: 700,
        color: 'var(--color-slate-500)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginTop: '0.3rem',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '0.2rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports,      setReports]      = useState<LabReport[]>([]);
  const [summary,      setSummary]      = useState<AnalyticsSummary | null>(null);
  const [filterTech,   setFilterTech]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalId,      setModalId]      = useState<string | null>(null);

  const reload = useCallback(() => {
    const r = getReports();
    setReports(r);
    setSummary(getAnalyticsSummary(r));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = reports.filter(r =>
    (!filterTech   || r.technique === filterTech) &&
    (!filterStatus || r.status    === filterStatus),
  );

  const techniques = Array.from(new Set(reports.map(r => r.technique))).sort();

  const donutData = summary ? [
    { label: 'Resolved',     value: summary.resolved,     color: '#16a34a' },
    { label: 'Partial',      value: summary.partially,    color: '#ea580c' },
    { label: 'Not Resolved', value: summary.not_resolved, color: '#dc2626' },
    { label: 'Pending',      value: summary.pending,      color: '#94a3b8' },
  ] : [];

  const barData = summary
    ? Object.entries(summary.by_technique).map(([label, value]) => ({ label, value }))
    : [];

  const SELECT_STYLE: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: '1.5px solid var(--color-slate-200)',
    borderRadius: '8px',
    background: '#fff',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.875rem',
    color: 'var(--color-navy-900)',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Page header */}
      <div className="lab-page-header">
        <div className="lab-container">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(20,184,166,.14)',
            border: '1px solid rgba(20,184,166,.24)',
            borderRadius: '100px',
            padding: '0.3125rem 0.9375rem',
            marginBottom: '1.125rem',
          }}>
            <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-teal-400)',flexShrink:0 }} />
            <span className="lab-eyebrow" style={{ color:'var(--color-teal-400)' }}>Analytics</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
            fontWeight: 800, color: '#f97316',
            letterSpacing: '-0.02em', lineHeight: 1.25,
            margin: '0 0 0.75rem', paddingLeft: '0.05em',
          }}>
            Troubleshooting Reports
          </h1>
          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
            color: '#ef4444', lineHeight: 1.65, margin: 0, maxWidth: '540px',
          }}>
            Analytics dashboard and history of all troubleshooting sessions. Update resolution status and export individual reports as PDF.
          </p>
        </div>
      </div>

      <div className="lab-page-body">
        <div className="lab-container">
          <div style={{ maxWidth: '900px' }}>

            {/* ── KPI cards ─────────────────────────────────────────────── */}
            {summary && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.875rem',
                marginBottom: '1.75rem',
              }}>
                <KpiCard label="Total Queries"    value={summary.total} color="var(--color-navy-900)" />
                <KpiCard
                  label="Resolved"
                  value={summary.total > 0 ? `${Math.round((summary.resolved / summary.total) * 100)}%` : '—'}
                  sub={`${summary.resolved} of ${summary.total}`}
                  color="#16a34a"
                />
                <KpiCard
                  label="Avg Confidence"
                  value={summary.total > 0 ? `${Math.round(summary.avg_confidence * 100)}%` : '—'}
                  color="var(--color-teal-600)"
                />
                <KpiCard
                  label="AI Assisted"
                  value={summary.total > 0 ? `${Math.round((summary.ai_assisted_count / summary.total) * 100)}%` : '—'}
                  sub={`${summary.ai_assisted_count} sessions`}
                  color="#7c3aed"
                />
              </div>
            )}

            {/* ── Charts ────────────────────────────────────────────────── */}
            {summary && summary.total > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}>
                {/* Donut */}
                <div style={{
                  background: '#fff', border: '1px solid var(--color-slate-200)',
                  borderRadius: '12px', padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(15,23,42,.04)',
                }}>
                  <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--color-slate-500)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.875rem' }}>
                    Status Distribution
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap' }}>
                    <DonutChart data={donutData} />
                    <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem' }}>
                      {donutData.filter(d => d.value > 0).map(d => (
                        <div key={d.label} style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                          <span style={{ width:'10px',height:'10px',borderRadius:'50%',background:d.color,flexShrink:0 }} />
                          <span style={{ fontSize:'0.8rem',color:'var(--color-slate-600)' }}>{d.label}</span>
                          <span style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--color-navy-900)',marginLeft:'auto' }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{
                  background: '#fff', border: '1px solid var(--color-slate-200)',
                  borderRadius: '12px', padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(15,23,42,.04)',
                }}>
                  <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--color-slate-500)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.875rem' }}>
                    Queries by Technique
                  </div>
                  <BarChart data={barData} />
                </div>

                {/* Line chart */}
                <div style={{
                  background: '#fff', border: '1px solid var(--color-slate-200)',
                  borderRadius: '12px', padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(15,23,42,.04)',
                }}>
                  <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--color-slate-500)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.875rem' }}>
                    Activity — Last 7 Days
                  </div>
                  <LineChart data={summary.by_day} />
                </div>
              </div>
            )}

            {/* ── History header + filters ───────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.9375rem',
                fontWeight: 700, color: 'var(--color-navy-900)', letterSpacing: '-0.01em',
              }}>
                History {filtered.length !== reports.length ? `(${filtered.length} of ${reports.length})` : `(${reports.length})`}
              </div>
              <div style={{ display:'flex',gap:'0.5rem',flexWrap:'wrap' }}>
                <select value={filterTech} onChange={e => setFilterTech(e.target.value)} style={SELECT_STYLE}>
                  <option value="">All techniques</option>
                  {techniques.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={SELECT_STYLE}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="partially">Partially Resolved</option>
                  <option value="not_resolved">Not Resolved</option>
                </select>
                {(filterTech || filterStatus) && (
                  <button
                    onClick={() => { setFilterTech(''); setFilterStatus(''); }}
                    style={{ ...SELECT_STYLE, color:'var(--color-slate-400)', cursor:'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* ── Empty state ────────────────────────────────────────────── */}
            {reports.length === 0 && (
              <div style={{
                background: '#fff', border: '1px solid var(--color-slate-200)',
                borderRadius: '12px', padding: '3rem 1.5rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15,23,42,.04)',
              }}>
                <div style={{ fontSize:'2rem',marginBottom:'0.75rem' }}>🔬</div>
                <div style={{ fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700,color:'var(--color-navy-900)',marginBottom:'0.375rem' }}>
                  No reports yet
                </div>
                <div style={{ fontSize:'0.875rem',color:'var(--color-slate-400)' }}>
                  Reports are created automatically after each troubleshooting session.
                </div>
              </div>
            )}

            {/* ── Report list ────────────────────────────────────────────── */}
            {filtered.length > 0 && (
              <div style={{ display:'flex',flexDirection:'column',gap:'0.625rem' }}>
                {filtered.map(report => (
                  <div
                    key={report.id}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--color-slate-200)',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      boxShadow: '0 1px 3px rgba(15,23,42,.04)',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Left: info */}
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.375rem',flexWrap:'wrap' }}>
                        <span style={{
                          fontFamily:'var(--font-display)',fontSize:'0.72rem',fontWeight:700,
                          color:'var(--color-teal-600)',background:'rgba(20,184,166,.1)',
                          padding:'0.15rem 0.5rem',borderRadius:'999px',
                        }}>
                          {report.technique}
                        </span>
                        {report.vendor && (
                          <span style={{ fontSize:'0.78rem',color:'var(--color-slate-400)' }}>{report.vendor}</span>
                        )}
                        {report.model && (
                          <span style={{ fontSize:'0.78rem',color:'var(--color-slate-400)' }}>{report.model}</span>
                        )}
                        {report.ai_assisted && (
                          <span style={{ fontSize:'0.7rem',fontWeight:700,color:'#7c3aed',background:'#f3e8ff',padding:'0.1rem 0.45rem',borderRadius:'999px' }}>
                            AI
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize:'0.9rem',fontWeight:500,color:'var(--color-navy-900)',
                        lineHeight:1.5,marginBottom:'0.375rem',
                        display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
                      }}>
                        {report.symptom_description}
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap' }}>
                        <span style={{ fontSize:'0.76rem',color:'var(--color-slate-400)' }}>
                          {new Date(report.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
                        </span>
                        <span style={{ fontSize:'0.76rem',color:'var(--color-slate-400)' }}>
                          Confidence: <strong style={{ color:'var(--color-navy-900)' }}>{Math.round(report.confidence * 100)}%</strong>
                        </span>
                        {report.issue_category && (
                          <span style={{ fontSize:'0.76rem',color:'var(--color-slate-400)' }}>{report.issue_category}</span>
                        )}
                      </div>
                      {report.resolution_note && (
                        <div style={{ marginTop:'0.375rem',fontSize:'0.8rem',color:'var(--color-slate-500)',fontStyle:'italic' }}>
                          {report.resolution_note}
                        </div>
                      )}
                    </div>

                    {/* Right: status + actions */}
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'0.5rem',flexShrink:0 }}>
                      <StatusBadge status={report.status} />
                      <div style={{ display:'flex',gap:'0.375rem' }}>
                        <button
                          onClick={() => { setModalId(report.id); }}
                          style={{
                            padding:'0.375rem 0.75rem',
                            background:'var(--color-slate-50)',
                            border:'1.5px solid var(--color-slate-200)',
                            borderRadius:'7px',
                            fontSize:'0.78rem',fontWeight:600,
                            color:'var(--color-slate-600)',
                            cursor:'pointer',
                            whiteSpace:'nowrap',
                          }}
                        >
                          Update
                        </button>
                        <button
                          onClick={() => exportPDF(report)}
                          style={{
                            padding:'0.375rem 0.75rem',
                            background:'var(--color-teal-600)',
                            border:'none',
                            borderRadius:'7px',
                            fontSize:'0.78rem',fontWeight:600,
                            color:'#fff',
                            cursor:'pointer',
                            whiteSpace:'nowrap',
                          }}
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Status update modal */}
      {modalId && (
        <ReportModal
          reportId={modalId}
          onClose={() => setModalId(null)}
          onSave={() => { setModalId(null); reload(); }}
        />
      )}

    </div>
  );
}

import { type ReactNode, useMemo, useState } from 'react';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import type { DisplayMode } from './ModeSwitcher';
import type { RankedAnswerV2 } from '@/lib/types';
import VisualFindingsPanel, { EvidenceBadge } from './visual/VisualFindingsPanel';
import { labelForSource, labelForGeneration } from '@/lib/evidence-labels';
import { buildQuickSummary, type ResponseFormat } from '@/lib/quick-summary';
import QuickSummaryView from './QuickSummaryView';

interface Props {
  modes: {
    concise:  TextOutput;
    standard: TextOutput;
    deep:     TextOutput;
    manager:  ManagerOutput;
  };
  confidence: number;
  selected: DisplayMode;
  rankedAnswer?: RankedAnswerV2;
  technique?: string;
  vendor?: string;
  model?: string;
  issueCategory?: string;
  /** Quick Summary or Detailed Analysis of the same answer. Defaults to detailed. */
  format?: ResponseFormat;
  onShowDetailed?: () => void;
}

function confidenceInfo(c: number): { label: string; pct: number; color: string; bg: string; border: string } {
  if (c >= 0.95) return {
    label: `Confirmed — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: '#065f46',
    bg: 'rgba(6,95,70,.07)',
    border: 'rgba(6,95,70,.2)',
  };
  if (c >= 0.80) return {
    label: `Strongly supported — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: 'var(--color-teal-600)',
    bg: 'rgba(15,145,136,.07)',
    border: 'rgba(15,145,136,.2)',
  };
  if (c >= 0.60) return {
    label: `Probable cause — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: '#2563eb',
    bg: 'rgba(37,99,235,.07)',
    border: 'rgba(37,99,235,.2)',
  };
  if (c >= 0.40) return {
    label: `Preliminary hypothesis — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: 'var(--color-amber-600)',
    bg: 'rgba(217,119,6,.07)',
    border: 'rgba(217,119,6,.2)',
  };
  if (c > 0) return {
    label: `Insufficient evidence — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: 'var(--color-red-700)',
    bg: 'rgba(185,28,28,.06)',
    border: 'rgba(185,28,28,.18)',
  };
  return {
    label: 'Insufficient evidence',
    pct: 0,
    color: 'var(--color-slate-500)',
    bg: 'rgba(100,116,139,.07)',
    border: 'rgba(100,116,139,.18)',
  };
}

// ── Inline **bold** → <strong> ────────────────────────────────────────────────
function renderBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--color-navy-800)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
          : part,
      )}
    </>
  );
}

// ── Markdown-ish text renderer ────────────────────────────────────────────────
function renderText(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: '0.875rem' }} />;

    if (line.startsWith('## ')) return (
      <h2 key={i} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.125rem',
        fontWeight: 700,
        color: 'var(--color-navy-900)',
        margin: '1.5rem 0 0.625rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid var(--color-slate-200)',
        letterSpacing: '-0.015em',
      }}>
        {line.slice(3)}
      </h2>
    );

    if (line.startsWith('### ')) return (
      <h3 key={i} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem',
        fontWeight: 700,
        color: 'var(--color-teal-600)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '1.125rem 0 0.4rem',
      }}>
        {line.slice(4)}
      </h3>
    );

    if (line.startsWith('- ')) return (
      <div key={i} style={{
        display: 'flex',
        gap: '0.625rem',
        alignItems: 'flex-start',
        padding: '0.3125rem 0',
        fontSize: '0.9375rem',
        color: 'var(--color-slate-700)',
        lineHeight: 1.65,
      }}>
        <span style={{
          color: 'var(--color-teal-500)',
          fontWeight: 700,
          marginTop: '0.05em',
          flexShrink: 0,
          fontSize: '1rem',
        }}>›</span>
        <span>{renderBold(line.slice(2))}</span>
      </div>
    );

    if (/^\d+\. /.test(line)) {
      const dotIdx = line.indexOf('. ');
      const num  = line.slice(0, dotIdx);
      const rest = line.slice(dotIdx + 2);
      return (
        <div key={i} style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          padding: '0.3125rem 0',
          fontSize: '0.9375rem',
          color: 'var(--color-slate-700)',
          lineHeight: 1.65,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#fff',
            background: 'var(--color-teal-600)',
            borderRadius: '50%',
            width: '1.5rem',
            height: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '0.1em',
          }}>
            {num}
          </span>
          <span>{renderBold(rest)}</span>
        </div>
      );
    }

    return (
      <p key={i} style={{
        fontSize: '0.9375rem',
        color: 'var(--color-slate-700)',
        lineHeight: 1.7,
        margin: '0.25rem 0',
      }}>
        {renderBold(line)}
      </p>
    );
  });
}

// ── Manager view ──────────────────────────────────────────────────────────────
function ManagerView({ output }: { output: ManagerOutput }) {
  const rows = [
    { key: 'Issue',               val: output.issue_summary },
    { key: 'Urgency',             val: output.urgency },
    { key: 'Data Quality Risk',   val: output.data_quality_risk },
    { key: 'Recommended Action',  val: output.recommended_action },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {rows.map(({ key, val }) => (
        <div key={key} className="lp-manager-row" style={{
          padding: '1rem 1.125rem',
          background: 'var(--color-slate-50)',
          borderRadius: '8px',
          border: '1px solid var(--color-slate-200)',
          alignItems: 'start',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-teal-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            paddingTop: '0.125em',
          }}>
            {key}
          </span>
          <span style={{ fontSize: '0.9375rem', color: 'var(--color-slate-800)', lineHeight: 1.65 }}>
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Confidence bar (color-blind safe: text label + pattern + percentage) ──────
function ConfidenceBar({ confidence }: { confidence: number }) {
  const info = confidenceInfo(confidence);
  // Pattern marker for color-blind users
  const marker = confidence >= 0.75 ? '\u25CF' : confidence >= 0.50 ? '\u25B2' : confidence > 0 ? '\u25A0' : '\u2013';
  return (
    <div
      role="meter"
      aria-valuenow={Math.round(confidence * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={info.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        background: info.bg,
        border: `1px solid ${info.border}`,
        flex: '1 1 15rem',
        minWidth: 0,
        flexWrap: 'wrap',
      }}
    >
      <div style={{
        flex: 1,
        height: '6px',
        background: 'rgba(0,0,0,.08)',
        borderRadius: '3px',
        overflow: 'hidden',
        minWidth: '60px',
      }}>
        <div style={{
          height: '100%',
          width: `${info.pct}%`,
          background: info.color,
          borderRadius: '3px',
          transition: 'width .65s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: info.color,
      }}>
        {marker} {info.label}
      </span>
    </div>
  );
}

// ── PDF Download Button ───────────────────────────────────────────────────────
function PdfDownloadButton({ rankedAnswer, technique, vendor, model, issueCategory, format }: {
  rankedAnswer: RankedAnswerV2; technique: string; vendor?: string; model?: string; issueCategory?: string; format: ResponseFormat;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch('/api/troubleshooting/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The route reads `answer` (the old `ranked_answer` key was never read).
        body: JSON.stringify({ answer: rankedAnswer, technique, vendor, model, issueCategory, format }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LabPulse-${technique}-${format === 'summary' ? 'summary-' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      data-no-print
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--color-teal-600)',
        background: 'transparent',
        border: '1px solid var(--color-teal-600)',
        borderRadius: '6px',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {loading ? 'Generating...' : 'Download PDF'}
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
// ── Evidence labels for every cited source ───────────────────────────────────
function EvidenceLabels({ answer }: { answer: RankedAnswerV2 }) {
  const sources = answer.sources_with_metadata ?? [];
  if (sources.length === 0 && answer.visual_findings) return null;
  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-200)' }}>
      <p className="vt-section-title">Evidence labels</p>
      {!answer.visual_findings && (
        <p style={{ margin: '0 0 .5rem', fontSize: '.875rem' }}>
          Recommendations in this report: <EvidenceBadge label={labelForGeneration(answer.generation)} />
        </p>
      )}
      {sources.length > 0 && (
        <ul className="vt-list">
          {sources.map((s, i) => {
            const url = s.source_metadata?.url;
            const title = s.source_metadata?.title ?? s.source_id;
            return (
              <li key={i}>
                <EvidenceBadge label={labelForSource(s)} />{' '}
                {url && /^https?:\/\//i.test(url)
                  ? <a href={url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--color-teal-600)' }}>{title}</a>
                  : title}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AnswerDisplay({ modes, confidence, selected, rankedAnswer, technique, vendor, model, issueCategory, format = 'detailed', onShowDetailed }: Props) {
  // Derived from the same answer: switching formats never calls the API.
  const summary = useMemo(
    () => (format === 'summary' && rankedAnswer ? buildQuickSummary(rankedAnswer) : null),
    [format, rankedAnswer],
  );
  return (
    <div className="lp-report">
      {/* The summary shows every notice itself, so it is not repeated here. */}
      {!summary && rankedAnswer?.generation?.notice && (
        <div
          role="status"
          style={{
            marginBottom: '0.875rem',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px dashed var(--color-slate-400)',
            background: 'var(--color-slate-50)',
            fontSize: '0.8125rem',
            color: 'var(--color-slate-700)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--color-navy-800)' }}>Notice: </strong>
          {rankedAnswer.generation.notice}
        </div>
      )}
      <div className="lp-report-head">
        <ConfidenceBar confidence={confidence} />
        {rankedAnswer && technique && (
          <PdfDownloadButton rankedAnswer={rankedAnswer} technique={technique} vendor={vendor} model={model} issueCategory={issueCategory} format={format} />
        )}
      </div>

      {summary ? (
        <QuickSummaryView summary={summary} onShowDetailed={onShowDetailed} />
      ) : (
        <>
          {/* Visual findings lead the report, so any safety step comes before the actions. */}
          {rankedAnswer?.visual_findings && <VisualFindingsPanel answer={rankedAnswer} />}

          {selected === 'manager' ? (
            <ManagerView output={modes.manager} />
          ) : (
            <div style={{ paddingTop: '0.25rem' }}>
              {renderText(modes[selected].text)}
            </div>
          )}

          {rankedAnswer && <EvidenceLabels answer={rankedAnswer} />}
        </>
      )}
    </div>
  );
}

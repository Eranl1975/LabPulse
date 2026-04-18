import type { ReactNode } from 'react';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import type { DisplayMode } from './ModeSwitcher';

interface Props {
  modes: {
    concise:  TextOutput;
    standard: TextOutput;
    deep:     TextOutput;
    manager:  ManagerOutput;
  };
  confidence: number;
  selected: DisplayMode;
}

function confidenceInfo(c: number): { label: string; pct: number; color: string; bg: string; border: string } {
  if (c >= 0.75) return {
    label: `High confidence — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: 'var(--color-teal-600)',
    bg: 'rgba(15,145,136,.07)',
    border: 'rgba(15,145,136,.2)',
  };
  if (c >= 0.50) return {
    label: `Medium confidence — ${Math.round(c * 100)}%`,
    pct: c * 100,
    color: 'var(--color-amber-600)',
    bg: 'rgba(217,119,6,.07)',
    border: 'rgba(217,119,6,.2)',
  };
  if (c > 0) return {
    label: `Low confidence — ${Math.round(c * 100)}%`,
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
        <div key={key} style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(140px, 180px) 1fr',
          gap: '1rem',
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

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ confidence }: { confidence: number }) {
  const info = confidenceInfo(confidence);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      background: info.bg,
      border: `1px solid ${info.border}`,
      marginBottom: '1.375rem',
    }}>
      {/* Progress bar */}
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
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {info.label}
      </span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AnswerDisplay({ modes, confidence, selected }: Props) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      border: '1px solid var(--color-slate-200)',
      padding: '1.625rem 1.75rem',
      boxShadow: '0 2px 14px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)',
    }}>
      <ConfidenceBar confidence={confidence} />

      {selected === 'manager' ? (
        <ManagerView output={modes.manager} />
      ) : (
        <div style={{ paddingTop: '0.25rem' }}>
          {renderText(modes[selected].text)}
        </div>
      )}
    </div>
  );
}

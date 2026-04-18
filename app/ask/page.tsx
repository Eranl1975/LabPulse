import QueryForm from '@/components/QueryForm';

export const metadata = {
  title: 'Ask a Question — LabPulse',
  description: 'Rule-based diagnostic assistant for LCMS, HPLC, GC, and GCMS instruments.',
};

export default function AskPage() {
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="lab-page-header">
        <div className="lab-container">

          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(20,184,166,.14)',
            border: '1px solid rgba(20,184,166,.24)',
            borderRadius: '100px',
            padding: '0.3125rem 0.9375rem',
            marginBottom: '1.125rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--color-teal-400)',
              boxShadow: '0 0 6px var(--color-teal-400)',
              flexShrink: 0,
            }} />
            <span className="lab-eyebrow" style={{ color: 'var(--color-teal-400)' }}>
              Troubleshooter
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
            fontWeight: 800,
            color: '#f97316',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 0.75rem',
          }}>
            Instrument Diagnostics
          </h1>

          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
            color: '#ef4444',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: '540px',
          }}>
            Describe the issue and your instrument details. LabPulse will analyse
            against known failure patterns for HPLC, LCMS, GC, and GCMS.
          </p>

        </div>
      </div>

      {/* ── Form area ─────────────────────────────────────────────────────── */}
      <div className="lab-page-body">
        <div className="lab-container">
          <div style={{ maxWidth: '820px' }}>
            <QueryForm />
          </div>
        </div>
      </div>

    </div>
  );
}

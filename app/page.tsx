import Link from 'next/link';

// ── Decorative chromatogram trace for the hero ──────────────────────────────
function ChromatogramHero() {
  return (
    <svg
      viewBox="0 0 520 130"
      fill="none"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: '520px', opacity: 0.85 }}
    >
      <defs>
        <linearGradient id="heroGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="heroGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="heroGrad3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Axis */}
      <line x1="18" y1="108" x2="505" y2="108" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="18" y1="10"  x2="18"  y2="108" stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Tick marks on x-axis */}
      {[60, 130, 200, 270, 340, 410, 480].map(x => (
        <line key={x} x1={x} y1="106" x2={x} y2="111" stroke="#94a3b8" strokeWidth="1" />
      ))}

      {/* Peak 1 — large (solvent front) */}
      <path d="M18,108 L45,108 C52,108 56,108 62,102 C68,92 74,65 78,32 C82,65 88,92 94,102 C100,108 104,108 112,108 L140,108"
            fill="url(#heroGrad1)" />
      <path d="M18,108 L45,108 C52,108 56,108 62,102 C68,92 74,65 78,32 C82,65 88,92 94,102 C100,108 104,108 112,108"
            stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="78" cy="32" r="2" fill="#2dd4bf" />

      {/* Peak 2 — medium */}
      <path d="M140,108 L165,108 C168,108 170,108 172,105 C175,100 178,88 180,76 C182,88 185,100 188,105 C190,108 192,108 196,108 L220,108"
            fill="url(#heroGrad2)" />
      <path d="M140,108 L165,108 C168,108 172,105 175,100 C178,88 180,76 182,88 C185,100 188,105 192,108 L220,108"
            stroke="#22d3ee" strokeWidth="1.75" strokeLinecap="round" fill="none" />

      {/* Peak 3 — shoulder peak */}
      <path d="M220,108 L245,108 C248,108 250,108 252,106 C255,103 258,96 260,90 C262,96 265,103 268,106 C270,108 272,108 278,108 L310,108"
            fill="url(#heroGrad3)" />
      <path d="M220,108 C235,108 245,108 252,106 C255,103 258,96 260,90 C262,96 265,103 268,106 C270,108 278,108 310,108"
            stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Peak 4 — small late peak */}
      <path d="M310,108 L360,108 C364,108 366,108 368,106 C370,103 372,98 374,94 C376,98 378,103 380,106 C382,108 385,108 390,108 L505,108"
            stroke="#0f9188" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* Baseline label */}
      <text x="490" y="122" fontSize="9" fill="#94a3b8" fontFamily="var(--font-mono)" textAnchor="end">t (min)</text>
      <text x="10" y="18" fontSize="9" fill="#94a3b8" fontFamily="var(--font-mono)">mAU</text>
    </svg>
  );
}

// ── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L3 7v8l8 5 8-5V7L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M3 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <line x1="11" y1="12" x2="11" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Evidence-Ranked Answers',
    body:  'Every answer is scored by source authority, technique relevance, recency, and evidence strength — never by popularity alone.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="11" cy="11" r="2.5" fill="currentColor" opacity=".2"/>
      </svg>
    ),
    title: 'Full Source Traceability',
    body:  'Every finding links back to its vendor document, scientific paper, or community thread — no fabricated evidence, ever.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 10h4M6 13h7M14 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="17" cy="5" r="3" fill="var(--color-teal-500)" stroke="#fff" strokeWidth="1.25"/>
      </svg>
    ),
    title: 'Monthly Intelligence Refresh',
    body:  'A controlled acquisition pipeline pulls verified updates from authorised vendor and scientific sources on a monthly cadence.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 17L9 12l3 3 3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="2" y="3" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Confidence Tiering',
    body:  'Results are grouped into Highly Likely, Plausible, and Low Confidence tiers — so you always know the certainty of every recommendation.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M11 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: '5 Output Modes',
    body:  'Switch between Concise, Standard, Deep Technical, Manager, and JSON API views — tuned for bench scientists, lab managers, and integrations.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 11h4l3 7 4-14 3 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Contradiction Detection',
    body:  'When credible sources disagree, conflicts are flagged explicitly — never silently merged — so you can make an informed call.',
  },
];

// ── How it works steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { num: '01', title: 'Describe the Problem', body: 'Select your technique, enter symptoms, and optionally list steps already tried.' },
  { num: '02', title: 'Ranked Diagnosis',     body: 'The rule-based engine scores all matching knowledge items by evidence quality and relevance.' },
  { num: '03', title: 'Verified Action',      body: 'Get structured corrective actions traced to authoritative vendor or scientific sources.' },
];

export default function HomePage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          overflowX: 'hidden',
          paddingTop: 'clamp(3.5rem, 8vw, 6rem)',
          paddingBottom: 'clamp(3rem, 7vw, 5rem)',
          background: '#fff',
        }}
      >
        {/* Dot grid bg */}
        <div
          className="dot-grid"
          style={{
            position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none',
          }}
        />
        {/* Radial teal glow */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '60%', height: '120%',
          background: 'radial-gradient(ellipse at 20% 40%, rgba(20,184,166,.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div className="lab-container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: 'clamp(2rem, 5vw, 4rem)',
            alignItems: 'center',
          }}>
            {/* Text column */}
            <div>
              <span className="lab-eyebrow" style={{ display: 'block', marginBottom: '1rem' }}>
                Instrument Diagnostics · HPLC · UHPLC · LCMS · GC · GCMS · IC · CE · SFC · TGA · DSC · FPLC
              </span>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.875rem, 4.5vw, 3.25rem)',
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#f97316',
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
                paddingLeft: '0.05em',
              }}>
                Diagnose instrument<br />
                failures <span style={{ color: 'var(--color-teal-600)' }}>before</span> they<br />
                cost you.
              </h1>

              <p style={{
                fontSize: 'clamp(.9375rem, 2vw, 1.0625rem)',
                color: '#ef4444',
                lineHeight: 1.7,
                maxWidth: '440px',
                marginBottom: '2rem',
              }}>
                Rule-based troubleshooting intelligence for analytical laboratories.
                Every answer is ranked by evidence authority and traced to verified
                vendor or scientific sources.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center' }}>
                <Link href="/ask" className="lab-btn lab-btn-primary lab-btn-lg">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5.5 6.5C5.5 5.12 6.62 4 8 4s2.5 1.12 2.5 2.5C10.5 8 9 8.5 8 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="12" r=".75" fill="currentColor"/>
                  </svg>
                  Ask a Question
                </Link>
                <Link href="/reports" className="lab-btn lab-btn-secondary lab-btn-lg">
                  View Reports
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '.5rem',
                marginTop: '1.75rem',
              }}>
                {['Agilent', 'Waters', 'Thermo', 'Restek', 'Shimadzu'].map(v => (
                  <span key={v} style={{
                    padding: '.1875rem .5625rem',
                    background: 'var(--color-slate-50)',
                    border: '1px solid var(--color-slate-200)',
                    borderRadius: '999px',
                    fontSize: '.6875rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-500)',
                    letterSpacing: '.04em',
                  }}>{v}</span>
                ))}
                <span style={{
                  padding: '.1875rem .5625rem',
                  background: 'var(--color-slate-50)',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: '999px',
                  fontSize: '.6875rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-400)',
                }}>+5 more</span>
              </div>
            </div>

            {/* Chromatogram illustration */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '1rem',
            }}>
              <div className="lab-card" style={{ padding: '1.5rem 1.75rem', width: '100%', maxWidth: '440px' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '.6875rem',
                    color: 'var(--color-slate-400)',
                  }}>HPLC · Retention Analysis · Run 24</span>
                  <span className="conf-badge conf-high">Strong</span>
                </div>
                <ChromatogramHero />
                <div style={{
                  marginTop: '1rem',
                  display: 'flex',
                  gap: '.75rem',
                  flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'RT Shift', val: '+1.8 min', col: 'var(--color-amber-600)' },
                    { label: 'Peak Area', val: '−12.4%', col: 'var(--color-red-500)' },
                    { label: 'Plates', val: '8 240', col: 'var(--color-teal-600)' },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ flex: '1 1 80px', minWidth: '80px' }}>
                      <div style={{ fontSize: '.6875rem', color: 'var(--color-slate-500)', marginBottom: '.125rem' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.875rem', fontWeight: 600, color: col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-navy-900)',
        paddingBlock: 'clamp(3rem, 6vw, 5rem)',
      }}>
        <div className="lab-container">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
            <span className="lab-eyebrow" style={{ color: '#ef4444', display: 'block', marginBottom: '.5rem' }}>
              How It Works
            </span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 700,
              color: '#f97316',
              letterSpacing: '-0.02em',
            }}>
              From symptom to solution in seconds
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1.5rem',
          }}>
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <div key={num} style={{
                padding: '1.75rem',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-teal-500)',
                  opacity: .5,
                  lineHeight: 1,
                  marginBottom: '1rem',
                  letterSpacing: '-0.02em',
                }}>{num}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#4ade80',
                  marginBottom: '.5rem',
                }}>{title}</h3>
                <p style={{ fontSize: '.875rem', color: '#4ade80', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ paddingBlock: 'clamp(3.5rem, 7vw, 6rem)', background: 'var(--color-slate-50)' }}>
        <div className="lab-container">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 3.5rem)' }}>
            <span className="lab-eyebrow" style={{ display: 'block', marginBottom: '.5rem' }}>Platform Capabilities</span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 700,
              color: 'var(--color-navy-900)',
              letterSpacing: '-0.02em',
            }}>
              Built for serious analytical work
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1.25rem',
          }}>
            {FEATURES.map(({ icon, title, body }) => (
              <div key={title} className="lab-card lab-card-hover" style={{ padding: '1.5rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-teal-50)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-teal-600)',
                  marginBottom: '1rem',
                }}>
                  {icon}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '.9375rem',
                  fontWeight: 700,
                  color: 'var(--color-navy-900)',
                  marginBottom: '.5rem',
                }}>{title}</h3>
                <p style={{ fontSize: '.875rem', color: 'var(--color-slate-600)', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-navy-900) 0%, var(--color-navy-800) 100%)',
        paddingBlock: 'clamp(2.5rem, 5vw, 4rem)',
      }}>
        <div className="lab-container" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
            fontWeight: 700,
            color: '#f97316',
            marginBottom: '.75rem',
            letterSpacing: '-0.02em',
          }}>
            Ready to troubleshoot?
          </h2>
          <p style={{ color: '#f97316', marginBottom: '1.75rem', fontSize: '.9375rem' }}>
            Describe your instrument problem and get evidence-ranked answers instantly.
          </p>
          <Link href="/ask" className="lab-btn lab-btn-primary lab-btn-lg" style={{ color: '#000' }}>
            Start Troubleshooting
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        background: 'var(--color-navy-950)',
        paddingBlock: '2rem',
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        <div className="lab-container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '.9375rem',
            color: '#fff',
          }}>
            Lab<span style={{ color: 'var(--color-teal-500)' }}>Pulse</span>
          </span>
          <span style={{ fontSize: '.8125rem', color: 'rgba(255,255,255,.35)' }}>
            HPLC · UHPLC · LCMS · GC · GCMS · IC · CE · SFC · TGA · DSC · FPLC · Rule-based diagnostics
          </span>
          <span style={{ fontSize: '.8125rem', color: 'rgba(255,255,255,.3)' }}>
            v0.1.0 · MVP
          </span>
        </div>
      </footer>
    </>
  );
}

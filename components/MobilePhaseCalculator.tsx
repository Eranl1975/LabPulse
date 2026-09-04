'use client';

import { useState } from 'react';

// ── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--color-slate-500)', marginBottom: '0.25rem',
  fontFamily: 'var(--font-mono)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1px solid var(--color-slate-200)', background: 'var(--color-slate-50)',
  fontSize: '0.875rem', fontFamily: 'var(--font-mono)',
  outline: 'none', transition: 'border .15s, box-shadow .15s',
};

const sectionStyle: React.CSSProperties = {
  borderRadius: '12px', border: '1px solid var(--color-slate-200)',
  background: '#fff', marginBottom: '1rem', overflow: 'hidden',
};

const sectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none',
  fontFamily: 'var(--font-display)', fontWeight: 700,
  color: 'var(--color-navy-900)', fontSize: '0.95rem',
};

const resultBox: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px',
  background: '#f0fdfa', border: '1px solid #99f6e4',
  fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
  color: 'var(--color-teal-600)', marginTop: '0.75rem',
};

const formulaStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: 'var(--color-slate-500)',
  fontFamily: 'var(--font-mono)', marginTop: '0.5rem',
  fontStyle: 'italic',
};

const btnCalc: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
  background: 'var(--color-teal-600)', color: '#fff', fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.5rem',
};

// ── Buffer reference data ────────────────────────────────────────────────────

const BUFFERS = [
  { name: 'Acetate',    pKa: '4.76',                range: '3.8 - 5.8' },
  { name: 'Phosphate',  pKa: '2.15 / 7.20 / 12.35', range: '1.1 - 3.1 / 6.2 - 8.2 / 11.3 - 13.4' },
  { name: 'Formate',    pKa: '3.75',                range: '2.8 - 4.8' },
  { name: 'Ammonium',   pKa: '9.25',                range: '8.3 - 10.3' },
  { name: 'TFA',        pKa: '0.23',                range: 'N/A (strong acid)' },
];

// ── Collapsible section wrapper ──────────────────────────────────────────────

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={sectionStyle}>
      <div style={sectionHeader} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          &#9660;
        </span>
      </div>
      {open && <div style={{ padding: '0 1rem 1rem' }}>{children}</div>}
    </div>
  );
}

// ── Henderson-Hasselbalch ────────────────────────────────────────────────────

function HendersonHasselbalch() {
  const [pKa, setPKa] = useState('');
  const [acid, setAcid] = useState('');
  const [base, setBase] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');

  function calculate() {
    setError('');
    setResult(null);
    const pka = parseFloat(pKa);
    const a = parseFloat(acid);
    const b = parseFloat(base);
    if (isNaN(pka) || isNaN(a) || isNaN(b)) { setError('All fields must be valid numbers.'); return; }
    if (a <= 0) { setError('Acid concentration must be > 0.'); return; }
    if (b <= 0) { setError('Base concentration must be > 0.'); return; }
    setResult(pka + Math.log10(b / a));
  }

  return (
    <>
      <p style={formulaStyle}>pH = pKa + log10([base] / [acid])</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
        <div>
          <label style={labelStyle}>pKa</label>
          <input type="number" step="any" value={pKa} onChange={e => setPKa(e.target.value)}
            placeholder="4.76" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Acid conc. (M)</label>
          <input type="number" step="any" min={0} value={acid} onChange={e => setAcid(e.target.value)}
            placeholder="0.1" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Base conc. (M)</label>
          <input type="number" step="any" min={0} value={base} onChange={e => setBase(e.target.value)}
            placeholder="0.1" style={inputStyle} />
        </div>
      </div>
      <button type="button" onClick={calculate} style={btnCalc}>Calculate pH</button>
      {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
      {result !== null && (
        <div style={resultBox}>Predicted pH = <strong>{result.toFixed(3)}</strong></div>
      )}
    </>
  );
}

// ── Gradient Slope Calculator ────────────────────────────────────────────────

function GradientSlope() {
  const [startB, setStartB] = useState('');
  const [endB, setEndB] = useState('');
  const [time, setTime] = useState('');
  const [flow, setFlow] = useState('');
  const [colVol, setColVol] = useState('');
  const [result, setResult] = useState<{ slope: number; cvs: number } | null>(null);
  const [error, setError] = useState('');

  function calculate() {
    setError('');
    setResult(null);
    const s = parseFloat(startB);
    const e2 = parseFloat(endB);
    const t = parseFloat(time);
    const f = parseFloat(flow);
    const cv = parseFloat(colVol);
    if ([s, e2, t, f, cv].some(isNaN)) { setError('All fields must be valid numbers.'); return; }
    if (t <= 0) { setError('Gradient time must be > 0.'); return; }
    if (cv <= 0) { setError('Column volume must be > 0.'); return; }

    const slope = (e2 - s) / t;
    const totalVolume = f * t; // mL
    const cvs = totalVolume / cv;
    setResult({ slope, cvs });
  }

  return (
    <>
      <p style={formulaStyle}>Slope = (End %B - Start %B) / time &nbsp;|&nbsp; CVs = (flow x time) / column volume</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Start %B</label>
          <input type="number" step="any" value={startB} onChange={e => setStartB(e.target.value)}
            placeholder="5" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>End %B</label>
          <input type="number" step="any" value={endB} onChange={e => setEndB(e.target.value)}
            placeholder="95" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Gradient time (min)</label>
          <input type="number" step="any" min={0} value={time} onChange={e => setTime(e.target.value)}
            placeholder="20" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Flow rate (mL/min)</label>
          <input type="number" step="any" min={0} value={flow} onChange={e => setFlow(e.target.value)}
            placeholder="1.0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Column volume (mL)</label>
          <input type="number" step="any" min={0} value={colVol} onChange={e => setColVol(e.target.value)}
            placeholder="1.68" style={inputStyle} />
        </div>
      </div>
      <button type="button" onClick={calculate} style={btnCalc}>Calculate</button>
      {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
      {result && (
        <div style={resultBox}>
          Gradient slope = <strong>{result.slope.toFixed(2)} %B/min</strong>
          <span style={{ margin: '0 0.75rem', color: 'var(--color-slate-500)' }}>|</span>
          Column volumes = <strong>{result.cvs.toFixed(1)} CV</strong>
        </div>
      )}
    </>
  );
}

// ── Buffer Reference Table ───────────────────────────────────────────────────

function BufferTable() {
  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '0.5rem 0.75rem',
    fontSize: '0.75rem', fontWeight: 700,
    color: 'var(--color-slate-500)', fontFamily: 'var(--font-mono)',
    borderBottom: '2px solid var(--color-slate-200)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.85rem',
    fontFamily: 'var(--font-mono)', color: 'var(--color-navy-900)',
    borderBottom: '1px solid var(--color-slate-200)',
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
      <thead>
        <tr>
          <th style={thStyle}>Buffer</th>
          <th style={thStyle}>pKa</th>
          <th style={thStyle}>Effective Range</th>
        </tr>
      </thead>
      <tbody>
        {BUFFERS.map(b => (
          <tr key={b.name}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>{b.name}</td>
            <td style={tdStyle}>{b.pKa}</td>
            <td style={tdStyle}>{b.range}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MobilePhaseCalculator() {
  return (
    <div style={{ maxWidth: '760px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', fontSize: '1.125rem', marginBottom: '1rem' }}>
        Mobile Phase Calculator
      </h3>

      <Section title="Henderson-Hasselbalch pH Calculator" defaultOpen>
        <HendersonHasselbalch />
      </Section>

      <Section title="Gradient Slope Calculator">
        <GradientSlope />
      </Section>

      <Section title="Common Buffer Reference Table">
        <BufferTable />
      </Section>
    </div>
  );
}

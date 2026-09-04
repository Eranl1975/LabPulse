'use client';

import { useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ComparativeAnalysisProps {
  technique: string;
}

interface ParameterRow {
  label: string;
  key: string;
  unit: string;
  expected: string;
  actual: string;
}

type Status = 'pass' | 'marginal' | 'fail';

interface DeviationResult {
  label: string;
  unit: string;
  expected: number;
  actual: number;
  absoluteDev: number;
  percentDev: number;
  status: Status;
}

// ── Parameter definitions ────────────────────────────────────────────────────

const PARAMETERS: Omit<ParameterRow, 'expected' | 'actual'>[] = [
  { label: 'Retention Time', key: 'rt', unit: 'min' },
  { label: 'Peak Area', key: 'area', unit: '' },
  { label: 'Resolution', key: 'resolution', unit: '' },
  { label: 'Tailing Factor', key: 'tailing', unit: '' },
  { label: 'Plates (N)', key: 'plates', unit: '' },
  { label: '%RSD', key: 'rsd', unit: '%' },
];

// ── Status evaluation ────────────────────────────────────────────────────────

function evaluateStatus(key: string, expected: number, actual: number): Status {
  const pctDev = expected !== 0 ? Math.abs((actual - expected) / expected) * 100 : 0;

  switch (key) {
    case 'rt':
      if (pctDev < 2) return 'pass';
      if (pctDev < 5) return 'marginal';
      return 'fail';

    case 'area':
      if (pctDev < 5) return 'pass';
      if (pctDev < 10) return 'marginal';
      return 'fail';

    case 'resolution':
      if (actual > 2.0) return 'pass';
      if (actual > 1.5) return 'marginal';
      return 'fail';

    case 'tailing':
      if (actual < 1.5) return 'pass';
      if (actual < 2.0) return 'marginal';
      return 'fail';

    case 'plates':
      if (actual > 2000) return 'pass';
      if (actual > 1000) return 'marginal';
      return 'fail';

    case 'rsd':
      if (actual < 1.0) return 'pass';
      if (actual < 2.0) return 'marginal';
      return 'fail';

    default:
      return 'pass';
  }
}

// ── Style helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Status, string> = {
  pass: '#16a34a',
  marginal: '#ca8a04',
  fail: '#dc2626',
};

const STATUS_BG: Record<Status, string> = {
  pass: 'rgba(22,163,74,0.1)',
  marginal: 'rgba(202,138,4,0.1)',
  fail: 'rgba(220,38,38,0.1)',
};

const STATUS_LABELS: Record<Status, string> = {
  pass: 'Pass',
  marginal: 'Marginal',
  fail: 'Fail',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ComparativeAnalysis({ technique }: ComparativeAnalysisProps) {
  const [values, setValues] = useState<Record<string, { expected: string; actual: string }>>(
    () => Object.fromEntries(PARAMETERS.map((p) => [p.key, { expected: '', actual: '' }]))
  );
  const [showResults, setShowResults] = useState(false);

  const handleChange = (key: string, field: 'expected' | 'actual', value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setShowResults(false);
  };

  const results = useMemo<DeviationResult[]>(() => {
    if (!showResults) return [];
    return PARAMETERS.map((p) => {
      const exp = parseFloat(values[p.key].expected);
      const act = parseFloat(values[p.key].actual);
      if (isNaN(exp) || isNaN(act)) return null;
      const absoluteDev = Math.abs(act - exp);
      const percentDev = exp !== 0 ? (absoluteDev / Math.abs(exp)) * 100 : 0;
      return {
        label: p.label,
        unit: p.unit,
        expected: exp,
        actual: act,
        absoluteDev,
        percentDev,
        status: evaluateStatus(p.key, exp, act),
      };
    }).filter((r): r is DeviationResult => r !== null);
  }, [showResults, values]);

  const hasInput = Object.values(values).some(
    (v) => v.expected.trim() !== '' && v.actual.trim() !== ''
  );

  const handleReset = () => {
    setValues(Object.fromEntries(PARAMETERS.map((p) => [p.key, { expected: '', actual: '' }])));
    setShowResults(false);
  };

  return (
    <div style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', color: 'var(--color-navy-900)' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Comparative Analysis
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)', marginBottom: '1.25rem' }}>
        Compare expected vs. actual results for <strong>{technique || 'your technique'}</strong>
      </p>

      {/* Input form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-slate-600)' }}>Parameter</div>
        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-slate-600)' }}>Expected</div>
        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-slate-600)' }}>Actual</div>

        {PARAMETERS.map((p) => (
          <div key={p.key} style={{ display: 'contents' }}>
            <label style={{ fontSize: '0.875rem', padding: '0.4rem 0', color: 'var(--color-navy-900)' }}>
              {p.label} {p.unit && <span style={{ color: 'var(--color-slate-400)' }}>({p.unit})</span>}
            </label>
            <input
              type="number"
              step="any"
              placeholder="Expected"
              value={values[p.key].expected}
              onChange={(e) => handleChange(p.key, 'expected', e.target.value)}
              style={{
                padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.875rem',
                border: '1px solid var(--color-slate-300)', outline: 'none',
              }}
            />
            <input
              type="number"
              step="any"
              placeholder="Actual"
              value={values[p.key].actual}
              onChange={(e) => handleChange(p.key, 'actual', e.target.value)}
              style={{
                padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.875rem',
                border: '1px solid var(--color-slate-300)', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          disabled={!hasInput}
          onClick={() => setShowResults(true)}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600,
            fontSize: '0.875rem', border: 'none', cursor: hasInput ? 'pointer' : 'not-allowed',
            background: hasInput ? 'var(--color-teal-600)' : 'var(--color-slate-300)',
            color: '#fff', transition: 'opacity 0.15s', opacity: hasInput ? 1 : 0.6,
          }}
        >
          Analyze Deviations
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600,
            fontSize: '0.875rem', border: '1px solid var(--color-slate-300)',
            cursor: 'pointer', background: '#fff', color: 'var(--color-navy-900)',
          }}
        >
          Reset
        </button>
      </div>

      {/* Results table */}
      {showResults && results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-slate-200)' }}>
                {['Parameter', 'Expected', 'Actual', 'Abs. Dev.', '% Dev.', 'Status'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600,
                    color: 'var(--color-slate-600)', fontSize: '0.8rem',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.label} style={{ borderBottom: '1px solid var(--color-slate-100)', background: STATUS_BG[r.status] }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{r.label}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{r.expected.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{r.actual.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{r.absoluteDev.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{r.percentDev.toFixed(2)}%</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: '9999px',
                      fontWeight: 700, fontSize: '0.75rem', color: '#fff',
                      background: STATUS_COLORS[r.status],
                    }}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showResults && results.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>
          Enter both expected and actual values for at least one parameter to see results.
        </p>
      )}
    </div>
  );
}

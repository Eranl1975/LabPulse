'use client';

import { useState } from 'react';
import type { Technique, RankedAnswer } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';

const TECHNIQUE_OPTIONS: Technique[] = ['HPLC', 'LCMS', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC'];

interface BatchEntry {
  id: number;
  technique: Technique;
  vendor: string;
  model: string;
  symptom_description: string;
}

interface BatchResult {
  id: number;
  ranked_answer: RankedAnswer;
  ai_assisted: boolean;
  modes: { standard: TextOutput; manager: ManagerOutput };
  error?: string;
}

export default function BatchQueryPage() {
  const [entries, setEntries] = useState<BatchEntry[]>([
    { id: 1, technique: 'HPLC', vendor: '', model: '', symptom_description: '' },
  ]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  function addEntry() {
    setEntries(prev => [...prev, { id: nextId, technique: 'HPLC', vendor: '', model: '', symptom_description: '' }]);
    setNextId(n => n + 1);
  }

  function removeEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: number, field: keyof BatchEntry, value: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  async function submitBatch() {
    setLoading(true);
    setResults([]);

    const batchResults: BatchResult[] = [];
    for (const entry of entries) {
      if (!entry.symptom_description.trim()) continue;
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technique: entry.technique,
            vendor: entry.vendor || undefined,
            model: entry.model || undefined,
            symptom_description: entry.symptom_description,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          batchResults.push({ id: entry.id, ranked_answer: data.ranked_answer, ai_assisted: data.ai_assisted, modes: data.modes });
        } else {
          batchResults.push({ id: entry.id, ranked_answer: {} as RankedAnswer, ai_assisted: false, modes: {} as BatchResult['modes'], error: data.error });
        }
      } catch (err) {
        batchResults.push({ id: entry.id, ranked_answer: {} as RankedAnswer, ai_assisted: false, modes: {} as BatchResult['modes'], error: String(err) });
      }
    }

    setResults(batchResults);
    setLoading(false);
  }

  return (
    <div className="lab-container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="lab-page-header">
        <span className="lab-eyebrow">Fleet Diagnostics</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--color-navy-900)' }}>
          Batch Query
        </h1>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9375rem' }}>
          Submit multiple instrument issues at once for lab-wide diagnostics.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {entries.map((entry, idx) => (
          <div key={entry.id} className="lab-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-navy-900)' }}>
                Instrument #{idx + 1}
              </span>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(entry.id)} style={{ color: 'var(--color-red-500)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  Remove
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>Technique</label>
                <select
                  value={entry.technique}
                  onChange={e => updateEntry(entry.id, 'technique', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', marginTop: '0.25rem' }}
                >
                  {TECHNIQUE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>Vendor</label>
                <input
                  value={entry.vendor}
                  onChange={e => updateEntry(entry.id, 'vendor', e.target.value)}
                  placeholder="e.g. Agilent"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', marginTop: '0.25rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>Model</label>
                <input
                  value={entry.model}
                  onChange={e => updateEntry(entry.id, 'model', e.target.value)}
                  placeholder="e.g. 1290 Infinity II"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', marginTop: '0.25rem' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>Symptom Description</label>
              <textarea
                value={entry.symptom_description}
                onChange={e => updateEntry(entry.id, 'symptom_description', e.target.value)}
                placeholder="Describe the issue..."
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', marginTop: '0.25rem', resize: 'vertical' }}
              />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button onClick={addEntry} className="lab-btn lab-btn-secondary" style={{ fontSize: '0.875rem' }}>
            + Add Instrument
          </button>
          <button
            onClick={submitBatch}
            disabled={loading || entries.every(e => !e.symptom_description.trim())}
            className="lab-btn lab-btn-primary"
            style={{ fontSize: '0.875rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Analyzing...' : `Submit ${entries.filter(e => e.symptom_description.trim()).length} Queries`}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy-900)', marginBottom: '1rem' }}>
            Results
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1rem' }}>
            {results.map((r, idx) => {
              const entry = entries.find(e => e.id === r.id);
              return (
                <div key={r.id} className="lab-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem' }}>
                      {entry?.technique} #{idx + 1}
                    </span>
                    {!r.error && (
                      <span className={`conf-badge conf-${r.ranked_answer.confidence >= 0.6 ? 'high' : r.ranked_answer.confidence >= 0.4 ? 'medium' : 'low'}`}>
                        {Math.round(r.ranked_answer.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {r.error ? (
                    <p style={{ color: 'var(--color-red-500)', fontSize: '0.875rem' }}>{r.error}</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', marginBottom: '0.5rem' }}>
                        {r.ranked_answer.problem_summary}
                      </p>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
                        <strong>Top cause:</strong> {r.ranked_answer.likely_causes[0] ?? 'N/A'}
                      </div>
                      {r.ai_assisted && (
                        <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.6875rem', padding: '0.125rem 0.5rem', background: 'var(--color-teal-50)', color: 'var(--color-teal-700)', borderRadius: '999px' }}>
                          AI-assisted
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

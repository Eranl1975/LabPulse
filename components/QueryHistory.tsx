'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QueryHistoryEntry {
  timestamp: string;          // ISO 8601
  technique: string;
  vendor: string;
  model: string;
  symptom: string;
  queryPayload: Record<string, unknown>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'labpulse-query-history';
const MAX_ENTRIES = 20;

function load(): QueryHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(entries: QueryHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);

  useEffect(() => { setHistory(load()); }, []);

  const addQuery = useCallback((entry: QueryHistoryEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      save(next); return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addQuery, clearHistory };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const tagStyle: React.CSSProperties = {
  display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '6px',
  fontSize: '0.7rem', fontWeight: 700, background: '#f0fdfa',
  color: 'var(--color-teal-600)', textTransform: 'uppercase',
  fontFamily: 'var(--font-mono)',
};

const btnRerun: React.CSSProperties = {
  padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
  background: 'var(--color-teal-600)', color: '#fff', fontWeight: 600,
  fontSize: '0.75rem', cursor: 'pointer',
};

const btnClear: React.CSSProperties = {
  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none',
  background: '#fee2e2', color: '#dc2626', fontWeight: 600,
  fontSize: '0.8rem', cursor: 'pointer',
};

const chevron: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--color-slate-500)',
  transition: 'transform .2s', userSelect: 'none',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface QueryHistoryProps {
  onRerun: (payload: Record<string, unknown>) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QueryHistory({ onRerun }: QueryHistoryProps) {
  const { history, clearHistory } = useQueryHistory();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function toggle(idx: number) {
    setExpandedIdx(prev => prev === idx ? null : idx);
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', fontSize: '1.125rem', margin: 0 }}>
          Query History
        </h3>
        {history.length > 0 && (
          <button type="button" onClick={clearHistory} style={btnClear}>Clear History</button>
        )}
      </div>

      {history.length === 0 && (
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
          No queries recorded yet.
        </p>
      )}

      {history.map((entry, idx) => {
        const isOpen = expandedIdx === idx;
        const preview = entry.symptom.length > 60 ? entry.symptom.slice(0, 57) + '...' : entry.symptom;

        return (
          <div key={idx} style={{
            borderRadius: '10px', border: '1px solid var(--color-slate-200)',
            background: '#fff', marginBottom: '0.5rem', overflow: 'hidden',
          }}>
            {/* Header row */}
            <div
              onClick={() => toggle(idx)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 1rem', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                <span style={tagStyle}>{entry.technique}</span>
                <span style={{
                  fontSize: '0.8rem', color: 'var(--color-navy-900)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {preview}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-500)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(entry.timestamp)}
                </span>
                <span style={{ ...chevron, transform: isOpen ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div style={{ padding: '0 1rem 0.75rem', borderTop: '1px solid var(--color-slate-200)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-slate-500)', fontFamily: 'var(--font-mono)' }}>Vendor: </span>
                    <span style={{ color: 'var(--color-navy-900)' }}>{entry.vendor || '--'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-500)', fontFamily: 'var(--font-mono)' }}>Model: </span>
                    <span style={{ color: 'var(--color-navy-900)' }}>{entry.model || '--'}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-navy-900)', margin: '0.5rem 0 0.6rem', lineHeight: 1.4 }}>
                  {entry.symptom}
                </p>
                <button type="button" onClick={() => onRerun(entry.queryPayload)} style={btnRerun}>
                  Re-run Query
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

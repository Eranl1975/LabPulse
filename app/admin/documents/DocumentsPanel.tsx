'use client';

import { useMemo, useState } from 'react';
import type { DocumentRecord } from '@/lib/document-types';
import type { RefreshRun } from '@/agents/acquisition/pipeline/run-state';

const STATUS_COLORS: Record<string, string> = {
  success: '#059669',
  partial: '#d97706',
  running: '#2563eb',
  failed: '#dc2626',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748b',
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '0.875rem',
  color: '#0f172a',
  verticalAlign: 'top',
};

interface Props {
  documents: DocumentRecord[];
  runs: RefreshRun[];
  runsError: string | null;
  remoteBacked: boolean;
}

export default function DocumentsPanel({ documents, runs, runsError, remoteBacked }: Props) {
  const [vendor, setVendor] = useState('');
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const vendors = useMemo(
    () => [...new Set(documents.map(d => d.vendor))].sort(),
    [documents],
  );

  const perVendor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of documents) counts.set(d.vendor, (counts.get(d.vendor) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter(d =>
      (!vendor || d.vendor === vendor) &&
      (!q || d.title.toLowerCase().includes(q) || (d.document_number ?? '').toLowerCase().includes(q)),
    ).slice(0, 200);
  }, [documents, vendor, query]);

  async function runNow() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_only: true }),
      });
      const data = await res.json() as { error?: string; changed?: { items_new: number; items_updated: number } };
      setMessage(res.ok
        ? `Run finished. ${data.changed?.items_new ?? 0} new item(s), ${data.changed?.items_updated ?? 0} updated. Reload to see changes.`
        : `Error: ${data.error ?? `HTTP ${res.status}`}`);
    } catch (err) {
      setMessage(`Error: ${String(err)}`);
    }
    setRunning(false);
  }

  const isError = message?.startsWith('Error');

  return (
    <div>
      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          background: isError ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isError ? '#fca5a5' : '#86efac'}`,
          borderRadius: '8px',
          color: isError ? '#b91c1c' : '#15803d',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          {message}
        </div>
      )}

      <section style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Monthly refresh</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Runs automatically on the first of each month at 06:00 UTC.
            </p>
          </div>
          <button
            onClick={runNow}
            disabled={running}
            style={{
              padding: '0.5rem 1rem',
              background: running ? '#94a3b8' : '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? 'Running…' : 'Run now'}
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Documents by vendor
        </h2>
        {perVendor.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>No documents stored yet.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {perVendor.map(([name, count]) => (
              <span key={name} style={{
                padding: '0.375rem 0.75rem', background: '#f1f5f9', borderRadius: '999px',
                fontSize: '0.8125rem', color: '#334155',
              }}>
                {name} <strong style={{ color: '#0f172a' }}>{count}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Recent runs</h2>
        {runsError && (
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#b45309' }}>{runsError}</p>
        )}
        {runs.length === 0 && !runsError && (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>No runs recorded yet.</p>
        )}
        {runs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Status</th>
                  <th style={th}>Sources</th>
                  <th style={th}>New</th>
                  <th style={th}>Updated</th>
                  <th style={th}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td style={td}>{run.run_date}</td>
                    <td style={{ ...td, color: STATUS_COLORS[run.status] ?? '#0f172a', fontWeight: 600 }}>
                      {run.status}
                    </td>
                    <td style={td}>{run.sources_checked}</td>
                    <td style={td}>{run.items_new}</td>
                    <td style={td}>{run.items_updated}</td>
                    <td style={td}>{run.report_json.pending.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <select
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
          >
            <option value="">All vendors</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title or document number"
            style={{ flex: '1 1 240px', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
          />
        </div>

        {!remoteBacked && (
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#b45309' }}>
            Showing the curated catalogue. Apply migrations 019 and 020 and set the Supabase
            service-role key to see crawled documents here.
          </p>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
            <thead>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Vendor</th>
                <th style={th}>Type</th>
                <th style={th}>Doc no.</th>
                <th style={th}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id}>
                  <td style={td}>
                    <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#0d9488', textDecoration: 'none' }}>
                      {doc.title}
                    </a>
                  </td>
                  <td style={td}>{doc.vendor}</td>
                  <td style={td}>{doc.doc_type.replace(/_/g, ' ')}</td>
                  <td style={td}>{doc.document_number ?? '—'}</td>
                  <td style={td}>{doc.authority_tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>No documents match.</p>
        )}
      </section>
    </div>
  );
}

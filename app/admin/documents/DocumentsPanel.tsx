'use client';

import { useMemo, useRef, useState } from 'react';
import type { DocumentRecord } from '@/lib/document-types';
import type { RefreshRun } from '@/agents/acquisition/pipeline/run-state';
import { matchFileToDocument } from '@/lib/document-match';
import { extractPdfTextInBrowser } from '@/lib/pdf-text-browser';

const STATUS_COLORS: Record<string, string> = {
  success: '#059669',
  partial: '#d97706',
  running: '#2563eb',
  failed: '#dc2626',
};

const UPLOAD_COLORS: Record<string, string> = {
  matching: '#2563eb',
  extracting: '#2563eb',
  uploading: '#2563eb',
  done: '#059669',
  error: '#dc2626',
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
  /** Passages per document id. null when the counts could not be read. */
  chunkCounts: Record<string, number> | null;
  /** One-line summary of how many documents cannot be cited yet. */
  banner: string | null;
}

/** Per-file state of an upload, shown while the browser extracts and posts text. */
interface UploadRow {
  file: string;
  status: 'matching' | 'extracting' | 'uploading' | 'done' | 'error';
  detail: string;
}

/**
 * Searchable vs metadata only. A document with no passages cannot be cited by an
 * answer, which used to be invisible here. `null` counts mean the count could not
 * be read, which is not the same as zero.
 */
function renderState(counts: Record<string, number> | null, id: string): React.ReactNode {
  if (!counts) return <span style={{ color: '#64748b' }}>unknown</span>;

  const n = counts[id] ?? 0;
  return n > 0
    ? <span style={{ color: '#059669', fontWeight: 600 }}>searchable <span style={{ color: '#64748b', fontWeight: 400 }}>({n})</span></span>
    : <span style={{ color: '#b45309', fontWeight: 600 }}>metadata only</span>;
}

export default function DocumentsPanel({
  documents, runs, runsError, remoteBacked, chunkCounts, banner,
}: Props) {
  const [vendor, setVendor] = useState('');
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  /**
   * Ingest PDFs the operator already holds. The file never leaves the browser:
   * text is extracted here and only the text is posted, which keeps a large
   * manual under the platform's request body limit.
   */
  async function ingestFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;

    const list = Array.from(files);
    setUploading(true);
    setMessage(null);
    setUploads(list.map(f => ({ file: f.name, status: 'matching', detail: '' })));

    const update = (i: number, patch: Partial<UploadRow>): void =>
      setUploads(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    let ingested = 0;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const match = matchFileToDocument(file.name, documents);

      if (!match.matched) {
        update(i, {
          status: 'error',
          detail: match.reason === 'ambiguous'
            ? `filename matches several documents (${match.candidates.join(', ')}); rename it to one document number`
            : 'no stored document matches this filename',
        });
        continue;
      }

      const target = match.document;

      try {
        update(i, { status: 'extracting', detail: target.title });
        const extracted = await extractPdfTextInBrowser(file, (done, total) =>
          update(i, { status: 'extracting', detail: `${target.title} — page ${done}/${total}` }));

        update(i, { status: 'uploading', detail: target.title });
        const res = await fetch('/api/documents/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: target.id,
            page_count: extracted.pageCount,
            pages: extracted.pages,
          }),
        });
        const data = await res.json() as { error?: string; chunks_written?: number; page_count?: number };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

        ingested++;
        update(i, {
          status: 'done',
          detail: `${target.title} — ${data.chunks_written ?? 0} passage(s) from ${data.page_count ?? 0} page(s)`,
        });
      } catch (err) {
        update(i, { status: 'error', detail: err instanceof Error ? err.message : String(err) });
      }
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
    if (ingested > 0) {
      setMessage(`Ingested ${ingested} document(s). Reload to update the searchable counts.`);
    }
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

      {banner && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          {banner} Ingest the PDFs below, or run <code>npm run ingest:pdfs -- ./manuals</code>.
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
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Ingest PDFs you already hold
        </h2>
        <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.8125rem', color: '#64748b', maxWidth: '54rem' }}>
          Agilent and Restek block automated clients, so their manuals cannot be crawled. Download
          them in your browser and add them here: each file is matched to a stored document by its
          document number or by the filename in the vendor URL. The PDF stays on your machine —
          only the extracted text is sent, and only the passages are stored.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={uploading || !remoteBacked}
          onChange={e => void ingestFiles(e.target.files)}
          style={{ fontSize: '0.875rem' }}
        />
        {!remoteBacked && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#b45309' }}>
            Supabase is not configured, so ingested passages could not be stored.
          </p>
        )}

        {uploads.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr>
                  <th style={th}>File</th>
                  <th style={th}>Status</th>
                  <th style={th}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(u => (
                  <tr key={u.file}>
                    <td style={td}>{u.file}</td>
                    <td style={{ ...td, fontWeight: 600, color: UPLOAD_COLORS[u.status] }}>{u.status}</td>
                    <td style={td}>{u.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                <th style={th}>State</th>
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
                  <td style={td}>{renderState(chunkCounts, doc.id)}</td>
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

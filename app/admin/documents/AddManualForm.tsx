'use client';

// Add a manual for any instrument (v8.2). The catalogue covers one instrument
// family; this registers any other manual from its PDF. As with catalogued
// documents, the PDF stays in the browser: only its extracted text is sent, and
// only the passages are stored, then searched before any AI call.

import { useRef, useState } from 'react';
import { DOC_TYPES, type DocType } from '@/lib/document-types';
import { MANUAL_TECHNIQUES } from '@/lib/manual-registration';
import { extractPdfTextInBrowser } from '@/lib/pdf-text-browser';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  troubleshooting_guide: 'Troubleshooting guide',
  service_manual: 'Service manual',
  user_guide: 'User / operator manual',
  maintenance_guide: 'Maintenance guide',
  quick_reference: 'Quick reference',
  application_note: 'Application note',
  tech_note: 'Technical note',
  faq: 'FAQ',
  article: 'Article',
};

const field: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px',
  fontSize: '0.875rem', boxSizing: 'border-box', color: '#0f172a', background: '#fff',
};
const label: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' };

export default function AddManualForm({ disabled, card }: { disabled: boolean; card: React.CSSProperties }) {
  const [vendor, setVendor] = useState('');
  const [techniques, setTechniques] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [docType, setDocType] = useState<DocType>('user_guide');
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function toggleTechnique(t: string) {
    setTechniques(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  }

  function chooseFile(f: File | null) {
    setFile(f);
    // A filename is a reasonable first guess at the title; the admin can edit it.
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setStatus({ ok: false, text: 'Choose the PDF to add.' }); return; }
    setBusy(true);
    setStatus(null);
    try {
      const extracted = await extractPdfTextInBrowser(file, (done, total) =>
        setStatus({ ok: true, text: `Reading page ${done}/${total}…` }));
      setStatus({ ok: true, text: 'Storing passages…' });
      const res = await fetch('/api/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_document: { vendor, techniques, model, doc_type: docType, title, document_number: docNumber, url },
          page_count: extracted.pageCount,
          pages: extracted.pages,
        }),
      });
      const data = await res.json() as { error?: string; chunks_written?: number; page_count?: number };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setStatus({ ok: true, text: `Added “${title}”: ${data.chunks_written ?? 0} searchable passage(s) from ${data.page_count ?? 0} page(s). Reload to see it in the list.` });
      setFile(null);
      setTitle('');
      setDocNumber('');
      setUrl('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    // The card is a light surface in both themes; without an explicit colour its
    // text inherits the dark theme's light text and is unreadable.
    <section style={{ ...card, color: '#0f172a' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Add a manual for any instrument</h2>
      <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.8125rem', color: '#64748b', maxWidth: '54rem' }}>
        For a manual that is not in the list below: operator, maintenance and troubleshooting manuals for
        any of the techniques LabPulse covers. Its text is stored in LabPulse and searched first for every
        matching question, before any AI. Only add documents you are entitled to use.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <label><span style={label}>PDF *</span>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" disabled={disabled || busy}
            onChange={e => chooseFile(e.target.files?.[0] ?? null)} style={{ fontSize: '0.875rem', maxWidth: '100%' }} />
        </label>
        <label><span style={label}>Manufacturer *</span>
          <input style={field} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Waters" required disabled={busy} />
        </label>
        <label><span style={label}>Model (optional)</span>
          <input style={field} value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. ACQUITY UPLC H-Class PLUS" disabled={busy} />
        </label>
        <label><span style={label}>Document type *</span>
          <select style={field} value={docType} onChange={e => setDocType(e.target.value as DocType)} disabled={busy}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label style={{ gridColumn: '1 / -1' }}><span style={label}>Title *</span>
          <input style={field} value={title} onChange={e => setTitle(e.target.value)} required disabled={busy} />
        </label>
        <label><span style={label}>Document number (optional)</span>
          <input style={field} value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="e.g. 715005008" disabled={busy} />
        </label>
        <label><span style={label}>Public link (optional)</span>
          <input style={field} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" disabled={busy} />
        </label>
        <fieldset style={{ gridColumn: '1 / -1', border: 'none', margin: 0, padding: 0, minWidth: 0 }} disabled={busy}>
          <legend style={label}>Techniques it covers *</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {MANUAL_TECHNIQUES.map(t => (
              <label key={t} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem',
                border: `1px solid ${techniques.includes(t) ? '#0f9188' : '#cbd5e1'}`, borderRadius: '999px',
                background: techniques.includes(t) ? '#f0fdfa' : '#fff', fontSize: '0.8125rem', cursor: 'pointer',
              }}>
                <input type="checkbox" checked={techniques.includes(t)} onChange={() => toggleTechnique(t)} style={{ margin: 0 }} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" disabled={disabled || busy || !file || !vendor.trim() || !title.trim() || techniques.length === 0}
            style={{ padding: '0.5rem 1rem', background: '#0f9188', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Adding…' : 'Add manual'}
          </button>
          {status && <span role="status" style={{ fontSize: '0.8125rem', color: status.ok ? '#15803d' : '#b91c1c' }}>{status.text}</span>}
        </div>
      </form>
    </section>
  );
}

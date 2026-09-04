'use client';

import { useState, useRef, useCallback } from 'react';

// ── Props ────────────────────────────────────────────────────────────────────

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ACCEPT = '.csv,.pdf,.txt,.cdf,.xlsx';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FileUpload({ onFileSelect, accept }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveAccept = accept ?? DEFAULT_ACCEPT;

  const handleFile = useCallback((f: File) => {
    setError('');
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File exceeds 10 MB limit (${formatSize(f.size)}).`);
      return;
    }
    setFile(f);
    onFileSelect(f);
  }, [onFileSelect]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }

  function clearFile() {
    setFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  // ── Styles ─────────────────────────────────────────────────────

  const zone: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '2rem 1.5rem', borderRadius: '12px',
    border: `2px dashed ${dragging ? 'var(--color-teal-600)' : 'var(--color-slate-200)'}`,
    background: dragging ? '#f0fdfa' : 'var(--color-slate-50)',
    cursor: 'pointer', transition: 'border-color .2s, background .2s',
    textAlign: 'center',
  };

  const selectedBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderRadius: '10px',
    border: '1px solid var(--color-slate-200)', background: '#fff',
  };

  const removeBtn: React.CSSProperties = {
    padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
    background: '#fee2e2', color: '#dc2626', fontWeight: 600,
    fontSize: '0.75rem', cursor: 'pointer',
  };

  // ── Upload arrow SVG ───────────────────────────────────────────

  const uploadIcon = (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-600)"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ marginBottom: '0.75rem' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );

  return (
    <div style={{ maxWidth: '520px' }}>
      <input
        ref={inputRef}
        type="file"
        accept={effectiveAccept}
        onChange={onInputChange}
        style={{ display: 'none' }}
      />

      {!file ? (
        <div
          style={zone}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          {uploadIcon}
          <p style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            color: 'var(--color-navy-900)', fontSize: '0.95rem',
            margin: '0 0 0.35rem',
          }}>
            Drag &amp; drop a file here
          </p>
          <p style={{
            color: 'var(--color-slate-500)', fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)', margin: 0,
          }}>
            or click to browse &middot; Max 10 MB
          </p>
          <p style={{
            color: 'var(--color-slate-500)', fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)', margin: '0.35rem 0 0',
          }}>
            {effectiveAccept}
          </p>
        </div>
      ) : (
        <div style={selectedBox}>
          <div>
            <div style={{
              fontWeight: 700, color: 'var(--color-navy-900)',
              fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            }}>
              {file.name}
            </div>
            <div style={{
              fontSize: '0.75rem', color: 'var(--color-slate-500)',
              fontFamily: 'var(--font-mono)', marginTop: '0.15rem',
            }}>
              {formatSize(file.size)}
            </div>
          </div>
          <button type="button" onClick={clearFile} style={removeBtn}>Remove</button>
        </div>
      )}

      {error && (
        <p style={{
          color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem',
          fontFamily: 'var(--font-mono)',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}

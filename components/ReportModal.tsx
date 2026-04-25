'use client';

import { useState } from 'react';
import type { ReportStatus } from '@/lib/types';
import { updateReportStatus } from '@/lib/reportStore';

interface Props {
  reportId: string;
  onClose: () => void;
  onSave: () => void;
}

const STATUS_OPTIONS: {
  value: ReportStatus; label: string; sub: string;
  color: string; bg: string; border: string; icon: string;
}[] = [
  { value: 'resolved',     label: 'Resolved',   sub: 'Issue fixed',    color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✓' },
  { value: 'partially',    label: 'Partial',    sub: 'Still ongoing',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: '~'  },
  { value: 'not_resolved', label: 'Unresolved', sub: 'Issue persists', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '✗' },
];

export default function ReportModal({ reportId, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<ReportStatus | null>(null);
  const [note,     setNote]     = useState('');

  function handleSave() {
    if (!selected) return;
    updateReportStatus(reportId, selected, note.trim() || undefined);
    onSave();
  }

  return (
    <>
      {/* Blurred backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(15,23,42,.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -12px 48px rgba(15,23,42,.18)',
        padding: '0 1.5rem 2.25rem',
        animation: 'sheetUp .24s cubic-bezier(.16,1,.3,1)',
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.875rem 0 0.75rem' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e2e8f0' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '0.875rem', right: '1.25rem',
            width: '28px', height: '28px', border: 'none',
            background: '#f1f5f9', borderRadius: '50%',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#64748b', fontSize: '1.05rem', lineHeight: 1,
          }}
        >×</button>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '1.375rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.0625rem', fontWeight: 800,
            color: 'var(--color-navy-900)', letterSpacing: '-0.01em',
            margin: 0,
          }}>
            Did this diagnosis help?
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '0.3rem 0 0' }}>
            Mark the outcome — helps track your sessions
          </p>
        </div>

        {/* Status grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: '0.625rem', marginBottom: '1.125rem',
        }}>
          {STATUS_OPTIONS.map(opt => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.375rem',
                  padding: '0.9rem 0.5rem',
                  border: `2px solid ${active ? opt.color : opt.border}`,
                  borderRadius: '14px',
                  background: active ? opt.bg : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all .13s ease',
                  boxShadow: active ? `0 0 0 3px ${opt.color}22` : 'none',
                }}
              >
                <span style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: active ? opt.color : '#f1f5f9',
                  color: active ? '#fff' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.125rem', fontWeight: 700,
                  transition: 'all .13s ease',
                }}>
                  {opt.icon}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8125rem', fontWeight: 700,
                  color: active ? opt.color : 'var(--color-navy-900)',
                }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '-0.125rem' }}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Optional note */}
        <div style={{ marginBottom: '1.125rem' }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note — what fixed it, or what to try next…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.625rem 0.875rem',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '9px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
              color: 'var(--color-navy-900)',
              resize: 'none', outline: 'none', lineHeight: 1.5,
              transition: 'border-color .15s, background .15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-teal-500)';
              e.currentTarget.style.background  = '#fff';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background  = '#f8fafc';
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            disabled={!selected}
            style={{
              flex: 1, padding: '0.9rem',
              background: selected ? 'var(--color-teal-600)' : '#e2e8f0',
              color: selected ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: '10px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 700,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all .15s ease',
              boxShadow: selected ? '0 2px 8px rgba(15,145,136,.28)' : 'none',
            }}
          >
            Save &amp; Close
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.9rem 1.25rem',
              background: 'transparent',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 600,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { ReportStatus } from '@/lib/types';
import { updateReportStatus } from '@/lib/reportStore';

interface Props {
  reportId: string;
  onClose: () => void;
  onSave: () => void;
}

const STATUS_OPTIONS: { value: ReportStatus; label: string; desc: string; color: string; bg: string; icon: string }[] = [
  { value: 'resolved',     label: 'Resolved',           desc: 'Issue fully fixed',           color: '#16a34a', bg: '#dcfce7', icon: '✓' },
  { value: 'partially',    label: 'Partially Resolved',  desc: 'Improved, still monitoring',  color: '#ea580c', bg: '#ffedd5', icon: '~' },
  { value: 'not_resolved', label: 'Not Resolved',        desc: 'Problem persists',            color: '#dc2626', bg: '#fee2e2', icon: '✗' },
];

export default function ReportModal({ reportId, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<ReportStatus | null>(null);
  const [note, setNote]         = useState('');

  function handleSave() {
    if (!selected) return;
    updateReportStatus(reportId, selected, note.trim() || undefined);
    onSave();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%', maxWidth: '440px',
        padding: '1.75rem',
        boxShadow: '0 24px 60px rgba(0,0,0,.2)',
        animation: 'modalIn .18s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem', fontWeight: 800,
              color: 'var(--color-navy-900)',
              letterSpacing: '-0.02em',
            }}>
              Update Resolution Status
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-400)', marginTop: '0.25rem' }}>
              How was this troubleshooting session resolved?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', border: 'none',
              background: 'var(--color-slate-100)', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--color-slate-500)',
              fontSize: '1rem', flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Status options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
          {STATUS_OPTIONS.map(opt => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: `2px solid ${active ? opt.color : 'var(--color-slate-200)'}`,
                  background: active ? opt.bg : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .12s ease',
                }}
              >
                <span style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: active ? opt.color : 'var(--color-slate-100)',
                  color: active ? '#fff' : 'var(--color-slate-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                  transition: 'all .12s ease',
                }}>
                  {opt.icon}
                </span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9375rem', fontWeight: 700,
                    color: active ? opt.color : 'var(--color-navy-900)',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)', marginTop: '1px' }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div style={{ marginBottom: '1.375rem' }}>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--color-slate-500)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            marginBottom: '0.375rem',
          }}>
            Note <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-slate-400)' }}>(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="What fixed it, or what still needs attention…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.625rem 0.875rem',
              background: 'var(--color-slate-50)',
              border: '1.5px solid var(--color-slate-200)',
              borderRadius: '8px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              color: 'var(--color-navy-900)',
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-teal-500)';
              e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(20,184,166,.15)';
              e.currentTarget.style.background  = '#fff';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-slate-200)';
              e.currentTarget.style.boxShadow   = 'none';
              e.currentTarget.style.background  = 'var(--color-slate-50)';
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            disabled={!selected}
            style={{
              flex: 1, padding: '0.8125rem',
              background: selected ? 'var(--color-navy-900)' : 'var(--color-slate-200)',
              color: selected ? '#fff' : 'var(--color-slate-400)',
              border: 'none', borderRadius: '9px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 700,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'background .15s ease',
            }}
          >
            Save Status
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.8125rem 1.25rem',
              background: 'transparent',
              border: '1.5px solid var(--color-slate-200)',
              borderRadius: '9px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 600,
              color: 'var(--color-slate-500)',
              cursor: 'pointer',
            }}
          >
            Later
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
  );
}

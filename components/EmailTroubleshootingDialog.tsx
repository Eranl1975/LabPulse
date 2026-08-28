'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RankedAnswer } from '@/lib/types';

interface Props {
  answer: RankedAnswer;
  technique: string;
  vendor: string;
  model: string;
  issueCategory: string;
  onClose: () => void;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10000,
  background: 'rgba(15,23,42,.5)',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const DIALOG: React.CSSProperties = {
  position: 'relative',
  width: '90vw', maxWidth: '460px',
  background: '#fff',
  borderRadius: '14px',
  boxShadow: '0 20px 60px rgba(15,23,42,.25)',
  padding: '1.5rem',
  animation: 'emailDialogIn .2s ease',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--color-slate-300)',
  borderRadius: '8px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  color: 'var(--color-navy-900)',
  outline: 'none',
  transition: 'border-color .15s',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-slate-600)',
  marginBottom: '0.25rem',
};

export default function EmailTroubleshootingDialog({ answer, technique, vendor, model, issueCategory, onClose }: Props) {
  const instrumentLabel = [technique, vendor, model].filter(Boolean).join(' — ');
  const defaultSubject = `LabPulse Troubleshooting – ${instrumentLabel}`;

  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose, sending]);

  // Auto-close on success
  useEffect(() => {
    if (result?.type === 'success') {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  const handleSend = useCallback(async () => {
    if (sending || !email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setResult({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/troubleshooting/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          subject: subject.trim() || defaultSubject,
          message: message.trim() || undefined,
          answer,
          technique,
          vendor: vendor || undefined,
          model: model || undefined,
          issueCategory: issueCategory || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error ?? `Failed to send email (HTTP ${res.status})`);
      }

      setResult({ type: 'success', text: 'Email sent successfully!' });
    } catch (err) {
      setResult({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send email.' });
    } finally {
      setSending(false);
    }
  }, [email, subject, message, answer, technique, vendor, model, issueCategory, defaultSubject, sending]);

  return (
    <>
      <div style={OVERLAY} onClick={sending ? undefined : onClose} data-no-print>
        <div style={DIALOG} onClick={e => e.stopPropagation()}>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.125rem', fontWeight: 800,
            color: 'var(--color-navy-900)',
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
          }}>
            Email Troubleshooting Report
          </h3>

          {/* Close button */}
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              width: '28px', height: '28px', border: 'none',
              background: '#f1f5f9', borderRadius: '50%',
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: '1.05rem', lineHeight: 1,
            }}
          >&times;</button>

          {/* Email field */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={LABEL_STYLE}>Recipient Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setResult(null); }}
              placeholder="colleague@example.com"
              disabled={sending}
              style={INPUT_STYLE}
            />
          </div>

          {/* Subject field */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={LABEL_STYLE}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={sending}
              style={INPUT_STYLE}
            />
          </div>

          {/* Message field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              disabled={sending}
              rows={3}
              style={{
                ...INPUT_STYLE,
                resize: 'vertical',
                minHeight: '60px',
              }}
            />
          </div>

          {/* Result message */}
          {result && (
            <div style={{
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              lineHeight: 1.5,
              ...(result.type === 'success'
                ? { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }
                : { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
              ),
            }}>
              {result.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              disabled={sending}
              style={{
                padding: '0.4rem 0.875rem',
                background: 'transparent',
                border: '1.5px solid var(--color-slate-300)',
                borderRadius: '8px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--color-slate-500)',
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'border-color .15s, color .15s',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              style={{
                padding: '0.4rem 0.875rem',
                background: sending || !email.trim() ? 'var(--color-slate-300)' : 'var(--color-teal-600)',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8rem', fontWeight: 600,
                color: '#fff',
                cursor: sending || !email.trim() ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              {sending && (
                <span style={{
                  display: 'inline-block',
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                }} />
              )}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes emailDialogIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

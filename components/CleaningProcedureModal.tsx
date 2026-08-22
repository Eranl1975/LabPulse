'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CleaningProcedureContent, CleaningProcedureResponse } from '@/lib/cleaning-types';
import EmailProcedureDialog from './EmailProcedureDialog';

interface Props {
  technique: string;
  vendor: string;
  model: string;
  onClose: () => void;
}

// ── Source badge colours ──────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  official_manufacturer:     { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Official Manufacturer' },
  manufacturer_documentation: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: 'Manufacturer Documentation' },
  ai_generated:              { color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', label: 'AI-Generated' },
};

// ── Section styling ──────────────────────────────────────────────────────────

const MODAL_SECTION: React.CSSProperties = {
  marginBottom: '1.25rem',
  padding: '1rem 1.25rem',
  background: '#fff',
  border: '1px solid var(--color-slate-200)',
  borderRadius: '10px',
};

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: 'var(--color-slate-600)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: '0.75rem',
};

export default function CleaningProcedureModal({ technique, vendor, model, onClose }: Props) {
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [procedure, setProcedure] = useState<CleaningProcedureContent | null>(null);
  const [cached,    setCached]    = useState(false);
  const [genDate,   setGenDate]   = useState('');
  const [aiModel,   setAiModel]   = useState<string | undefined>();
  const [emailOpen, setEmailOpen] = useState(false);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const fetchProcedure = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cleaning-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique: technique.trim(),
          vendor:    vendor.trim() || null,
          model:     model.trim()  || null,
          refresh,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CleaningProcedureResponse;
      setProcedure(data.procedure);
      setCached(data.cached);
      setGenDate(data.generated_at);
      setAiModel(data.ai_model_used);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve cleaning procedure.');
    } finally {
      setLoading(false);
    }
  }, [technique, vendor, model]);

  useEffect(() => { fetchProcedure(); }, [fetchProcedure]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const badge = procedure ? SOURCE_BADGE[procedure.source_type] ?? SOURCE_BADGE.ai_generated : null;

  return (
    <>
      {/* Blurred backdrop */}
      <div
        data-no-print
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(15,23,42,.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div data-cleaning-modal style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '90vw',
        maxWidth: '720px',
        maxHeight: '85vh',
        overflowY: 'auto',
        background: 'var(--color-slate-50)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(15,23,42,.22)',
        padding: '1.5rem',
        animation: 'modalIn .22s cubic-bezier(.16,1,.3,1)',
      }}>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          data-no-print
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            width: '28px', height: '28px', border: 'none',
            background: '#f1f5f9', borderRadius: '50%',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#64748b', fontSize: '1.05rem', lineHeight: 1,
          }}
        >&times;</button>

        {/* ── Loading state ──────────────────────────────────────────────── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{
              width: '28px', height: '28px', margin: '0 auto 1rem',
              border: '3px solid var(--color-slate-200)',
              borderTopColor: 'var(--color-teal-500)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
            }} />
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem', fontWeight: 600,
              color: 'var(--color-slate-500)',
            }}>
              Searching official manufacturer documentation...
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-400)', marginTop: '0.375rem' }}>
              This may take a few seconds on first request.
            </p>
          </div>
        )}

        {/* ── Error state ────────────────────────────────────────────────── */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{
              padding: '0.875rem 1rem',
              background: 'rgba(220,38,38,.07)',
              border: '1px solid rgba(220,38,38,.22)',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '0.9rem', fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}>
              {error}
            </div>
            <button
              onClick={() => fetchProcedure(true)}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'var(--color-teal-600)',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Procedure content ──────────────────────────────────────────── */}
        {!loading && !error && procedure && (
          <>
            {/* Header */}
            <div style={{ marginBottom: '1.25rem', paddingRight: '2rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                fontWeight: 800,
                color: 'var(--color-navy-900)',
                letterSpacing: '-0.02em',
                margin: '0 0 0.5rem',
              }}>
                Cleaning Procedure
              </h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9375rem', fontWeight: 600,
                  color: 'var(--color-navy-900)',
                }}>
                  {procedure.instrument}
                </span>
                {procedure.manufacturer !== 'Generic' && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
                    {procedure.manufacturer}
                  </span>
                )}
                {procedure.model !== 'General' && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-400)' }}>
                    {procedure.model}
                  </span>
                )}
              </div>

              {/* Source badge */}
              {badge && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.25rem 0.75rem',
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  borderRadius: '100px',
                  fontSize: '0.75rem', fontWeight: 600,
                  color: badge.color,
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: badge.color,
                    flexShrink: 0,
                  }} />
                  {badge.label}
                </div>
              )}

              {/* AI disclaimer */}
              {procedure.source_type === 'ai_generated' && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#92400e',
                  lineHeight: 1.5,
                }}>
                  <strong>AI-Generated Cleaning Procedure</strong> — Official manufacturer cleaning
                  instructions were not located. Verify this procedure against the manufacturer&apos;s
                  documentation before performing maintenance.
                </div>
              )}

              {/* Source link */}
              {procedure.source_url && (
                <div style={{ marginTop: '0.5rem' }}>
                  {procedure.source_title && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginRight: '0.5rem' }}>
                      {procedure.source_title}
                    </span>
                  )}
                  <a
                    href={procedure.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.8125rem', color: 'var(--color-teal-600)',
                      textDecoration: 'underline',
                    }}
                  >
                    View Source
                  </a>
                </div>
              )}

              {/* Confidence */}
              {procedure.confidence_note && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)', marginTop: '0.375rem' }}>
                  Confidence: {Math.round(procedure.confidence * 100)}% — {procedure.confidence_note}
                </p>
              )}
            </div>

            {/* ── Required Materials ───────────────────────────────────────── */}
            {procedure.materials_needed.length > 0 && (
              <div style={MODAL_SECTION}>
                <h3 style={SECTION_TITLE}>Required Materials</h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                  {procedure.materials_needed.map((m, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', color: 'var(--color-navy-900)', marginBottom: '0.375rem', lineHeight: 1.5 }}>
                      <strong>{m.name}</strong>
                      {m.specification && <span style={{ color: 'var(--color-slate-500)' }}> ({m.specification})</span>}
                      {m.purpose && <span style={{ color: 'var(--color-slate-400)' }}> — {m.purpose}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Before Cleaning ──────────────────────────────────────────── */}
            {procedure.before_cleaning.length > 0 && (
              <div style={MODAL_SECTION}>
                <h3 style={SECTION_TITLE}>Before Cleaning</h3>
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {procedure.before_cleaning.map((step, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', color: 'var(--color-navy-900)', marginBottom: '0.375rem', lineHeight: 1.5 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ── Cleaning Steps ───────────────────────────────────────────── */}
            {procedure.cleaning_steps.length > 0 && (
              <div style={MODAL_SECTION}>
                <h3 style={SECTION_TITLE}>Cleaning Steps</h3>
                {procedure.cleaning_steps.map((step) => (
                  <div key={step.step_number} style={{
                    display: 'flex', gap: '0.75rem',
                    marginBottom: '0.875rem',
                    paddingBottom: '0.875rem',
                    borderBottom: '1px solid var(--color-slate-100)',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '1.5rem', height: '1.5rem', flexShrink: 0,
                      borderRadius: '50%',
                      background: 'var(--color-teal-600)', color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.7rem', fontWeight: 700,
                      marginTop: '0.125rem',
                    }}>
                      {step.step_number}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.875rem', fontWeight: 700,
                          color: 'var(--color-navy-900)',
                        }}>
                          {step.title}
                        </span>
                        {step.duration && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600,
                            color: 'var(--color-teal-600)',
                            background: 'var(--color-teal-50)',
                            border: '1px solid rgba(20,184,166,.2)',
                            borderRadius: '100px',
                            padding: '0.125rem 0.5rem',
                          }}>
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', margin: 0, lineHeight: 1.55 }}>
                        {step.description}
                      </p>
                      {step.warnings && step.warnings.length > 0 && (
                        <div style={{ marginTop: '0.375rem' }}>
                          {step.warnings.map((w, wi) => (
                            <div key={wi} style={{
                              fontSize: '0.78rem', color: '#b91c1c',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              padding: '0.25rem 0.5rem',
                              marginTop: '0.25rem',
                            }}>
                              {w}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── After Cleaning ───────────────────────────────────────────── */}
            {procedure.after_cleaning.length > 0 && (
              <div style={MODAL_SECTION}>
                <h3 style={SECTION_TITLE}>After Cleaning</h3>
                <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {procedure.after_cleaning.map((step, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', color: 'var(--color-navy-900)', marginBottom: '0.375rem', lineHeight: 1.5 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ── What You Must Not Do ─────────────────────────────────────── */}
            {procedure.what_not_to_do.length > 0 && (
              <div style={{
                ...MODAL_SECTION,
                background: '#fef2f2',
                border: '1px solid #fecaca',
              }}>
                <h3 style={{ ...SECTION_TITLE, color: '#b91c1c' }}>
                  What You Must Not Do
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                  {procedure.what_not_to_do.map((item, i) => (
                    <li key={i} style={{
                      fontSize: '0.875rem', color: '#991b1b',
                      marginBottom: '0.375rem', lineHeight: 1.5,
                      fontWeight: 500,
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Cleaning Frequency ──────────────────────────────────────── */}
            {procedure.cleaning_frequency && (
              <div style={MODAL_SECTION}>
                <h3 style={SECTION_TITLE}>Cleaning Frequency</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <FreqCard label="Routine" value={procedure.cleaning_frequency.routine} />
                  <FreqCard label="After Contamination" value={procedure.cleaning_frequency.after_contamination} />
                  <FreqCard label="Preventive" value={procedure.cleaning_frequency.preventive} />
                </div>
              </div>
            )}

            {/* ── Safety Warnings ─────────────────────────────────────────── */}
            {procedure.safety_warnings.length > 0 && (
              <div style={{
                ...MODAL_SECTION,
                background: '#fffbeb',
                border: '1px solid #fcd34d',
              }}>
                <h3 style={{ ...SECTION_TITLE, color: '#92400e' }}>Safety Warnings</h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                  {procedure.safety_warnings.map((w, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.375rem', lineHeight: 1.5 }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Notes ───────────────────────────────────────────────────── */}
            {procedure.notes.length > 0 && (
              <div style={{
                ...MODAL_SECTION,
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
              }}>
                <h3 style={SECTION_TITLE}>Notes</h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                  {procedure.notes.map((n, i) => (
                    <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '0.25rem', lineHeight: 1.5 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.5rem',
              marginTop: '0.75rem', paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-slate-200)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                {cached ? 'Cached' : 'Generated'}{' '}
                {genDate && new Date(genDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                {aiModel && ` via ${aiModel}`}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} data-no-print>
                <button
                  onClick={handlePrint}
                  title="Print Cleaning Procedure"
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: 'transparent',
                    border: '1.5px solid var(--color-slate-300)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--color-slate-500)',
                    cursor: 'pointer',
                    transition: 'border-color .15s, color .15s',
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print
                </button>
                <button
                  onClick={() => setEmailOpen(true)}
                  title="Send by Email"
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: 'transparent',
                    border: '1.5px solid var(--color-slate-300)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--color-slate-500)',
                    cursor: 'pointer',
                    transition: 'border-color .15s, color .15s',
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Email
                </button>
                <button
                  onClick={() => fetchProcedure(true)}
                  disabled={loading}
                  style={{
                    padding: '0.4rem 0.875rem',
                    background: 'transparent',
                    border: '1.5px solid var(--color-slate-300)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem', fontWeight: 600,
                    color: 'var(--color-slate-500)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'border-color .15s, color .15s',
                  }}
                >
                  Refresh Procedure
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '0.4rem 0.875rem',
                    background: 'var(--color-teal-600)',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem', fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Email dialog overlay */}
      {emailOpen && procedure && (
        <EmailProcedureDialog
          procedure={procedure}
          generatedAt={genDate}
          onClose={() => setEmailOpen(false)}
        />
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }

        @media print {
          /* Hide non-printable elements */
          [data-no-print] { display: none !important; }

          /* Flatten modal for print */
          [data-cleaning-modal] {
            position: static !important;
            transform: none !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            padding: 0 !important;
            background: white !important;
            animation: none !important;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}</style>
    </>
  );
}

// ── Small sub-component ────────────────────────────────────────────────────────

function FreqCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '0.625rem 0.75rem',
      background: 'var(--color-slate-50)',
      border: '1px solid var(--color-slate-200)',
      borderRadius: '8px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.7rem', fontWeight: 700,
        color: 'var(--color-slate-400)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        marginBottom: '0.25rem',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-navy-900)', lineHeight: 1.45 }}>
        {value}
      </div>
    </div>
  );
}

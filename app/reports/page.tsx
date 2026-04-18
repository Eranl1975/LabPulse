'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState<Record<string, unknown> | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [dryRun,   setDryRun]   = useState(true);
  const [primOnly, setPrimOnly] = useState(false);

  async function triggerRefresh() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun, primary_only: primOnly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setRunning(false);
    }
  }

  // ── Stat card ──────────────────────────────────────────────────────────────
  function StatCard({ label, value, color = 'var(--color-teal-600)' }: { label: string; value: number | string; color?: string }) {
    return (
      <div style={{
        background: '#fff',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '10px',
        padding: '1.125rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.625rem',
          fontWeight: 800,
          color,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {value}
        </span>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-slate-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {label}
        </span>
      </div>
    );
  }

  // ── Priority item ──────────────────────────────────────────────────────────
  function PriorityItem({ item, index }: { item: Record<string, unknown>; index: number }) {
    const typeColors: Record<string, string> = {
      contradiction: '#dc2626',
      gap:           '#d97706',
      stub:          'var(--color-teal-600)',
    };
    const type = String(item.type ?? 'gap');
    return (
      <div style={{
        display: 'flex',
        gap: '0.875rem',
        alignItems: 'flex-start',
        padding: '0.875rem 0',
        borderBottom: '1px solid var(--color-slate-100)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#fff',
          background: typeColors[type] ?? 'var(--color-slate-400)',
          borderRadius: '50%',
          width: '1.5rem',
          height: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-navy-900)', marginBottom: '0.25rem' }}>
            {String(item.description ?? item.source_id ?? 'Unknown item')}
          </div>
          <span style={{
            display: 'inline-block',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: typeColors[type] ?? 'var(--color-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            background: `${typeColors[type] ?? '#94a3b8'}18`,
            padding: '0.15rem 0.5rem',
            borderRadius: '100px',
          }}>
            {type}
          </span>
        </div>
      </div>
    );
  }

  const changed  = result?.changed  as Record<string, number> | undefined;
  const skipped  = result?.skipped  as Record<string, number> | undefined;
  const gaps     = (result?.knowledge_gaps   as string[] | undefined) ?? [];
  const priorities = (result?.next_priorities as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Page header */}
      <div className="lab-page-header">
        <div className="lab-container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(20,184,166,.14)',
            border: '1px solid rgba(20,184,166,.24)',
            borderRadius: '100px',
            padding: '0.3125rem 0.9375rem',
            marginBottom: '1.125rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--color-teal-400)',
              flexShrink: 0,
            }} />
            <span className="lab-eyebrow" style={{ color: 'var(--color-teal-400)' }}>
              Knowledge Base
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
            fontWeight: 800,
            color: '#f97316',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            margin: '0 0 0.75rem',
            paddingLeft: '0.05em',
          }}>
            Monthly Updates
          </h1>
          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
            color: '#ef4444',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: '540px',
          }}>
            Trigger the acquisition pipeline to pull the latest troubleshooting guidance from vendor documentation and scientific literature.
          </p>
        </div>
      </div>

      <div className="lab-page-body">
        <div className="lab-container">
        <div style={{ maxWidth: '820px' }}>

          {/* Control panel */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--color-slate-200)',
            borderRadius: '12px',
            padding: '1.5rem 1.625rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 4px rgba(15,23,42,.05)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-navy-900)',
              marginBottom: '1.125rem',
              letterSpacing: '-0.01em',
            }}>
              Pipeline Options
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* Dry run toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <div
                  onClick={() => setDryRun(v => !v)}
                  style={{
                    width: '36px', height: '20px',
                    borderRadius: '10px',
                    background: dryRun ? 'var(--color-teal-500)' : 'var(--color-slate-300)',
                    position: 'relative',
                    transition: 'background .2s ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: dryRun ? '18px' : '2px',
                    width: '16px', height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    transition: 'left .2s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-slate-700)' }}>
                  Dry run <span style={{ color: 'var(--color-slate-400)', fontWeight: 400 }}>(no DB writes)</span>
                </span>
              </label>

              {/* Primary only toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <div
                  onClick={() => setPrimOnly(v => !v)}
                  style={{
                    width: '36px', height: '20px',
                    borderRadius: '10px',
                    background: primOnly ? 'var(--color-teal-500)' : 'var(--color-slate-300)',
                    position: 'relative',
                    transition: 'background .2s ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: primOnly ? '18px' : '2px',
                    width: '16px', height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    transition: 'left .2s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-slate-700)' }}>
                  Primary sources only <span style={{ color: 'var(--color-slate-400)', fontWeight: 400 }}>(skip community)</span>
                </span>
              </label>
            </div>

            <button
              onClick={triggerRefresh}
              disabled={running}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8125rem 1.625rem',
                background: running ? 'var(--color-slate-300)' : 'var(--color-navy-900)',
                color: '#fff',
                border: 'none',
                borderRadius: '9px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                cursor: running ? 'not-allowed' : 'pointer',
                transition: 'background .15s ease',
              }}
              onMouseEnter={e => { if (!running) e.currentTarget.style.background = 'var(--color-navy-800, #0d2040)'; }}
              onMouseLeave={e => { if (!running) e.currentTarget.style.background = 'var(--color-navy-900)'; }}
            >
              {running ? (
                <>
                  <span style={{
                    width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin .7s linear infinite', display: 'inline-block',
                  }} />
                  Running pipeline…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v4l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 2C4.69 2 2 4.69 2 8s2.69 6 6 6 6-2.69 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Run Acquisition Pipeline
                </>
              )}
            </button>

            {dryRun && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-400)', lineHeight: 1.5 }}>
                Dry run is enabled — the pipeline will execute but no changes will be written to the database.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              background: 'rgba(220,38,38,.08)',
              border: '1px solid rgba(220,38,38,.2)',
              borderRadius: '10px',
              color: '#dc2626',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="fade-in">
              {/* Run summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-teal-500)', flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-slate-600)',
                }}>
                  Run completed — {String(result.run_date ?? '')} · {String(result.persistence_mode ?? '')} mode
                  {result.dry_run === true ? ' · dry run' : ''}
                </span>
              </div>

              {/* Changed stats */}
              {changed && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-slate-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.75rem',
                  }}>
                    Changes
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.875rem',
                    marginBottom: '1.75rem',
                  }}>
                    <StatCard label="New items"       value={changed.items_new       ?? 0} color="var(--color-teal-600)" />
                    <StatCard label="Updated"         value={changed.items_updated    ?? 0} color="#2563eb" />
                    <StatCard label="Deprecated"      value={changed.items_deprecated ?? 0} color="var(--color-slate-400)" />
                  </div>
                </>
              )}

              {/* Skipped stats */}
              {skipped && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-slate-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.75rem',
                  }}>
                    Skipped
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                  }}>
                    <StatCard label="Sources unchanged" value={skipped.sources_unchanged ?? 0}  color="var(--color-slate-400)" />
                    <StatCard label="Duplicates"        value={skipped.items_duplicate   ?? 0}  color="var(--color-slate-400)" />
                    <StatCard label="Weak source"       value={skipped.items_weak_source ?? 0}  color="#d97706" />
                  </div>
                </>
              )}

              {/* Contradictions */}
              {typeof result.contradictions === 'number' && result.contradictions > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(220,38,38,.06)',
                  border: '1px solid rgba(220,38,38,.2)',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M8 2L14 13H2L8 2z" stroke="#dc2626" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 6v3.5M8 11.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#dc2626' }}>
                    {result.contradictions as number} contradiction{(result.contradictions as number) !== 1 ? 's' : ''} detected in knowledge base
                  </span>
                </div>
              )}

              {/* Knowledge gaps */}
              {gaps.length > 0 && (
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.375rem',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--color-navy-900)',
                    marginBottom: '0.875rem',
                  }}>
                    Knowledge Gaps ({gaps.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {gaps.map((gap, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        fontSize: '0.9375rem',
                        color: 'var(--color-slate-700)',
                        lineHeight: 1.65,
                      }}>
                        <span style={{ color: '#d97706', fontWeight: 700, flexShrink: 0 }}>!</span>
                        {gap}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next priorities */}
              {priorities.length > 0 && (
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.375rem',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: 'var(--color-navy-900)',
                    marginBottom: '0.375rem',
                  }}>
                    Recommended Next Priorities
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-400)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                    Items most likely to improve answer quality in the next run.
                  </div>
                  {priorities.map((item, i) => (
                    <PriorityItem key={i} item={item} index={i} />
                  ))}
                </div>
              )}

              {/* Formatted report */}
              {!!result.formatted_report && (
                <details style={{
                  background: 'var(--color-navy-950, #05101e)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,.06)',
                }}>
                  <summary style={{
                    padding: '1rem 1.375rem',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}>
                    Full Report
                  </summary>
                  <pre style={{
                    margin: 0,
                    padding: '0 1.375rem 1.375rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: 'rgba(255,255,255,.75)',
                    lineHeight: 1.7,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {String(result.formatted_report)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

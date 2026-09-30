'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  getColumnFamilySpec,
  groupPhasesByChemistry,
  composeColumnString,
  parseColumnString,
  columnContextKeys,
  EMPTY_COLUMN_PARTS,
  type ColumnFamily,
  type ColumnParts,
  type ColumnPhase,
} from '@/lib/column-catalog';
import { partsFromHit, hitSummary, type CatalogueHit } from '@/lib/column-catalog-hits';

// ── Styles (match QueryFormStep2 tokens) ─────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.6875rem 0.9375rem',
  background: 'var(--color-slate-50)',
  border: '1.5px solid var(--color-slate-200)',
  borderRadius: '8px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9375rem',
  color: 'var(--color-navy-900)',
  outline: 'none',
  transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
};

const SUB_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--color-slate-400)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--color-teal-500)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20,184,166,.15)';
  e.currentTarget.style.background = '#fff';
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--color-slate-200)';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = 'var(--color-slate-50)';
}

// ── Catalogue dialog ─────────────────────────────────────────────────────────

function CatalogueDialog({
  family, phases, onPick, onPickHit, onClose,
}: {
  family: ColumnFamily;
  phases: ColumnPhase[];
  onPick: (phase: ColumnPhase) => void;
  onPickHit: (hit: CatalogueHit) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<CatalogueHit[]>([]);
  const [total, setTotal] = useState(0);
  const [remote, setRemote] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);

  // The vendor catalogue lives in Supabase, so it is searched on the server as
  // the operator types. Two characters is the threshold at which a query is
  // specific enough to be worth a round trip.
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) { setHits([]); setTotal(0); setRemote('idle'); return; }

    const controller = new AbortController();
    setRemote('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/columns/search?family=${family}&q=${encodeURIComponent(query)}&limit=25`,
          { signal: controller.signal },
        );
        if (!res.ok) { setHits([]); setTotal(0); setRemote('unavailable'); return; }
        const body = await res.json();
        if (body.available === false) { setHits([]); setTotal(0); setRemote('unavailable'); return; }
        setHits(Array.isArray(body.columns) ? body.columns : []);
        setTotal(typeof body.total === 'number' ? body.total : 0);
        setRemote('ready');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setHits([]); setTotal(0); setRemote('unavailable');
      }
    }, 250);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, family]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phases;
    return phases.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.vendor.toLowerCase().includes(q) ||
      p.chemistry.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
    );
  }, [phases, search]);

  const groups = useMemo(() => groupPhasesByChemistry(filtered), [filtered]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Column catalogue"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: '#fff', borderRadius: '14px',
          width: 'min(680px, 100%)', maxHeight: 'min(80vh, 640px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(15,23,42,.28)',
        }}
      >
        <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
              color: 'var(--color-navy-900)',
            }}>
              Column catalogue
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginLeft: 'auto' }}>
              {filtered.length} of {phases.length}
            </span>
            <button
              type="button" onClick={onClose} aria-label="Close catalogue"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '1.25rem', lineHeight: 1, color: 'var(--color-slate-400)', padding: '0 0.25rem',
              }}
            >
              &times;
            </button>
          </div>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, vendor, chemistry or part number…"
            style={INPUT_STYLE}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <div style={{ overflowY: 'auto', padding: '0.5rem 0.75rem 1rem' }}>
          {groups.length === 0 && hits.length === 0 && remote !== 'loading' && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.875rem' }}>
              No catalogue match. Close this and type the column name directly — free text is always accepted.
            </div>
          )}
          {groups.map(group => (
            <div key={group.chemistry} style={{ marginTop: '0.75rem' }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--color-teal-600)',
                padding: '0 0.5rem 0.35rem',
              }}>
                {group.chemistry}
              </div>
              {group.phases.map(phase => (
                <button
                  key={`${phase.vendor}-${phase.name}`}
                  type="button"
                  onClick={() => onPick(phase)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '0.5rem 0.75rem', border: 'none', borderRadius: '8px',
                    background: 'transparent', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-slate-50)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy-900)' }}>
                    {phase.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginLeft: '0.5rem' }}>
                    {phase.vendor}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-slate-600)', marginTop: '0.1rem' }}>
                    {phase.description}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {search.trim().length >= 2 && remote !== 'idle' && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-slate-200)', paddingTop: '0.75rem' }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--color-teal-600)',
                padding: '0 0.5rem 0.35rem', display: 'flex', gap: '0.5rem',
              }}>
                <span>Vendor catalogue</span>
                {remote === 'ready' && (
                  <span style={{ color: 'var(--color-slate-400)', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>
                    {total > hits.length ? `${hits.length} of ${total} matches` : `${total} match${total === 1 ? '' : 'es'}`}
                  </span>
                )}
              </div>

              {remote === 'loading' && (
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                  Searching the vendor catalogue…
                </div>
              )}

              {remote === 'unavailable' && (
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                  The vendor catalogue is unavailable right now — the list above and free text still work.
                </div>
              )}

              {remote === 'ready' && hits.length === 0 && (
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                  No vendor catalogue match for this search.
                </div>
              )}

              {hits.map(hit => {
                const summary = hitSummary(hit);
                return (
                  <button
                    key={hit.natural_key}
                    type="button"
                    onClick={() => onPickHit(hit)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.5rem 0.75rem', border: 'none', borderRadius: '8px',
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-slate-50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy-900)' }}>
                      {hit.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginLeft: '0.5rem' }}>
                      {hit.vendor}
                      {hit.kind !== 'analytical' && ` · ${hit.kind}`}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-slate-600)', marginTop: '0.1rem' }}>
                      {[summary, hit.part_number && `P/N ${hit.part_number}`].filter(Boolean).join('  ·  ')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main selector ────────────────────────────────────────────────────────────

export interface ColumnSelectorProps {
  technique: string;
  /** The composed column string, as stored in Step2Data.column. */
  value: string;
  /** Structured parts previously published to extraContext, when available. */
  parts?: Partial<ColumnParts>;
  onChange: (value: string, parts: ColumnParts, contextKeys: Record<string, string>) => void;
  placeholder?: string;
}

/**
 * Structured column entry: a searchable catalogue of commercial stationary
 * phases plus the three dimensions that define a column. The composed string is
 * written back into the existing `column` field so nothing downstream changes,
 * and the parts are published separately for ranking and the AI prompt.
 *
 * Free text remains fully supported — a column that is not in the catalogue can
 * always be typed.
 */
export default function ColumnSelector({
  technique, value, parts, onChange, placeholder,
}: ColumnSelectorProps) {
  const spec = getColumnFamilySpec(technique);
  const [open, setOpen] = useState(false);

  // Prefer the stored parts; fall back to parsing whatever is in `column`, so a
  // hand-typed or previously saved value still populates the dropdowns.
  const current: ColumnParts = useMemo(() => {
    if (!spec) return { ...EMPTY_COLUMN_PARTS, phase: value };
    const parsed = parseColumnString(spec.family, value);
    return {
      phase: parts?.phase || parsed.phase,
      length: parts?.length || parsed.length,
      id: parts?.id || parsed.id,
      film: parts?.film || parsed.film,
      particle: parts?.particle || parsed.particle,
    };
  }, [spec, value, parts]);

  // Techniques without a column family keep plain free text.
  if (!spec) {
    return (
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value, { ...EMPTY_COLUMN_PARTS, phase: e.target.value }, {})}
        style={INPUT_STYLE}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    );
  }

  function emit(next: ColumnParts) {
    const composed = composeColumnString(spec!.family, next);
    const keys = columnContextKeys(spec!.family);
    const context: Record<string, string> = {};
    for (const [contextKey, partKey] of Object.entries(keys)) {
      context[contextKey] = next[partKey];
    }
    onChange(composed, next, context);
  }

  function setPart(key: keyof ColumnParts, v: string) {
    emit({ ...current, [key]: v });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={current.phase}
          placeholder={placeholder ?? spec.phasePlaceholder}
          onChange={e => setPart('phase', e.target.value)}
          style={{ ...INPUT_STYLE, flex: 1 }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Browse ${spec.phases.length} ${spec.label} phases`}
          style={{
            flexShrink: 0,
            padding: '0.6875rem 0.875rem',
            background: 'var(--color-teal-50)',
            color: 'var(--color-teal-600)',
            border: '1.5px solid var(--color-teal-500)',
            borderRadius: '8px',
            fontFamily: 'var(--font-display)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Browse&nbsp;columns
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.5rem', marginTop: '0.5rem',
      }}>
        {spec.dimensions.map(dim => {
          const chosen = current[dim.key];
          // A catalogue SKU (or a hand-typed column) can carry a dimension the
          // curated option list does not have — show it rather than silently
          // dropping the operator's value.
          const options = chosen && !dim.options.includes(chosen)
            ? [chosen, ...dim.options]
            : dim.options;
          return (
            <div key={dim.key}>
              <label style={SUB_LABEL}>{dim.label} ({dim.unit})</label>
              <select
                value={chosen}
                onChange={e => setPart(dim.key, e.target.value)}
                aria-label={`${dim.label} in ${dim.unit}`}
                style={{
                  ...INPUT_STYLE,
                  padding: '0.5rem 0.625rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  color: chosen ? 'var(--color-navy-900)' : 'var(--color-slate-400)',
                }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">—</option>
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {value.trim() && (
        <div style={{
          marginTop: '0.4rem', fontSize: '0.78rem',
          color: 'var(--color-slate-600)', lineHeight: 1.4,
        }}>
          Sent as: <strong>{value}</strong>
        </div>
      )}

      {open && (
        <CatalogueDialog
          family={spec.family}
          phases={spec.phases}
          onClose={() => setOpen(false)}
          onPick={phase => { setOpen(false); emit({ ...current, phase: phase.name }); }}
          onPickHit={hit => {
            // A vendor SKU carries its own dimensions, so it replaces the
            // dropdown selections rather than merging with them.
            setOpen(false);
            emit({ phase: hit.name, ...partsFromHit(spec.family, hit) });
          }}
        />
      )}
    </div>
  );
}

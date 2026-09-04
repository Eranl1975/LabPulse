'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MaintenanceEvent, MaintenanceEventType } from '@/lib/types';

// ── Hook ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'labpulse-maintenance';

function generateId(): string {
  return crypto.randomUUID?.() ?? `mnt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): MaintenanceEvent[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(events: MaintenanceEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function useMaintenanceLog() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);

  useEffect(() => { setEvents(load()); }, []);

  const addEvent = useCallback((evt: Omit<MaintenanceEvent, 'id'>) => {
    setEvents(prev => {
      const next = [...prev, { ...evt, id: generateId() }];
      save(next); return next;
    });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => {
      const next = prev.filter(e => e.id !== id);
      save(next); return next;
    });
  }, []);

  const getRecentSummary = useCallback((instrumentId: string) => {
    return events
      .filter(e => e.instrument_id === instrumentId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [events]);

  return { events, addEvent, deleteEvent, getRecentSummary };
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES: { value: MaintenanceEventType; label: string }[] = [
  { value: 'pm',               label: 'PM (Preventive Maintenance)' },
  { value: 'repair',           label: 'Repair' },
  { value: 'cleaning',         label: 'Cleaning' },
  { value: 'calibration',      label: 'Calibration' },
  { value: 'column_change',    label: 'Column Change' },
  { value: 'lamp_replacement', label: 'Lamp Replacement' },
  { value: 'seal_replacement', label: 'Seal Replacement' },
  { value: 'other',            label: 'Other' },
];

const EMPTY_FORM = {
  instrument_id: '',
  event_type: 'pm' as MaintenanceEventType,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  next_due: '',
};

// ── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--color-slate-500)', marginBottom: '0.25rem',
  fontFamily: 'var(--font-mono)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1px solid var(--color-slate-200)', background: 'var(--color-slate-50)',
  fontSize: '0.875rem', fontFamily: 'var(--font-mono)',
  outline: 'none', transition: 'border .15s, box-shadow .15s',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
  background: 'var(--color-teal-600)', color: '#fff', fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
  background: '#fee2e2', color: '#dc2626', fontWeight: 600,
  fontSize: '0.75rem', cursor: 'pointer',
};

const tagStyle = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '6px',
  fontSize: '0.7rem', fontWeight: 700, background: bg, color: fg,
  textTransform: 'uppercase', letterSpacing: '0.03em',
});

// ── Component ────────────────────────────────────────────────────────────────

export default function InstrumentLogbook() {
  const { events, addEvent, deleteEvent } = useMaintenanceLog();
  const [form, setForm] = useState(EMPTY_FORM);

  const today = new Date().toISOString().slice(0, 10);

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addEvent({
      instrument_id: form.instrument_id.trim() || 'default',
      event_type: form.event_type,
      date: form.date,
      notes: form.notes.trim(),
      next_due: form.next_due || null,
    });
    setForm(EMPTY_FORM);
  }

  function eventTypeLabel(t: MaintenanceEventType) {
    return EVENT_TYPES.find(et => et.value === t)?.label ?? t;
  }

  function isOverdue(evt: MaintenanceEvent) {
    return evt.next_due !== null && evt.next_due < today;
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', fontSize: '1.125rem', marginBottom: '1rem' }}>
        Instrument Maintenance Logbook
      </h3>

      {/* ── Form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
        padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-slate-200)',
        background: '#fff', marginBottom: '1.25rem',
      }}>
        <div>
          <label style={labelStyle}>Instrument ID</label>
          <input value={form.instrument_id}
            onChange={e => setForm(f => ({ ...f, instrument_id: e.target.value }))}
            placeholder="e.g. HPLC-01" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Event Type</label>
          <select value={form.event_type}
            onChange={e => setForm(f => ({ ...f, event_type: e.target.value as MaintenanceEventType }))}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Next Due (optional)</label>
          <input type="date" value={form.next_due}
            onChange={e => setForm(f => ({ ...f, next_due: e.target.value }))}
            style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Describe work performed..."
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={btnPrimary}>Log Event</button>
        </div>
      </form>

      {/* ── Event list ──────────────────────────────────────────────── */}
      {sorted.length === 0 && (
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
          No maintenance events recorded yet.
        </p>
      )}

      {sorted.map(evt => {
        const overdue = isOverdue(evt);
        return (
          <div key={evt.id} style={{
            padding: '0.75rem 1rem', borderRadius: '10px',
            border: overdue ? '1.5px solid #fca5a5' : '1px solid var(--color-slate-200)',
            background: overdue ? '#fef2f2' : '#fff',
            marginBottom: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-navy-900)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
                  {evt.instrument_id}
                </span>
                <span style={tagStyle('#f0fdfa', 'var(--color-teal-600)')}>
                  {eventTypeLabel(evt.event_type)}
                </span>
                {overdue && (
                  <span style={tagStyle('#fee2e2', '#dc2626')}>
                    OVERDUE
                  </span>
                )}
              </div>
              <button type="button" onClick={() => deleteEvent(evt.id)} style={btnDanger}>Delete</button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
              {evt.date}
              {evt.next_due && (
                <span style={{ marginLeft: '0.75rem', color: overdue ? '#dc2626' : 'var(--color-slate-500)' }}>
                  Next due: {evt.next_due}
                </span>
              )}
            </div>

            {evt.notes && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-navy-900)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                {evt.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ColumnProfile } from '@/lib/types';

// ── Hook ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'labpulse-columns';

function generateId(): string {
  return crypto.randomUUID?.() ?? `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): ColumnProfile[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(cols: ColumnProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

export function useColumnProfiles() {
  const [columns, setColumns] = useState<ColumnProfile[]>([]);

  useEffect(() => { setColumns(load()); }, []);

  const addColumn = useCallback((col: Omit<ColumnProfile, 'id'>) => {
    setColumns(prev => {
      const next = [...prev, { ...col, id: generateId() }];
      save(next); return next;
    });
  }, []);

  const updateColumn = useCallback((id: string, patch: Partial<ColumnProfile>) => {
    setColumns(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch } : c);
      save(next); return next;
    });
  }, []);

  const deleteColumn = useCallback((id: string) => {
    setColumns(prev => {
      const next = prev.filter(c => c.id !== id);
      save(next); return next;
    });
  }, []);

  return { columns, addColumn, updateColumn, deleteColumn };
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLUMN_TYPES = ['C18', 'HILIC', 'Ion Exchange', 'C8', 'Phenyl', 'CN', 'Amino', 'Size Exclusion'] as const;
const CONDITIONING = ['new', 'conditioned', 'degraded'] as const;

const EMPTY_FORM = {
  type: 'C18' as string,
  particle_size: '',
  length_mm: '',
  id_mm: '',
  injection_count: '0',
  conditioning_status: 'new' as ColumnProfile['conditioning_status'],
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
  fontSize: '0.875rem', cursor: 'pointer', transition: 'background .15s',
};

const btnDanger: React.CSSProperties = {
  padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
  background: '#fee2e2', color: '#dc2626', fontWeight: 600,
  fontSize: '0.75rem', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)',
  background: '#fff', color: 'var(--color-slate-500)', fontWeight: 600,
  fontSize: '0.75rem', cursor: 'pointer',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ColumnTracker() {
  const { columns, addColumn, updateColumn, deleteColumn } = useColumnProfiles();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<ColumnProfile, 'id'> = {
      type: form.type,
      particle_size: form.particle_size,
      length_mm: Number(form.length_mm) || 0,
      id_mm: Number(form.id_mm) || 0,
      injection_count: Number(form.injection_count) || 0,
      conditioning_status: form.conditioning_status,
      last_cleaned: null,
      max_pressure_observed: null,
    };
    if (editId) {
      updateColumn(editId, payload);
      setEditId(null);
    } else {
      addColumn(payload);
    }
    setForm(EMPTY_FORM);
  }

  function startEdit(col: ColumnProfile) {
    setEditId(col.id);
    setForm({
      type: col.type,
      particle_size: col.particle_size,
      length_mm: String(col.length_mm),
      id_mm: String(col.id_mm),
      injection_count: String(col.injection_count),
      conditioning_status: col.conditioning_status,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const statusColor = (s: string) =>
    s === 'new' ? 'var(--color-teal-600)' : s === 'conditioned' ? '#d97706' : '#dc2626';

  return (
    <div style={{ maxWidth: '720px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy-900)', fontSize: '1.125rem', marginBottom: '1rem' }}>
        Column Profile Manager
      </h3>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
        padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-slate-200)',
        background: '#fff', marginBottom: '1.25rem',
      }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Particle Size</label>
          <input value={form.particle_size} onChange={e => setForm(f => ({ ...f, particle_size: e.target.value }))}
            placeholder="e.g. 1.8 um" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Length (mm)</label>
          <input type="number" min={0} step="any" value={form.length_mm}
            onChange={e => setForm(f => ({ ...f, length_mm: e.target.value }))}
            placeholder="150" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>ID (mm)</label>
          <input type="number" min={0} step="any" value={form.id_mm}
            onChange={e => setForm(f => ({ ...f, id_mm: e.target.value }))}
            placeholder="4.6" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Injection Count</label>
          <input type="number" min={0} value={form.injection_count}
            onChange={e => setForm(f => ({ ...f, injection_count: e.target.value }))}
            style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={form.conditioning_status}
            onChange={e => setForm(f => ({ ...f, conditioning_status: e.target.value as ColumnProfile['conditioning_status'] }))}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {CONDITIONING.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {editId && <button type="button" onClick={cancelEdit} style={btnSecondary}>Cancel</button>}
          <button type="submit" style={btnPrimary}>{editId ? 'Update' : 'Add Column'}</button>
        </div>
      </form>

      {/* ── List ──────────────────────────────────────────────────────── */}
      {columns.length === 0 && (
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
          No column profiles saved yet.
        </p>
      )}
      {columns.map(col => (
        <div key={col.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderRadius: '10px',
          border: '1px solid var(--color-slate-200)', background: '#fff',
          marginBottom: '0.5rem',
        }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--color-navy-900)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
              {col.type}
            </span>
            <span style={{ color: 'var(--color-slate-500)', fontSize: '0.8rem', marginLeft: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              {col.particle_size} &middot; {col.length_mm} x {col.id_mm} mm &middot; {col.injection_count} inj
            </span>
            <span style={{
              marginLeft: '0.75rem', fontSize: '0.7rem', fontWeight: 700,
              color: statusColor(col.conditioning_status), textTransform: 'uppercase',
            }}>
              {col.conditioning_status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button type="button" onClick={() => startEdit(col)} style={btnSecondary}>Edit</button>
            <button type="button" onClick={() => deleteColumn(col.id)} style={btnDanger}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

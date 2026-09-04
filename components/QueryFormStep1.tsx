'use client';

import { useState } from 'react';
import ComboInput from './ComboInput';
import {
  TECHNIQUE_OPTIONS,
  URGENCY_OPTIONS,
  getFilteredVendors,
  getFilteredModels,
  getFilteredIssues,
  getFilteredSymptoms,
} from './query-form-options';
import CleaningProcedureButton from './CleaningProcedureButton';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Step1Data {
  technique: string;
  vendor: string;
  model: string;
  issueCategory: string;
  urgency: string;
  problemDesc: string;
  symptoms: string;
}

interface QueryFormStep1Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
}

// ── Shared style tokens ──────────────────────────────────────────────────────

const SECTION: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-slate-200)',
  borderRadius: '12px',
  padding: '1.375rem 1.5rem 1.5rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 3px rgba(15,23,42,.04)',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: 'var(--color-slate-600)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '0.4rem',
};

const FIELD_GAP: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '1.625rem', height: '1.625rem', borderRadius: '50%',
        background: 'var(--color-teal-600)', color: '#fff',
        fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
        flexShrink: 0,
      }}>
        {num}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
        color: 'var(--color-navy-900)', letterSpacing: '-0.01em',
      }}>
        {title}
      </span>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: 'var(--color-teal-500)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--color-slate-400)', lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function QuickChips({
  chips, current, onAppend,
}: {
  chips: string[]; current: string; onAppend: (v: string) => void;
}) {
  const existing = new Set(
    current.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean),
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
      {chips.map(chip => {
        const used = existing.has(chip.toLowerCase());
        return (
          <button
            key={chip}
            type="button"
            onClick={() => {
              if (!used) onAppend(current ? `${current}\n${chip}` : chip);
            }}
            style={{
              padding: '0.275rem 0.625rem',
              borderRadius: '999px',
              border: `1px solid ${used ? 'var(--color-teal-300)' : 'var(--color-slate-200)'}`,
              background: used ? 'var(--color-teal-50)' : '#fff',
              color: used ? 'var(--color-teal-600)' : 'var(--color-slate-600)',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: used ? 'default' : 'pointer',
              transition: 'all .12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {used && (
              <span style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}>&#10003;</span>
            )}
            {chip}
          </button>
        );
      })}
      <span style={{ fontSize: '0.76rem', color: 'var(--color-slate-400)', alignSelf: 'center', marginLeft: '0.25rem' }}>
        or type below
      </span>
    </div>
  );
}

function TextareaField({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
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
        resize: 'vertical',
        lineHeight: 1.6,
        transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
        minHeight: `${rows * 1.6 + 1.4}rem`,
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
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function QueryFormStep1({ data, onChange, onNext }: QueryFormStep1Props) {
  const [error, setError] = useState<string | null>(null);

  const filteredVendors  = getFilteredVendors(data.technique);
  const filteredModels   = getFilteredModels(data.technique, data.vendor);
  const filteredIssues   = getFilteredIssues(data.technique);
  const filteredSymptoms = getFilteredSymptoms(data.technique);

  function update(patch: Partial<Step1Data>) {
    onChange({ ...data, ...patch });
  }

  function handleNext() {
    if (!data.technique.trim()) {
      setError('Please select or enter a technique.');
      return;
    }
    if (!data.problemDesc.trim()) {
      setError('Problem description is required.');
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <div>
      {/* ── Instrument ─────────────────────────────────────────────── */}
      <div style={SECTION}>
        <StepHeader num={1} title="Instrument" />
        <div style={ROW}>
          <Field label="Technique" required>
            <ComboInput
              value={data.technique}
              onChange={v => update({ technique: v, vendor: '', model: '', issueCategory: '' })}
              options={TECHNIQUE_OPTIONS}
              placeholder="Select or type technique..."
              required
            />
          </Field>
          <Field label="Vendor">
            <ComboInput
              value={data.vendor}
              onChange={v => update({ vendor: v, model: '' })}
              options={filteredVendors}
              placeholder={data.technique ? 'Select or type vendor...' : 'Select technique first...'}
            />
          </Field>
          <Field label="Instrument Model">
            <ComboInput
              value={data.model}
              onChange={v => update({ model: v })}
              options={filteredModels}
              placeholder={data.technique || data.vendor ? 'Select or type model...' : 'Select technique or vendor first...'}
            />
          </Field>
        </div>

        {/* Cleaning Procedure */}
        {data.technique.trim() && (
          <div style={{ marginTop: '0.75rem' }}>
            <CleaningProcedureButton
              technique={data.technique}
              vendor={data.vendor}
              model={data.model}
            />
          </div>
        )}
      </div>

      {/* ── Problem ────────────────────────────────────────────────── */}
      <div style={SECTION}>
        <StepHeader num={2} title="Problem" />
        <div style={FIELD_GAP}>
          <div style={ROW}>
            <Field label="Issue Type">
              <ComboInput
                value={data.issueCategory}
                onChange={v => update({ issueCategory: v })}
                options={filteredIssues}
                placeholder="Select or describe issue type..."
              />
            </Field>
            <Field label="Urgency">
              <ComboInput
                value={data.urgency}
                onChange={v => update({ urgency: v })}
                options={URGENCY_OPTIONS}
                placeholder="Select or describe urgency..."
              />
            </Field>
          </div>

          <Field label="Problem Description" required>
            <TextareaField
              value={data.problemDesc}
              onChange={v => update({ problemDesc: v })}
              placeholder="Describe the issue in detail \u2014 when it started, what changed, what you are observing..."
              rows={3}
            />
          </Field>

          <Field label="Observed Symptoms">
            <QuickChips
              chips={filteredSymptoms}
              current={data.symptoms}
              onAppend={v => update({ symptoms: v })}
            />
            <TextareaField
              value={data.symptoms}
              onChange={v => update({ symptoms: v })}
              placeholder="Add or describe additional symptoms..."
              rows={2}
            />
          </Field>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.875rem 1rem',
          background: 'rgba(220,38,38,.07)',
          border: '1px solid rgba(220,38,38,.22)',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '0.9rem',
          fontWeight: 500,
          marginBottom: '1rem',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Next button */}
      <NextButton onClick={handleNext} />
    </div>
  );
}

// ── Next button ──────────────────────────────────────────────────────────────

function NextButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.875rem 1.5rem',
        background: hovered ? 'var(--color-teal-700)' : 'var(--color-teal-600)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        transition: 'background .15s ease, box-shadow .15s ease',
        boxShadow: hovered
          ? '0 4px 16px rgba(15,145,136,.35)'
          : '0 1px 3px rgba(15,145,136,.2)',
      }}
    >
      Next: Method Context
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

'use client';

import { useState, useMemo } from 'react';
import type { SampleMatrixType } from '@/lib/types';
import {
  SAMPLE_MATRIX_TYPE_OPTIONS,
  VENDOR_OPTIONS,
} from './query-form-options';
import { getContextSchema, type ContextFieldDef, type ContextGroupDef } from '@/lib/context-schemas';
import { getPromotedFields } from '@/lib/context-priorities';
import ComboInput from './ComboInput';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Step2Data {
  // existing method context fields
  analyte: string;
  sampleMatrix: string;
  column: string;
  mobilephase: string;
  flowRate: string;
  injectionVolume: string;
  gradient: string;
  retentionTime: string;
  ionizationMode: string;
  sourceParams: string;
  acquisitionMode: string;
  recentMaint: string;
  qcResults: string;
  expectedResult: string;
  methodConditions: string;
  // V5: SST
  sst_plates: string;
  sst_tailing_factor: string;
  sst_resolution: string;
  sst_rsd_percent: string;
  // V5: sample matrix type
  sample_matrix_type: SampleMatrixType | '';
  // V5: method transfer
  is_method_transfer: boolean;
  source_instrument: string;
  source_vendor: string;
  source_model: string;
  // V5: column injection count
  column_injection_count: string;
  // V6: dynamic context for technique-specific fields
  extraContext: Record<string, string>;
}

// Set of keys that exist directly on Step2Data (not in extraContext)
const EXISTING_KEYS = new Set([
  'analyte', 'sampleMatrix', 'column', 'mobilephase', 'flowRate',
  'injectionVolume', 'gradient', 'retentionTime', 'ionizationMode',
  'sourceParams', 'acquisitionMode', 'recentMaint', 'qcResults',
  'expectedResult', 'methodConditions',
  'sst_plates', 'sst_tailing_factor', 'sst_resolution', 'sst_rsd_percent',
  'sample_matrix_type', 'column_injection_count',
]);

interface QueryFormStep2Props {
  data: Step2Data;
  technique: string;
  issueCategory: string;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
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

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--color-teal-500)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20,184,166,.15)';
  e.currentTarget.style.background = '#fff';
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--color-slate-200)';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = 'var(--color-slate-50)';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ num, title, subtitle }: { num: number; title: string; subtitle?: string }) {
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
      <span style={{
        fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-slate-400)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {subtitle ?? 'optional \u2014 improves accuracy'}
      </span>
    </div>
  );
}

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
      {hint && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--color-slate-400)', lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function InputField({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={INPUT_STYLE}
      onFocus={focusStyle}
      onBlur={blurStyle}
    />
  );
}

function TextareaField({
  value, onChange, placeholder, rows = 2,
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
        ...INPUT_STYLE,
        resize: 'vertical',
        lineHeight: 1.6,
        minHeight: `${rows * 1.6 + 1.4}rem`,
      }}
      onFocus={focusStyle}
      onBlur={blurStyle}
    />
  );
}

/** Collapsible group section */
function GroupSection({
  group, open, onToggle, fieldCount, filledCount, children,
}: {
  group: ContextGroupDef; open: boolean; onToggle: () => void;
  fieldCount: number; filledCount: number; children: React.ReactNode;
}) {
  return (
    <div style={{
      border: '1px solid var(--color-slate-200)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginTop: '0.25rem',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '0.75rem 1rem',
          background: open ? 'var(--color-teal-50)' : 'var(--color-slate-50)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--color-teal-600)',
          textAlign: 'left',
          transition: 'background .15s ease',
        }}
      >
        <span style={{
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform .2s',
          display: 'inline-block',
        }}>
          &#9656;
        </span>
        {group.label}
        <span style={{
          fontSize: '0.72rem', fontWeight: 600,
          color: filledCount > 0 ? 'var(--color-teal-500)' : 'var(--color-slate-400)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginLeft: 'auto',
        }}>
          {filledCount > 0 ? `${filledCount}/${fieldCount} filled` : `${fieldCount} fields`}
        </span>
      </button>
      {open && (
        <div style={{
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          borderTop: '1px solid var(--color-slate-200)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Dynamic field renderer ──────────────────────────────────────────────────

function DynamicField({
  field, value, onChange,
}: {
  field: ContextFieldDef; value: string; onChange: (v: string) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <Field label={field.label} hint={field.hint}>
        <TextareaField value={value} onChange={onChange} placeholder={field.placeholder} />
      </Field>
    );
  }
  if (field.type === 'select' && field.key === 'sample_matrix_type') {
    return (
      <Field label={field.label} hint={field.hint}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            ...INPUT_STYLE,
            cursor: 'pointer',
            color: value ? 'var(--color-navy-900)' : 'var(--color-slate-400)',
          }}
          onFocus={focusStyle as unknown as React.FocusEventHandler<HTMLSelectElement>}
          onBlur={blurStyle as unknown as React.FocusEventHandler<HTMLSelectElement>}
        >
          {SAMPLE_MATRIX_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.hint}>
      <InputField value={value} onChange={onChange} placeholder={field.placeholder} />
    </Field>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function QueryFormStep2({
  data, technique, issueCategory, onChange, onNext, onBack,
}: QueryFormStep2Props) {
  const schema = useMemo(() => getContextSchema(technique), [technique]);
  const promotedKeys = useMemo(() => new Set(getPromotedFields(issueCategory)), [issueCategory]);

  // Compute effective priority for each field (promoted fields become priority 1)
  const fieldsWithPriority = useMemo(() => {
    return schema.fields.map(f => ({
      ...f,
      effectivePriority: promotedKeys.has(f.key) ? 1 as const : f.priority,
    }));
  }, [schema.fields, promotedKeys]);

  // Split fields by priority: priority 1 = always visible, 2+ = in expandable groups
  const primaryFields = fieldsWithPriority.filter(f => f.effectivePriority === 1);
  const expandableFields = fieldsWithPriority.filter(f => f.effectivePriority > 1);

  // Group expandable fields by group id
  const expandableGroups = useMemo(() => {
    const map = new Map<string, typeof expandableFields>();
    for (const f of expandableFields) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return map;
  }, [expandableFields]);

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Value accessors ──────────────────────────────────────────────

  function getValue(key: string): string {
    if (EXISTING_KEYS.has(key)) {
      return String((data as unknown as Record<string, unknown>)[key] ?? '');
    }
    return data.extraContext[key] ?? '';
  }

  function setValue(key: string, value: string) {
    if (EXISTING_KEYS.has(key)) {
      onChange({ ...data, [key]: key === 'sample_matrix_type' ? value as SampleMatrixType | '' : value });
    } else {
      onChange({ ...data, extraContext: { ...data.extraContext, [key]: value } });
    }
  }

  function countFilled(fields: ContextFieldDef[]): number {
    return fields.filter(f => getValue(f.key).trim()).length;
  }

  return (
    <div>
      <div style={SECTION}>
        <StepHeader num={3} title="Advanced Context" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* ── Primary fields (priority 1) — always visible in 2-col grid */}
          {primaryFields.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {primaryFields.map(f => (
                <DynamicField
                  key={f.key}
                  field={f}
                  value={getValue(f.key)}
                  onChange={v => setValue(f.key, v)}
                />
              ))}
            </div>
          )}

          {/* ── Expandable groups (priority 2+) — collapsible sections */}
          {schema.groups
            .filter(g => expandableGroups.has(g.id))
            .map(g => {
              const gFields = expandableGroups.get(g.id)!;
              return (
                <GroupSection
                  key={g.id}
                  group={g}
                  open={openGroups.has(g.id)}
                  onToggle={() => toggleGroup(g.id)}
                  fieldCount={gFields.length}
                  filledCount={countFilled(gFields)}
                >
                  {gFields.map(f => (
                    <DynamicField
                      key={f.key}
                      field={f}
                      value={getValue(f.key)}
                      onChange={v => setValue(f.key, v)}
                    />
                  ))}
                </GroupSection>
              );
            })
          }

          {/* ── Method Transfer Section (always available) ───────────── */}
          <div style={{
            border: '1px solid var(--color-slate-200)',
            borderRadius: '10px',
            overflow: 'hidden',
            marginTop: '0.25rem',
          }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: data.is_method_transfer ? 'var(--color-teal-50)' : 'var(--color-slate-50)',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--color-teal-600)',
                transition: 'background .15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={data.is_method_transfer}
                onChange={e => onChange({
                  ...data,
                  is_method_transfer: e.target.checked,
                  ...(e.target.checked ? {} : { source_instrument: '', source_vendor: '', source_model: '' }),
                })}
                style={{
                  width: '1rem', height: '1rem',
                  accentColor: 'var(--color-teal-600)', cursor: 'pointer',
                }}
              />
              Method Transfer
              <span style={{
                fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--color-slate-400)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginLeft: 'auto',
              }}>
                check if transferring from another instrument
              </span>
            </label>

            {data.is_method_transfer && (
              <div style={{
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.75rem',
                borderTop: '1px solid var(--color-slate-200)',
              }}>
                <Field label="Source Instrument">
                  <InputField
                    value={data.source_instrument}
                    onChange={v => onChange({ ...data, source_instrument: v })}
                    placeholder="e.g. HPLC, UHPLC"
                  />
                </Field>
                <Field label="Source Vendor">
                  <ComboInput
                    value={data.source_vendor}
                    onChange={v => onChange({ ...data, source_vendor: v })}
                    options={VENDOR_OPTIONS}
                    placeholder="Select vendor..."
                  />
                </Field>
                <Field label="Source Model">
                  <InputField
                    value={data.source_model}
                    onChange={v => onChange({ ...data, source_model: v })}
                    placeholder="e.g. 1260 Infinity II"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext} />
      </div>
    </div>
  );
}

// ── Navigation buttons ───────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', padding: '0.875rem 1.5rem',
        background: hovered ? 'var(--color-slate-100)' : '#fff',
        color: 'var(--color-slate-600)',
        border: '1.5px solid var(--color-slate-200)', borderRadius: '10px',
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
        letterSpacing: '-0.01em', cursor: 'pointer',
        transition: 'background .15s ease', minWidth: '120px',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Back
    </button>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', flex: 1, padding: '0.875rem 1.5rem',
        background: hovered ? 'var(--color-teal-700)' : 'var(--color-teal-600)',
        color: '#fff', border: 'none', borderRadius: '10px',
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
        letterSpacing: '-0.01em', cursor: 'pointer',
        transition: 'background .15s ease, box-shadow .15s ease',
        boxShadow: hovered
          ? '0 4px 16px rgba(15,145,136,.35)'
          : '0 1px 3px rgba(15,145,136,.2)',
      }}
    >
      Next: Review & Submit
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

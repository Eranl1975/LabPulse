'use client';

import { useState } from 'react';
import type { SampleMatrixType } from '@/lib/types';
import {
  SAMPLE_MATRIX_TYPE_OPTIONS,
  SST_TECHNIQUES,
  VENDOR_OPTIONS,
} from './query-form-options';
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
}

interface QueryFormStep2Props {
  data: Step2Data;
  technique: string;
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

// ── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ num, title, optional }: { num: number; title: string; optional?: boolean }) {
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
      {optional && (
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-slate-400)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          optional
        </span>
      )}
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

function InputField({
  value, onChange, placeholder, type = 'text',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
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
        transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
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

export default function QueryFormStep2({ data, technique, onChange, onNext, onBack }: QueryFormStep2Props) {
  const [sstOpen, setSstOpen] = useState(false);
  const showSST = SST_TECHNIQUES.has(technique);

  function update(patch: Partial<Step2Data>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div>
      <div style={SECTION}>
        <StepHeader num={3} title="Method Context" optional />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Method Conditions textarea */}
          <Field label="Method Conditions">
            <TextareaField
              value={data.methodConditions}
              onChange={v => update({ methodConditions: v })}
              placeholder="e.g. C18 column, 60 \u00B0C oven, gradient 5 \u2192 95 % ACN in 8 min, flow 0.4 mL/min"
              rows={2}
            />
          </Field>

          {/* Core method fields — 2 column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Analyte">
              <InputField value={data.analyte} onChange={v => update({ analyte: v })} placeholder="e.g. caffeine, ibuprofen" />
            </Field>
            <Field label="Sample Matrix">
              <InputField value={data.sampleMatrix} onChange={v => update({ sampleMatrix: v })} placeholder="e.g. plasma, soil extract" />
            </Field>
            <Field label="Sample Matrix Type">
              <select
                value={data.sample_matrix_type}
                onChange={e => update({ sample_matrix_type: e.target.value as SampleMatrixType | '' })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.6875rem 0.9375rem',
                  background: 'var(--color-slate-50)',
                  border: '1.5px solid var(--color-slate-200)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9375rem',
                  color: data.sample_matrix_type ? 'var(--color-navy-900)' : 'var(--color-slate-400)',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                }}
              >
                {SAMPLE_MATRIX_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Column">
              <InputField value={data.column} onChange={v => update({ column: v })} placeholder="e.g. C18 150\u00D74.6mm 3.5\u00B5m" />
            </Field>
            <Field label="Column Injection Count">
              <InputField
                value={data.column_injection_count}
                onChange={v => update({ column_injection_count: v })}
                placeholder="e.g. 1500"
                type="text"
              />
            </Field>
            <Field label="Mobile Phase">
              <InputField value={data.mobilephase} onChange={v => update({ mobilephase: v })} placeholder="e.g. 0.1% FA in water / ACN" />
            </Field>
            <Field label="Flow Rate">
              <InputField value={data.flowRate} onChange={v => update({ flowRate: v })} placeholder="e.g. 0.4 mL/min" />
            </Field>
            <Field label="Injection Volume">
              <InputField value={data.injectionVolume} onChange={v => update({ injectionVolume: v })} placeholder="e.g. 5 \u00B5L" />
            </Field>
            <Field label="Gradient Program">
              <InputField value={data.gradient} onChange={v => update({ gradient: v })} placeholder="e.g. 5\u219295% B in 8 min" />
            </Field>
            <Field label="Retention Time">
              <InputField value={data.retentionTime} onChange={v => update({ retentionTime: v })} placeholder="e.g. expected 4.2 min, observed 3.8 min" />
            </Field>
            <Field label="Ionization Mode">
              <InputField value={data.ionizationMode} onChange={v => update({ ionizationMode: v })} placeholder="e.g. ESI+, APCI-" />
            </Field>
            <Field label="Source Parameters">
              <InputField value={data.sourceParams} onChange={v => update({ sourceParams: v })} placeholder="e.g. gas temp 300\u00B0C, nebulizer 45 psi" />
            </Field>
            <Field label="Acquisition Mode">
              <InputField value={data.acquisitionMode} onChange={v => update({ acquisitionMode: v })} placeholder="e.g. SIM m/z 195, scan 100-1000" />
            </Field>
            <Field label="Expected Result">
              <InputField value={data.expectedResult} onChange={v => update({ expectedResult: v })} placeholder="e.g. S/N > 10, RT 4.2\u00B10.1 min" />
            </Field>
          </div>

          <Field label="Recent Maintenance">
            <InputField value={data.recentMaint} onChange={v => update({ recentMaint: v })} placeholder="e.g. replaced ESI capillary last week" />
          </Field>
          <Field label="QC / System Suitability Results">
            <InputField value={data.qcResults} onChange={v => update({ qcResults: v })} placeholder="e.g. SST passed, RSD 1.2%, tailing 1.1" />
          </Field>

          {/* ── SST Section (HPLC/UHPLC/LCMS/PrepLC only) ──────────── */}
          {showSST && (
            <div style={{
              border: '1px solid var(--color-slate-200)',
              borderRadius: '10px',
              overflow: 'hidden',
              marginTop: '0.25rem',
            }}>
              <button
                type="button"
                onClick={() => setSstOpen(!sstOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: sstOpen ? 'var(--color-teal-50)' : 'var(--color-slate-50)',
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
                  transform: sstOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform .2s',
                  display: 'inline-block',
                }}>
                  &#9656;
                </span>
                System Suitability Test (SST)
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginLeft: 'auto',
                }}>
                  optional
                </span>
              </button>

              {sstOpen && (
                <div style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--color-slate-200)',
                }}>
                  <Field label="Theoretical Plates (N)" hint="Number of theoretical plates">
                    <InputField
                      value={data.sst_plates}
                      onChange={v => update({ sst_plates: v })}
                      placeholder="e.g. 12000"
                    />
                  </Field>
                  <Field label="Tailing Factor" hint="USP tailing factor (T)">
                    <InputField
                      value={data.sst_tailing_factor}
                      onChange={v => update({ sst_tailing_factor: v })}
                      placeholder="e.g. 1.1"
                    />
                  </Field>
                  <Field label="Resolution (Rs)" hint="Between critical pair">
                    <InputField
                      value={data.sst_resolution}
                      onChange={v => update({ sst_resolution: v })}
                      placeholder="e.g. 2.5"
                    />
                  </Field>
                  <Field label="RSD (%)" hint="Relative standard deviation of replicate injections">
                    <InputField
                      value={data.sst_rsd_percent}
                      onChange={v => update({ sst_rsd_percent: v })}
                      placeholder="e.g. 0.8"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* ── Method Transfer Section ────────────────────────────── */}
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
                onChange={e => update({
                  is_method_transfer: e.target.checked,
                  ...(e.target.checked ? {} : { source_instrument: '', source_vendor: '', source_model: '' }),
                })}
                style={{
                  width: '1rem',
                  height: '1rem',
                  accentColor: 'var(--color-teal-600)',
                  cursor: 'pointer',
                }}
              />
              Method Transfer
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--color-slate-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
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
                    onChange={v => update({ source_instrument: v })}
                    placeholder="e.g. HPLC, UHPLC"
                  />
                </Field>
                <Field label="Source Vendor">
                  <ComboInput
                    value={data.source_vendor}
                    onChange={v => update({ source_vendor: v })}
                    options={VENDOR_OPTIONS}
                    placeholder="Select vendor..."
                  />
                </Field>
                <Field label="Source Model">
                  <InputField
                    value={data.source_model}
                    onChange={v => update({ source_model: v })}
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1.5rem',
        background: hovered ? 'var(--color-slate-100)' : '#fff',
        color: 'var(--color-slate-600)',
        border: '1.5px solid var(--color-slate-200)',
        borderRadius: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        transition: 'background .15s ease',
        minWidth: '120px',
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        flex: 1,
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
      Next: Review & Submit
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

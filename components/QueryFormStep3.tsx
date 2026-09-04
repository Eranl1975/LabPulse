'use client';

import { useState } from 'react';
import type { Step1Data } from './QueryFormStep1';
import type { Step2Data } from './QueryFormStep2';
import { getFilteredChecked } from './query-form-options';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Step3Data {
  alreadyChecked: string;
}

interface QueryFormStep3Props {
  data: Step3Data;
  step1: Step1Data;
  step2: Step2Data;
  technique: string;
  loading: boolean;
  onChange: (data: Step3Data) => void;
  onSubmit: () => void;
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

// ── Summary row helper ───────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
      <span style={{
        fontWeight: 600,
        color: 'var(--color-slate-500)',
        minWidth: '120px',
        flexShrink: 0,
      }}>
        {label}:
      </span>
      <span style={{ color: 'var(--color-navy-900)', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function QueryFormStep3({
  data, step1, step2, technique, loading, onChange, onSubmit, onBack,
}: QueryFormStep3Props) {
  const filteredChecked = getFilteredChecked(technique);

  function update(patch: Partial<Step3Data>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div>
      {/* ── Already Checked ────────────────────────────────────────── */}
      <div style={SECTION}>
        <StepHeader num={4} title="Already Checked / Tried" optional />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Field
            label="Steps Already Taken"
            hint="One step per line \u2014 these will be deprioritised in the answer."
          >
            <QuickChips
              chips={filteredChecked}
              current={data.alreadyChecked}
              onAppend={v => update({ alreadyChecked: v })}
            />
            <TextareaField
              value={data.alreadyChecked}
              onChange={v => update({ alreadyChecked: v })}
              placeholder={`One step per line, e.g.\nreplaced column\ncleaned source`}
              rows={2}
            />
          </Field>
        </div>
      </div>

      {/* ── Summary Preview ────────────────────────────────────────── */}
      <div style={{
        ...SECTION,
        background: 'var(--color-slate-50)',
        borderColor: 'var(--color-teal-200)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '1rem',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2h12v12H2z" stroke="var(--color-teal-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 5h6M5 8h6M5 11h4" stroke="var(--color-teal-500)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--color-navy-900)',
            letterSpacing: '-0.01em',
          }}>
            Query Summary
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {/* Step 1 summary */}
          <SummaryRow label="Technique" value={step1.technique} />
          <SummaryRow label="Vendor" value={step1.vendor} />
          <SummaryRow label="Model" value={step1.model} />
          <SummaryRow label="Issue Type" value={step1.issueCategory} />
          <SummaryRow label="Urgency" value={step1.urgency} />
          <SummaryRow label="Problem" value={step1.problemDesc} />
          <SummaryRow label="Symptoms" value={step1.symptoms} />

          {/* Step 2 summary */}
          <SummaryRow label="Method" value={step2.methodConditions} />
          <SummaryRow label="Analyte" value={step2.analyte} />
          <SummaryRow label="Matrix" value={step2.sampleMatrix} />
          <SummaryRow label="Matrix Type" value={step2.sample_matrix_type} />
          <SummaryRow label="Column" value={step2.column} />
          <SummaryRow label="Col. Inj. Count" value={step2.column_injection_count} />
          <SummaryRow label="Mobile Phase" value={step2.mobilephase} />
          <SummaryRow label="Flow Rate" value={step2.flowRate} />
          <SummaryRow label="Inj. Volume" value={step2.injectionVolume} />
          <SummaryRow label="Gradient" value={step2.gradient} />
          <SummaryRow label="Retention Time" value={step2.retentionTime} />
          <SummaryRow label="Ionization" value={step2.ionizationMode} />
          <SummaryRow label="Source Params" value={step2.sourceParams} />
          <SummaryRow label="Acq. Mode" value={step2.acquisitionMode} />
          <SummaryRow label="Expected" value={step2.expectedResult} />
          <SummaryRow label="Maintenance" value={step2.recentMaint} />
          <SummaryRow label="QC Results" value={step2.qcResults} />
          {/* SST */}
          <SummaryRow label="SST Plates" value={step2.sst_plates} />
          <SummaryRow label="SST Tailing" value={step2.sst_tailing_factor} />
          <SummaryRow label="SST Resolution" value={step2.sst_resolution} />
          <SummaryRow label="SST RSD%" value={step2.sst_rsd_percent} />
          {/* Method transfer */}
          {step2.is_method_transfer && (
            <>
              <SummaryRow label="Transfer From" value={[step2.source_vendor, step2.source_instrument, step2.source_model].filter(Boolean).join(' / ')} />
            </>
          )}
          {/* Already checked */}
          <SummaryRow label="Already Tried" value={data.alreadyChecked.split('\n').filter(s => s.trim()).join(', ')} />
        </div>

        {/* Field count indicator */}
        {(() => {
          const filledCount = [
            step1.technique, step1.vendor, step1.model, step1.issueCategory,
            step1.problemDesc, step1.symptoms,
            step2.analyte, step2.sampleMatrix, step2.column, step2.mobilephase,
            step2.flowRate, step2.injectionVolume, step2.gradient, step2.retentionTime,
            step2.ionizationMode, step2.sourceParams, step2.acquisitionMode,
            step2.expectedResult, step2.recentMaint, step2.qcResults,
            step2.methodConditions,
          ].filter(v => v.trim()).length;
          return (
            <div style={{
              marginTop: '0.75rem',
              fontSize: '0.78rem',
              color: 'var(--color-slate-400)',
              textAlign: 'right',
            }}>
              {filledCount} field{filledCount !== 1 ? 's' : ''} provided — more context improves accuracy
            </div>
          );
        })()}
      </div>

      {/* Navigation + Submit */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <BackButton onClick={onBack} />
        <SubmitButton loading={loading} onClick={onSubmit} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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

function SubmitButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        flex: 1,
        padding: '0.9375rem 1.5rem',
        background: loading
          ? 'var(--color-slate-300)'
          : hovered
          ? 'var(--color-teal-700)'
          : 'var(--color-teal-600)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: loading ? 'not-allowed' : 'pointer',
        transform: pressed && !loading ? 'scale(0.987)' : 'scale(1)',
        transition: 'background .15s ease, transform .1s ease, box-shadow .15s ease',
        boxShadow: hovered && !loading
          ? '0 4px 16px rgba(15,145,136,.35)'
          : '0 1px 3px rgba(15,145,136,.2)',
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: '15px', height: '15px',
            border: '2px solid rgba(255,255,255,.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          Analyzing...
        </>
      ) : (
        <>
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5.5 6.5C5.5 5.12 6.62 4 8 4s2.5 1.12 2.5 2.5C10.5 8 9 8.5 8 9.5"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="12" r=".75" fill="currentColor"/>
          </svg>
          <span style={{ color: '#f97316' }}>Get Troubleshooting Answer</span>
        </>
      )}
    </button>
  );
}

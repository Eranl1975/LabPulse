'use client';

import { useState } from 'react';
import type { Technique } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import ModeSwitcher, { type DisplayMode } from './ModeSwitcher';
import AnswerDisplay from './AnswerDisplay';
import ComboInput from './ComboInput';

// ── Option lists ──────────────────────────────────────────────────────────────

const TECHNIQUE_OPTIONS = ['HPLC', 'LCMS', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC'] as const;

const VENDOR_OPTIONS = [
  'Agilent', 'Waters', 'Thermo Fisher', 'Shimadzu', 'SCIEX',
  'Restek', 'PerkinElmer', 'Bruker', 'Phenomenex', 'Sigma-Aldrich', 'Bio-Rad',
] as const;

const MODEL_OPTIONS = [
  // Agilent
  '1100 Series HPLC', '1200 Series HPLC', '1220 Infinity II LC',
  '1260 Infinity HPLC', '1260 Infinity II', '1260 Infinity II Bio-inert LC',
  '1290 Bio LC', '1290 Infinity UHPLC', '1290 Infinity II',
  '1290 Infinity II Bio LC', '1290 Infinity II Flexible Pump System',
  '1290 Infinity II Multisampler', '1290 Infinity II UHPLC',
  '7890B GC', '7010 GC/MS',
  // Waters
  'ACQUITY ARC', 'ACQUITY ARC Bio', 'ACQUITY Premier UPLC',
  'ACQUITY UPLC', 'ACQUITY UPLC H-Class', 'ACQUITY UPLC H-Class PLUS',
  'ACQUITY UPLC I-Class', 'ACQUITY UPLC I-Class PLUS',
  'Alliance 2695', 'Alliance e2695', 'Alliance HPLC',
  'Arc Premier', 'Breeze HPLC',
  'Xevo TQ-S', 'Xevo TQ-XS',
  // Thermo
  'TSQ Altis', 'Vanquish UHPLC', 'Trace 1310 GC', 'Q Exactive',
  // Shimadzu
  'Nexera X2', 'LCMS-8045', 'GC-2030',
] as const;

const ISSUE_OPTIONS = [
  'retention time shift', 'peak tailing', 'peak broadening', 'low sensitivity',
  'no peak', 'carryover', 'noisy baseline', 'high backpressure',
  'LCMS source contamination', 'GC ghost peaks', 'poor GC peak shape', 'GCMS signal loss',
  'split peaks', 'baseline drift', 'loss of resolution', 'pressure surge at injection',
  'void volume issue', 'column overloading', 'ion suppression', 'adduct formation',
] as const;

const URGENCY_OPTIONS = [
  'routine — can wait a few days',
  'moderate — impacting analysis schedule',
  'urgent — samples held',
  'critical — production / QC stopped',
] as const;

const SYMPTOM_CHIPS = [
  'peak tailing', 'peak broadening', 'split peaks', 'ghost peaks',
  'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike',
  'high backpressure', 'loss of resolution', 'carryover', 'low signal',
  'no signal', 'ion suppression',
];

const CHECKED_CHIPS = [
  'replaced column', 'replaced guard column', 'cleaned source/ion block',
  'flushed mobile phase lines', 'checked connections and fittings',
  'primed pump', 'replaced septa / liner', 'cleaned injector',
  'checked mobile phase composition', 'restarted instrument software',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiResult {
  ranked_answer: { confidence: number };
  modes: {
    concise:  TextOutput;
    standard: TextOutput;
    deep:     TextOutput;
    manager:  ManagerOutput;
  };
}

// ── Shared style tokens ───────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

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

/**
 * Chips that append a suggestion to a textarea when clicked.
 */
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
              <span style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}>✓</span>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function QueryForm() {
  const [technique,        setTechnique]        = useState('');
  const [vendor,           setVendor]           = useState('');
  const [model,            setModel]            = useState('');
  const [issueCategory,    setIssueCategory]    = useState('');
  const [urgency,          setUrgency]          = useState('');
  const [problemDesc,      setProblemDesc]      = useState('');
  const [symptoms,         setSymptoms]         = useState('');
  const [methodConditions, setMethodConditions] = useState('');
  const [alreadyChecked,   setAlreadyChecked]   = useState('');

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ApiResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [mode,    setMode]    = useState<DisplayMode>('standard');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!technique.trim()) { setError('Please select or enter a technique.'); return; }
    if (!problemDesc.trim()) { setError('Problem description is required.'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const symptom_description = [problemDesc.trim(), symptoms.trim()]
      .filter(Boolean).join('\n');

    const already_checked = alreadyChecked
      .split('\n').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique:          technique.trim() as Technique,
          vendor:             vendor.trim()           || null,
          model:              model.trim()            || null,
          issue_category:     issueCategory           || null,
          urgency:            urgency                 || null,
          symptom_description,
          method_conditions:  methodConditions.trim() || null,
          already_checked,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      setResult(await res.json());
      setMode('standard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>

        {/* ── Step 1: Instrument ─────────────────────────────────────────── */}
        <div style={SECTION}>
          <StepHeader num={1} title="Instrument" />
          <div style={ROW}>
            <Field label="Technique" required>
              <ComboInput
                value={technique}
                onChange={setTechnique}
                options={TECHNIQUE_OPTIONS}
                placeholder="Select or type technique…"
                required
              />
            </Field>
            <Field label="Vendor">
              <ComboInput
                value={vendor}
                onChange={setVendor}
                options={VENDOR_OPTIONS}
                placeholder="Select or type vendor…"
              />
            </Field>
            <Field label="Instrument Model">
              <ComboInput
                value={model}
                onChange={setModel}
                options={MODEL_OPTIONS}
                placeholder="Select or type model…"
              />
            </Field>
          </div>
        </div>

        {/* ── Step 2: Problem ───────────────────────────────────────────── */}
        <div style={SECTION}>
          <StepHeader num={2} title="Problem" />
          <div style={FIELD_GAP}>

            <div style={ROW}>
              <Field label="Issue Type">
                <ComboInput
                  value={issueCategory}
                  onChange={setIssueCategory}
                  options={ISSUE_OPTIONS}
                  placeholder="Select or describe issue type…"
                />
              </Field>
              <Field label="Urgency">
                <ComboInput
                  value={urgency}
                  onChange={setUrgency}
                  options={URGENCY_OPTIONS}
                  placeholder="Select or describe urgency…"
                />
              </Field>
            </div>

            <Field label="Problem Description" required>
              <TextareaField
                value={problemDesc}
                onChange={setProblemDesc}
                placeholder="Describe the issue in detail — when it started, what changed, what you are observing…"
                rows={3}
              />
            </Field>

            <Field label="Observed Symptoms">
              <QuickChips
                chips={SYMPTOM_CHIPS}
                current={symptoms}
                onAppend={setSymptoms}
              />
              <TextareaField
                value={symptoms}
                onChange={setSymptoms}
                placeholder="Add or describe additional symptoms…"
                rows={2}
              />
            </Field>

          </div>
        </div>

        {/* ── Step 3: Context ───────────────────────────────────────────── */}
        <div style={{ ...SECTION, marginBottom: '1.25rem' }}>
          <StepHeader num={3} title="Context" optional />
          <div style={FIELD_GAP}>

            <Field label="Method Conditions">
              <TextareaField
                value={methodConditions}
                onChange={setMethodConditions}
                placeholder="e.g. C18 column, 60 °C oven, gradient 5 → 95 % ACN in 8 min, flow 0.4 mL/min"
                rows={2}
              />
            </Field>

            <Field
              label="Already Checked / Tried"
              hint="One step per line — these will be deprioritised in the answer."
            >
              <QuickChips
                chips={CHECKED_CHIPS}
                current={alreadyChecked}
                onAppend={setAlreadyChecked}
              />
              <TextareaField
                value={alreadyChecked}
                onChange={setAlreadyChecked}
                placeholder={`One step per line, e.g.\nreplaced column\ncleaned source`}
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

        {/* Submit */}
        <SubmitButton loading={loading} />

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </form>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ marginTop: '2.75rem' }} className="fade-in">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-slate-200)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem', fontWeight: 700,
              color: 'var(--color-slate-400)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Diagnosis
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-slate-200)' }} />
          </div>
          <ModeSwitcher selected={mode} onChange={setMode} />
          <AnswerDisplay
            modes={result.modes}
            confidence={result.ranked_answer.confidence}
            selected={mode}
          />
        </div>
      )}
    </>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
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
          Analyzing…
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

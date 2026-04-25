'use client';

import { useState } from 'react';
import type { Technique, LabReport } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import { addReport } from '@/lib/reportStore';
import ReportModal from './ReportModal';
import ModeSwitcher, { type DisplayMode } from './ModeSwitcher';
import AnswerDisplay from './AnswerDisplay';
import ComboInput from './ComboInput';

// ── Option lists ──────────────────────────────────────────────────────────────

const TECHNIQUE_OPTIONS = ['HPLC', 'LCMS', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC'] as const;

const VENDOR_OPTIONS = [
  'Agilent', 'Waters', 'Thermo Fisher', 'Dionex', 'TA Instruments', 'Cytiva', 'Shimadzu', 'SCIEX',
  'Restek', 'PerkinElmer', 'Bruker', 'Phenomenex', 'Sigma-Aldrich', 'Bio-Rad',
  'NETZSCH', 'Mettler Toledo', 'Hitachi',
] as const;

const MODELS_BY_TECHNIQUE_AND_VENDOR: Record<string, Record<string, string[]>> = {
  HPLC: {
    'Agilent':       ['1100 Series HPLC', '1200 Series HPLC', '1220 Infinity II LC', '1260 Infinity HPLC', '1260 Infinity II', '1260 Infinity II Bio-inert LC'],
    'Waters':        ['Alliance 2695', 'Alliance e2695', 'Alliance HPLC', 'Arc Premier', 'Breeze HPLC', 'ACQUITY ARC', 'ACQUITY ARC Bio'],
    'Shimadzu':      ['Prominence HPLC', 'Nexera HPLC'],
    'Thermo Fisher': ['UltiMate 3000 HPLC', 'UltiMate 3000 SD'],
  },
  UHPLC: {
    'Agilent':       ['1290 Bio LC', '1290 Infinity UHPLC', '1290 Infinity II', '1290 Infinity II Bio LC', '1290 Infinity II Flexible Pump System', '1290 Infinity II Multisampler', '1290 Infinity II UHPLC'],
    'Waters':        ['ACQUITY Premier UPLC', 'ACQUITY UPLC', 'ACQUITY UPLC H-Class', 'ACQUITY UPLC H-Class PLUS', 'ACQUITY UPLC I-Class', 'ACQUITY UPLC I-Class PLUS'],
    'Thermo Fisher': ['Vanquish UHPLC', 'Vanquish Core UHPLC', 'Vanquish Flex UHPLC', 'Vanquish Horizon UHPLC'],
    'Shimadzu':      ['Nexera X2', 'Nexera XR', 'Nexera X3'],
  },
  LCMS: {
    'Waters':        ['Xevo TQ-S', 'Xevo TQ-XS', 'Xevo G2-XS QTof', 'Synapt XS'],
    'Thermo Fisher': ['TSQ Altis', 'TSQ Quantis', 'Q Exactive', 'Q Exactive Plus', 'Orbitrap Exploris 480'],
    'Agilent':       ['6460 Triple Quad LC/MS', '6495 Triple Quad LC/MS', '6546 LC/Q-TOF'],
    'Shimadzu':      ['LCMS-8045', 'LCMS-8060', 'LCMS-9030 Q-TOF'],
    'SCIEX':         ['QTRAP 6500+', 'TripleTOF 6600+', 'ZenoTOF 7600'],
  },
  GC: {
    'Agilent':       ['7890A GC', '7890B GC', '8860 GC', '8890 GC'],
    'Thermo Fisher': ['Trace 1310 GC', 'Trace 1600 GC', 'FOCUS GC'],
    'Shimadzu':      ['GC-2010', 'GC-2030', 'GC-2014'],
    'PerkinElmer':   ['Clarus 590 GC', 'Clarus 690 GC'],
  },
  GCMS: {
    'Agilent':       ['5975C GC/MS', '5977B GC/MS', '7000D GC/MS Triple Quad', '7010B GC/MS Triple Quad'],
    'Thermo Fisher': ['ISQ 7000 GC-MS', 'TSQ 9000 GC-MS/MS'],
    'Shimadzu':      ['GCMS-QP2010 SE', 'GCMS-QP2020 NX', 'GCMS-TQ8050 NX'],
  },
  IC: {
    'Dionex':        ['Aquion IC System', 'Integrion HPIC System', 'ICS-900', 'ICS-1100', 'ICS-1600', 'ICS-2000', 'ICS-2100', 'ICS-3000', 'ICS-4000', 'ICS-5000', 'ICS-5000+', 'ICS-6000', 'ICS-6000 HPIC', 'ICS-6000 Capillary HPIC'],
    'Thermo Fisher': ['Aquion IC System', 'Integrion HPIC System', 'ICS-6000', 'ICS-6000 HPIC', 'ICS-6000 Capillary HPIC'],
  },
  CE: {
    'Agilent':          ['7100 Capillary Electrophoresis', 'G7100A CE'],
    'Beckman Coulter':  ['PA 800 Plus CE', 'CESI 8000 Plus'],
    'SCIEX':            ['PA 800 Plus Pharmaceutical Analysis System'],
  },
  SFC: {
    'Waters':   ['ACQUITY UPC² System', 'ACQUITY UPC² Bio System'],
    'Agilent':  ['1260 Infinity II SFC System', '1260 Infinity II Analytical SFC'],
    'Shimadzu': ['Nexera UC SFC-MS'],
  },
  TGA: {
    'TA Instruments': ['Discovery TGA 5500', 'Discovery TGA 5000', 'Discovery TGA 550', 'Discovery TGA 55', 'Discovery TGA 5500 IR', 'SDT 650', 'SDT Q600', 'Q50 TGA', 'Q500 TGA', 'Q5000 IR TGA', 'HiRes TGA 2950'],
    'NETZSCH':        ['TG 209 F1 Libra', 'TG 209 F3 Tarsus', 'STA 449 F1 Jupiter', 'STA 449 F3 Jupiter', 'TG 209 F1 Iris'],
    'Mettler Toledo': ['TGA/DSC 3+', 'TGA 2', 'TGA/DSC 1', 'TGA 1'],
    'PerkinElmer':    ['TGA 8000', 'TGA 4000', 'STA 8000'],
  },
  DSC: {
    'TA Instruments': ['Discovery DSC 250', 'Discovery DSC 2500', 'Discovery DSC 25', 'Discovery DSC 750 (HP)', 'Discovery Nano DSC', 'Q10 DSC', 'Q20 DSC', 'Q100 DSC', 'Q200 DSC', 'Q1000 DSC', 'Q2000 DSC'],
    'NETZSCH':        ['DSC 200 F3 Maia', 'DSC 214 Polyma', 'DSC 300 Caliris Select', 'DSC 404 F1 Pegasus', 'DSC 404 F3 Pegasus'],
    'Mettler Toledo': ['DSC 3+', 'DSC 2', 'DSC 1', 'Flash DSC 2+'],
    'PerkinElmer':    ['DSC 8500', 'DSC 4000', 'Pyris 1 DSC', 'DSC 6000'],
  },
  FPLC: {
    'Cytiva':  ['ÄKTA avant 25', 'ÄKTA avant 150', 'ÄKTA OligoPilot 10 Plus', 'ÄKTA OligoPilot 100 Plus', 'ÄKTA pure 25', 'ÄKTA pure 150', 'ÄKTA start', 'ÄKTA go'],
    'Bio-Rad': ['NGC Quest 10 Plus', 'NGC Quest 100 Plus', 'NGC Chromatography System'],
  },
};

function getFilteredModels(technique: string, vendor: string): string[] {
  const hasT = Boolean(technique.trim());
  const hasV = Boolean(vendor.trim());
  if (!hasT && !hasV) return [];
  if (hasT && hasV) return MODELS_BY_TECHNIQUE_AND_VENDOR[technique]?.[vendor] ?? [];
  if (hasT) return [...new Set(Object.values(MODELS_BY_TECHNIQUE_AND_VENDOR[technique] ?? {}).flat())];
  return [...new Set(Object.values(MODELS_BY_TECHNIQUE_AND_VENDOR).flatMap(m => m[vendor] ?? []))];
}

const ISSUES_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['retention time shift', 'peak tailing', 'peak broadening', 'split peaks', 'noisy baseline', 'high backpressure', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak', 'void volume issue', 'column overloading', 'pressure surge at injection'],
  UHPLC: ['retention time shift', 'peak tailing', 'peak broadening', 'split peaks', 'noisy baseline', 'high backpressure', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak', 'void volume issue', 'pressure surge at injection'],
  LCMS:  ['LCMS source contamination', 'ion suppression', 'adduct formation', 'low sensitivity', 'no peak', 'carryover', 'loss of resolution', 'retention time shift', 'peak tailing', 'noisy baseline'],
  GC:    ['GC ghost peaks', 'poor GC peak shape', 'retention time shift', 'noisy baseline', 'split peaks', 'baseline drift', 'loss of resolution', 'carryover', 'low sensitivity', 'no peak'],
  GCMS:  ['GCMS signal loss', 'GC ghost peaks', 'poor GC peak shape', 'ion suppression', 'adduct formation', 'low sensitivity', 'retention time shift', 'noisy baseline'],
  IC:    ['IC suppressor failure', 'IC baseline rise', 'IC peak distortion', 'IC wrong retention time', 'noisy baseline', 'high backpressure', 'low sensitivity', 'no peak'],
  CE:    ['noisy baseline', 'baseline drift', 'poor resolution', 'loss of resolution', 'retention time shift', 'low sensitivity', 'no peak', 'peak broadening'],
  SFC:   ['retention time shift', 'peak tailing', 'peak broadening', 'high backpressure', 'noisy baseline', 'baseline drift', 'carryover', 'loss of resolution'],
  TGA:   ['unstable mass signal', 'TGA wrong decomposition temperature', 'TGA buoyancy artifact', 'TGA oxidation in inert atmosphere', 'poor TGA reproducibility'],
  DSC:   ['DSC noisy baseline', 'DSC Tg shift', 'DSC broad melting peak', 'poor enthalpy reproducibility', 'DSC baseline curvature'],
  FPLC:  ['high system pressure', 'FPLC poor peak resolution', 'FPLC air bubbles', 'FPLC UV baseline noise', 'FPLC gradient inaccuracy', 'oligonucleotide poor separation'],
};

const ALL_ISSUES = [...new Set(Object.values(ISSUES_BY_TECHNIQUE).flat())];

function getFilteredIssues(technique: string): string[] {
  return technique.trim() ? (ISSUES_BY_TECHNIQUE[technique] ?? ALL_ISSUES) : ALL_ISSUES;
}

const URGENCY_OPTIONS = [
  'routine — can wait a few days',
  'moderate — impacting analysis schedule',
  'urgent — samples held',
  'critical — production / QC stopped',
] as const;

const SYMPTOMS_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['peak tailing', 'peak broadening', 'split peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal'],
  UHPLC: ['peak tailing', 'peak broadening', 'split peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal'],
  LCMS:  ['peak tailing', 'retention time shift', 'baseline noise', 'low signal', 'no signal', 'ion suppression', 'carryover', 'adduct peaks'],
  GC:    ['ghost peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'split peaks', 'loss of resolution', 'low signal', 'no signal', 'carryover'],
  GCMS:  ['ghost peaks', 'signal loss', 'ion suppression', 'retention time shift', 'low signal', 'adduct peaks'],
  IC:    ['baseline rise', 'peak distortion', 'wrong retention time', 'suppressor failure', 'high backpressure', 'low signal', 'no signal'],
  CE:    ['baseline noise', 'baseline drift', 'poor resolution', 'low signal', 'retention time shift', 'peak broadening'],
  SFC:   ['peak tailing', 'peak broadening', 'high backpressure', 'baseline noise', 'retention time shift', 'carryover', 'loss of resolution'],
  TGA:   ['unstable signal', 'wrong decomposition temp', 'buoyancy artifact', 'oxidation artifact', 'poor reproducibility'],
  DSC:   ['noisy baseline', 'Tg shift', 'broad melting peak', 'poor enthalpy', 'baseline curvature', 'exotherm artifact'],
  FPLC:  ['high pressure', 'poor peak resolution', 'air bubbles', 'UV baseline noise', 'gradient inaccuracy', 'oligonucleotide separation issue'],
};

const ALL_SYMPTOMS = ['peak tailing', 'peak broadening', 'split peaks', 'ghost peaks', 'retention time shift', 'baseline noise', 'baseline drift', 'pressure spike', 'high backpressure', 'loss of resolution', 'carryover', 'low signal', 'no signal', 'ion suppression'];

function getFilteredSymptoms(technique: string): string[] {
  return technique.trim() ? (SYMPTOMS_BY_TECHNIQUE[technique] ?? ALL_SYMPTOMS) : ALL_SYMPTOMS;
}

const CHECKED_BY_TECHNIQUE: Record<string, string[]> = {
  HPLC:  ['replaced column', 'replaced guard column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'],
  UHPLC: ['replaced column', 'replaced guard column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'],
  LCMS:  ['cleaned source/ion block', 'replaced column', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'checked mobile phase composition', 'restarted instrument software', 'recalibrated mass'],
  GC:    ['replaced septa / liner', 'replaced column', 'cleaned injector', 'restarted instrument software', 'checked carrier gas flow', 'baked out column', 'checked split ratio', 'replaced inlet liner'],
  GCMS:  ['replaced septa / liner', 'cleaned ion source', 'replaced column', 'cleaned injector', 'restarted instrument software', 'tuned mass spectrometer', 'baked out column'],
  IC:    ['replaced suppressor', 'replaced eluent', 'checked pump', 'replaced column', 'restarted instrument software', 'purged eluent lines', 'checked eluent concentration'],
  CE:    ['replaced capillary', 'flushed capillary', 'replaced buffer', 'cleaned electrodes', 'restarted instrument software', 'reconditioned capillary'],
  SFC:   ['replaced column', 'checked CO2 pressure', 'flushed co-solvent lines', 'checked connections', 'restarted instrument software', 'degassed mobile phase'],
  TGA:   ['calibrated temperature', 'calibrated mass', 'checked purge gas flow', 'cleaned furnace', 'replaced crucible', 'checked baseline', 'verified tare'],
  DSC:   ['calibrated temperature', 'calibrated enthalpy', 'checked purge gas flow', 'cleaned DSC cell', 'replaced pans', 'checked baseline', 'calibrated with indium'],
  FPLC:  ['cleaned column', 'regenerated column', 'replaced tubing', 'checked pump seals', 'degassed buffers', 'calibrated UV detector', 'checked column pressure limits'],
};

const ALL_CHECKED = ['replaced column', 'replaced guard column', 'cleaned source/ion block', 'flushed mobile phase lines', 'checked connections and fittings', 'primed pump', 'replaced septa / liner', 'cleaned injector', 'checked mobile phase composition', 'restarted instrument software'];

function getFilteredChecked(technique: string): string[] {
  return technique.trim() ? (CHECKED_BY_TECHNIQUE[technique] ?? ALL_CHECKED) : ALL_CHECKED;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiResult {
  ranked_answer: { confidence: number };
  ai_assisted: boolean;
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
  const [loading,          setLoading]          = useState(false);
  const [result,           setResult]           = useState<ApiResult | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [mode,             setMode]             = useState<DisplayMode>('standard');
  const [showModal,        setShowModal]        = useState(false);
  const [pendingReportId,  setPendingReportId]  = useState<string | null>(null);

  // Derived filtered lists — recomputed on every render when technique/vendor change
  const filteredModels   = getFilteredModels(technique, vendor);
  const filteredIssues   = getFilteredIssues(technique);
  const filteredSymptoms = getFilteredSymptoms(technique);
  const filteredChecked  = getFilteredChecked(technique);

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

      const data = await res.json() as ApiResult;
      setResult(data);
      setMode('standard');

      // Auto-create troubleshooting report in localStorage
      const reportId = crypto.randomUUID();
      const report: LabReport = {
        id: reportId,
        created_at: new Date().toISOString(),
        technique: technique.trim(),
        vendor: vendor.trim() || null,
        model: model.trim() || null,
        issue_category: issueCategory || null,
        symptom_description,
        confidence: data.ranked_answer?.confidence ?? 0,
        ai_assisted: data.ai_assisted ?? false,
        status: 'pending',
        resolution_note: null,
        resolved_at: null,
      };
      addReport(report);
      setPendingReportId(reportId);
      setShowModal(true);
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
                onChange={v => { setTechnique(v); setModel(''); setIssueCategory(''); }}
                options={TECHNIQUE_OPTIONS}
                placeholder="Select or type technique…"
                required
              />
            </Field>
            <Field label="Vendor">
              <ComboInput
                value={vendor}
                onChange={v => { setVendor(v); setModel(''); }}
                options={VENDOR_OPTIONS}
                placeholder="Select or type vendor…"
              />
            </Field>
            <Field label="Instrument Model">
              <ComboInput
                value={model}
                onChange={setModel}
                options={filteredModels}
                placeholder={technique || vendor ? 'Select or type model…' : 'Select technique or vendor first…'}
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
                  options={filteredIssues}
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
                chips={filteredSymptoms}
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
                chips={filteredChecked}
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
      {showModal && pendingReportId && (
        <ReportModal
          reportId={pendingReportId}
          onClose={() => setShowModal(false)}
          onSave={() => setShowModal(false)}
        />
      )}

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

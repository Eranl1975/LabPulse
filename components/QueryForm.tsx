'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Technique, LabReport, RankedAnswer } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import { addReport } from '@/lib/reportStore';
import { exportAsText, exportAsCSV } from '@/lib/export';
import ReportModal from './ReportModal';
import ModeSwitcher, { type DisplayMode } from './ModeSwitcher';
import AnswerDisplay from './AnswerDisplay';
import EmailTroubleshootingDialog from './EmailTroubleshootingDialog';
import QueryFormStep1, { type Step1Data } from './QueryFormStep1';
import QueryFormStep2, { type Step2Data } from './QueryFormStep2';
import QueryFormStep3, { type Step3Data } from './QueryFormStep3';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiResult {
  ranked_answer: RankedAnswer;
  ai_assisted: boolean;
  modes: {
    concise:  TextOutput;
    standard: TextOutput;
    deep:     TextOutput;
    manager:  ManagerOutput;
  };
}

// ── Initial data helpers ─────────────────────────────────────────────────────

const INITIAL_STEP1: Step1Data = {
  technique: '',
  vendor: '',
  model: '',
  issueCategory: '',
  urgency: '',
  problemDesc: '',
  symptoms: '',
};

const INITIAL_STEP2: Step2Data = {
  analyte: '',
  sampleMatrix: '',
  column: '',
  mobilephase: '',
  flowRate: '',
  injectionVolume: '',
  gradient: '',
  retentionTime: '',
  ionizationMode: '',
  sourceParams: '',
  acquisitionMode: '',
  recentMaint: '',
  qcResults: '',
  expectedResult: '',
  methodConditions: '',
  sst_plates: '',
  sst_tailing_factor: '',
  sst_resolution: '',
  sst_rsd_percent: '',
  sample_matrix_type: '',
  is_method_transfer: false,
  source_instrument: '',
  source_vendor: '',
  source_model: '',
  column_injection_count: '',
  extraContext: {},
};

const INITIAL_STEP3: Step3Data = {
  alreadyChecked: '',
};

// ── Step indicator ───────────────────────────────────────────────────────────

function WizardStepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'Problem' },
    { num: 2, label: 'Context' },
    { num: 3, label: 'Review' },
  ];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      marginBottom: '1.75rem',
    }}>
      {steps.map((step, i) => {
        const isActive = step.num === current;
        const isDone   = step.num < current;
        return (
          <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Connector line before (except first) */}
            {i > 0 && (
              <div style={{
                width: '3rem',
                height: '2px',
                background: isDone ? 'var(--color-teal-400)' : 'var(--color-slate-200)',
                transition: 'background .2s ease',
              }} />
            )}
            {/* Step dot + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: isActive
                  ? 'var(--color-teal-600)'
                  : isDone
                  ? 'var(--color-teal-400)'
                  : 'var(--color-slate-200)',
                color: isActive || isDone ? '#fff' : 'var(--color-slate-500)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                transition: 'background .2s ease, color .2s ease',
                boxShadow: isActive ? '0 0 0 4px rgba(20,184,166,.2)' : 'none',
              }}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : step.num}
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-teal-600)' : 'var(--color-slate-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-display)',
                transition: 'color .2s ease',
              }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main orchestrator ────────────────────────────────────────────────────────

export default function QueryForm() {
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [step1, setStep1]     = useState<Step1Data>(INITIAL_STEP1);
  const [step2, setStep2]     = useState<Step2Data>(INITIAL_STEP2);
  const [step3, setStep3]     = useState<Step3Data>(INITIAL_STEP3);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<ApiResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [mode, setMode]       = useState<DisplayMode>('standard');
  const [showModal, setShowModal]       = useState(false);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [emailTSOpen, setEmailTSOpen]   = useState(false);

  const formRef    = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: Ctrl+Enter = submit, Ctrl+1-4 = switch mode
  const handleExportText = useCallback(() => {
    if (result) exportAsText(result.ranked_answer, result.modes, step1.technique);
  }, [result, step1.technique]);
  const handleExportCSV = useCallback(() => {
    if (result) exportAsCSV(result.ranked_answer, step1.technique);
  }, [result, step1.technique]);
  const handlePrintTS = useCallback(() => { window.print(); }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter' && step === 3 && !loading) {
          e.preventDefault();
          handleSubmit();
        }
        const modes: DisplayMode[] = ['concise', 'standard', 'deep', 'manager'];
        const modeIdx = parseInt(e.key) - 1;
        if (modeIdx >= 0 && modeIdx < modes.length && result) {
          e.preventDefault();
          setMode(modes[modeIdx]);
        }
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          e.preventDefault();
          const firstInput = formRef.current?.querySelector('input');
          firstInput?.focus();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, step, loading]);

  // Focus management: scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.focus({ preventScroll: false });
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  async function handleSubmit() {
    if (!step1.technique.trim()) { setError('Please select or enter a technique.'); return; }
    if (!step1.problemDesc.trim()) { setError('Problem description is required.'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const symptom_description = [step1.problemDesc.trim(), step1.symptoms.trim()]
      .filter(Boolean).join('\n');

    const already_checked = step3.alreadyChecked
      .split('\n').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique:          step1.technique.trim() as Technique,
          vendor:             step1.vendor.trim()           || null,
          model:              step1.model.trim()            || null,
          issue_category:     step1.issueCategory           || null,
          urgency:            step1.urgency                 || null,
          symptom_description,
          method_conditions:  step2.methodConditions.trim() || null,
          already_checked,
          // Extended context (V2)
          analyte:            step2.analyte.trim()           || null,
          sample_matrix:      step2.sampleMatrix.trim()      || null,
          column:             step2.column.trim()            || null,
          mobile_phase:       step2.mobilephase.trim()       || null,
          flow_rate:          step2.flowRate.trim()           || null,
          injection_volume:   step2.injectionVolume.trim()   || null,
          gradient:           step2.gradient.trim()           || null,
          retention_time:     step2.retentionTime.trim()     || null,
          ionization_mode:    step2.ionizationMode.trim()    || null,
          source_params:      step2.sourceParams.trim()      || null,
          acquisition_mode:   step2.acquisitionMode.trim()   || null,
          recent_maintenance: step2.recentMaint.trim()       || null,
          qc_results:         step2.qcResults.trim()         || null,
          expected_result:    step2.expectedResult.trim()    || null,
          // V5 fields
          sst_plates:             step2.sst_plates.trim()       ? Number(step2.sst_plates) : null,
          sst_tailing_factor:     step2.sst_tailing_factor.trim() ? Number(step2.sst_tailing_factor) : null,
          sst_resolution:         step2.sst_resolution.trim()   ? Number(step2.sst_resolution) : null,
          sst_rsd_percent:        step2.sst_rsd_percent.trim()  ? Number(step2.sst_rsd_percent) : null,
          sample_matrix_type:     step2.sample_matrix_type      || null,
          is_method_transfer:     step2.is_method_transfer,
          source_instrument:      step2.source_instrument.trim() || null,
          source_vendor:          step2.source_vendor.trim()     || null,
          source_model:           step2.source_model.trim()      || null,
          column_injection_count: step2.column_injection_count.trim() ? Number(step2.column_injection_count) : null,
          // V6: dynamic technique-specific context
          extra_context: Object.fromEntries(
            Object.entries(step2.extraContext ?? {}).filter(([, v]) => v.trim()),
          ),
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
        technique: step1.technique.trim(),
        vendor: step1.vendor.trim() || null,
        model: step1.model.trim() || null,
        issue_category: step1.issueCategory || null,
        symptom_description,
        confidence: data.ranked_answer?.confidence ?? 0,
        ai_assisted: data.ai_assisted ?? false,
        status: 'pending',
        resolution_note: null,
        resolved_at: null,
      };
      addReport(report);
      setPendingReportId(reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Wizard stepper indicator */}
      <WizardStepper current={step} />

      <form ref={formRef} onSubmit={e => e.preventDefault()} noValidate>

        {/* ── Step 1: Instrument + Problem ──────────────────────────── */}
        {step === 1 && (
          <QueryFormStep1
            data={step1}
            onChange={setStep1}
            onNext={() => setStep(2)}
          />
        )}

        {/* ── Step 2: Method Context ───────────────────────────────── */}
        {step === 2 && (
          <QueryFormStep2
            data={step2}
            technique={step1.technique}
            issueCategory={step1.issueCategory}
            onChange={setStep2}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {/* ── Step 3: Review & Submit ──────────────────────────────── */}
        {step === 3 && (
          <>
            <QueryFormStep3
              data={step3}
              step1={step1}
              step2={step2}
              technique={step1.technique}
              loading={loading}
              onChange={setStep3}
              onSubmit={handleSubmit}
              onBack={() => setStep(2)}
            />

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
                marginTop: '1rem',
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}
          </>
        )}
      </form>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {showModal && pendingReportId && (
        <ReportModal
          reportId={pendingReportId}
          onClose={() => setShowModal(false)}
          onSave={() => setShowModal(false)}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ marginTop: '2.75rem' }} aria-live="polite" aria-busy="true">
          <div className="skeleton" style={{ height: '3rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '1.5rem', width: '60%', marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ height: '12rem', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '1.5rem', width: '40%' }} />
        </div>
      )}

      {result && (
        <div
          ref={resultsRef}
          tabIndex={-1}
          role="region"
          aria-label="Troubleshooting results"
          aria-live="polite"
          data-troubleshooting-result
          style={{ marginTop: '2.75rem', outline: 'none' }}
          className="fade-in"
        >
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
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }} data-no-print>
            <button
              type="button"
              onClick={handlePrintTS}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Print troubleshooting report"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button
              type="button"
              onClick={() => setEmailTSOpen(true)}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Send troubleshooting report by email"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="lab-btn lab-btn-secondary lab-btn-sm"
            >
              Update Outcome
            </button>
            <button
              type="button"
              onClick={handleExportText}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Export as text file"
            >
              Export TXT
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="lab-btn lab-btn-secondary lab-btn-sm"
              title="Export as CSV"
            >
              Export CSV
            </button>
          </div>
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }} data-no-print>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
              Ctrl+1-4: switch views | Ctrl+Enter: submit | /: focus search
            </span>
          </div>
        </div>
      )}

      {/* Email troubleshooting dialog */}
      {emailTSOpen && result && (
        <EmailTroubleshootingDialog
          answer={result.ranked_answer}
          technique={step1.technique}
          vendor={step1.vendor}
          model={step1.model}
          issueCategory={step1.issueCategory}
          onClose={() => setEmailTSOpen(false)}
        />
      )}
    </>
  );
}

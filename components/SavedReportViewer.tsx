'use client';

// A report reopened from history. Both views are rebuilt in the browser from
// the analysis saved with the report, so reopening costs no API call. Reports
// saved before v8.1 have no saved analysis and say so instead of guessing.

import { useEffect, useMemo, useState } from 'react';
import type { LabReport } from '@/lib/types';
import { present } from '@/agents/presentation/index';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import { updateReportFormat } from '@/lib/reportStore';
import { DEFAULT_RESPONSE_FORMAT, type ResponseFormat } from '@/lib/quick-summary';
import TroubleshootingReport from './TroubleshootingReport';
import EmailTroubleshootingDialog from './EmailTroubleshootingDialog';
import type { DisplayMode } from './ModeSwitcher';

export default function SavedReportViewer({ report, onClose }: { report: LabReport; onClose: () => void }) {
  const answer = report.answer ?? null;
  const [format, setFormat] = useState<ResponseFormat>(report.response_format ?? DEFAULT_RESPONSE_FORMAT);
  const [mode, setMode] = useState<DisplayMode>('standard');
  const [emailOpen, setEmailOpen] = useState(false);

  const modes = useMemo(() => answer && {
    concise: present(answer, 'concise') as TextOutput,
    standard: present(answer, 'standard') as TextOutput,
    deep: present(answer, 'deep') as TextOutput,
    manager: present(answer, 'manager') as ManagerOutput,
  }, [answer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !emailOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, emailOpen]);

  function changeFormat(f: ResponseFormat) {
    setFormat(f);
    updateReportFormat(report.id, f);
  }

  const instrument = [report.technique, report.vendor, report.model].filter(Boolean).join(' · ');

  return (
    <>
    <div className="vt-overlay" onClick={onClose}>
      <div className="vt-dialog" role="dialog" aria-modal="true" aria-labelledby="saved-report-title" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.625rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="saved-report-title" style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>Saved report</h2>
            <p className="vt-hint" style={{ margin: '.25rem 0 0', overflowWrap: 'anywhere' }}>
              {instrument} · {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {answer && modes ? (
          <>
            <TroubleshootingReport
              modes={modes}
              confidence={answer.confidence}
              rankedAnswer={answer}
              format={format}
              onFormatChange={changeFormat}
              mode={mode}
              onModeChange={setMode}
              technique={report.technique}
              vendor={report.vendor ?? undefined}
              model={report.model ?? undefined}
              issueCategory={report.issue_category ?? undefined}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button type="button" className="lab-btn lab-btn-secondary lab-btn-sm" onClick={() => setEmailOpen(true)}>Email</button>
              <button type="button" className="lab-btn lab-btn-secondary lab-btn-sm" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <div className="lp-report">
            <div className="qs-notice" role="status">
              <p>
                <strong>The analysis for this report is not available.</strong> It was saved before LabPulse kept
                the analysis with each report (v8.1), or it was removed to free browser storage. Neither a Quick
                Summary nor a Detailed Analysis can be shown without running the analysis again, and LabPulse will
                not reconstruct one from the saved details.
              </p>
            </div>
            <p className="qs-title">Saved details</p>
            <p className="qs-text"><strong>Problem: </strong>{report.symptom_description}</p>
            <p className="qs-meta">
              Confidence at the time: <strong>{Math.round(report.confidence * 100)}%</strong>
              {report.issue_category ? <> · {report.issue_category}</> : null}
              {' · '}{report.ai_assisted ? 'AI-assisted' : 'Rule-based'}
            </p>
            {report.resolution_note && <p className="qs-meta">Resolution note: {report.resolution_note}</p>}
            <p className="qs-meta" style={{ marginTop: '1rem' }}>
              <a href="/ask" className="qs-link">Start a new analysis</a>
            </p>
          </div>
        )}
      </div>
    </div>

      {emailOpen && answer && (
        <EmailTroubleshootingDialog
          answer={answer}
          technique={report.technique}
          vendor={report.vendor ?? ''}
          model={report.model ?? ''}
          issueCategory={report.issue_category ?? ''}
          format={format}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </>
  );
}

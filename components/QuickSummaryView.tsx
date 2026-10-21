'use client';

// Renders lib/quick-summary.ts. Every line comes from the analysis the Detailed
// Analysis shows; this view only selects, so it adds nothing to verify.

import type { QuickSummary } from '@/lib/quick-summary';
import { EvidenceBadge } from './visual/VisualFindingsPanel';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default function QuickSummaryView({ summary, onShowDetailed }: { summary: QuickSummary; onShowDetailed?: () => void }) {
  const s = summary;
  const more = [
    s.omitted.causes && plural(s.omitted.causes, 'more cause', 'more causes'),
    s.omitted.actions && plural(s.omitted.actions, 'more check or action', 'more checks and actions'),
    s.omitted.warnings && plural(s.omitted.warnings, 'more precaution', 'more precautions'),
    s.omitted.sources && plural(s.omitted.sources, 'more source', 'more sources'),
  ].filter(Boolean) as string[];

  return (
    <section className="qs" aria-label="Quick summary">
      {s.notices.length > 0 && (
        <div className="qs-notice" role="status">
          {s.notices.map((n, i) => <p key={i}><strong>Notice: </strong>{n}</p>)}
        </div>
      )}

      <h3 className="qs-title">1 · Identified problem</h3>
      <p className="qs-text">{s.problem}</p>
      {s.observed && <p className="qs-text"><strong>Seen in the images: </strong>{s.observed}</p>}
      <p className="qs-meta">
        Assessment: <strong>{s.assessment}</strong>
        {s.missing_info.length > 0 && <> · confidence limited by missing {s.missing_info.join(', ')}</>}
      </p>

      <h3 className="qs-title">2 · Most likely causes</h3>
      {s.causes.length > 0 ? (
        <ol className="qs-list">
          {s.causes.map((c, i) => (
            <li key={i}>
              {c.text}
              {c.probability && (
                <span className="qs-tag" data-level={c.confirmed ? 'confirmed' : c.probability}>
                  {c.confirmed ? 'confirmed' : `${c.probability} probability`}
                </span>
              )}
              {c.related > 0 && <span className="qs-hint"> (+{c.related} related {c.related === 1 ? 'cause' : 'causes'} tested the same way)</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="qs-text">No cause could be ranked from the available evidence.</p>
      )}

      <h3 className="qs-title">3 · Recommended actions</h3>
      <ol className="qs-list">
        {s.actions.map((x, i) => (
          <li key={i}>
            {x.kind === 'check' && <span className="qs-kind">Check</span>}
            {x.kind === 'fix' && <span className="qs-kind" data-kind="fix">Fix</span>}
            {x.kind === 'info' && <span className="qs-kind" data-kind="info">Provide</span>}
            {x.text}
          </li>
        ))}
      </ol>
      <p className="qs-meta">Recommendations: <EvidenceBadge label={s.recommendations_label} /></p>

      {(s.warnings.length > 0 || s.escalate) && (
        <>
          <h3 className="qs-title">4 · Critical warnings</h3>
          <div className="vt-safety qs-warnings" role="note">
            <ul className="vt-list" style={{ color: 'inherit' }}>
              {s.warnings.map((w, i) => <li key={i}>{w}</li>)}
              {s.escalate && <li><strong>Stop and escalate if:</strong> {s.escalate}</li>}
            </ul>
          </div>
        </>
      )}

      <h3 className="qs-title">{s.warnings.length > 0 || s.escalate ? '5' : '4'} · Sources</h3>
      {s.sources.length > 0 ? (
        <ul className="vt-list">
          {s.sources.map((src, i) => (
            <li key={i}>
              <EvidenceBadge label={src.label} />{' '}
              {src.url
                ? <a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="qs-link">{src.title}</a>
                : src.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="qs-text">No documented source backs these recommendations.</p>
      )}

      {more.length > 0 && (
        <p className="qs-more" data-no-print>
          The Detailed Analysis has {more.join(', ')}.{' '}
          {onShowDetailed && <button type="button" className="qs-more-btn" onClick={onShowDetailed}>Show Detailed Analysis</button>}
        </p>
      )}
    </section>
  );
}

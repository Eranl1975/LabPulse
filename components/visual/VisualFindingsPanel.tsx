'use client';

// The visual section of a report: safety first, the images next to what was
// seen in them, then the internal and web sources, each with its evidence label.

import type { RankedAnswerV2 } from '@/lib/types';
import type { EvidenceLabel, VisualFindings } from '@/lib/visual-types';
import { LABEL_COLOURS } from '@/lib/evidence-labels';

export function EvidenceBadge({ label }: { label: EvidenceLabel }) {
  const c = LABEL_COLOURS[label];
  return (
    <span className="vt-badge" style={{ color: c.fg, background: c.bg, borderColor: c.border }}>
      {label}
    </span>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function imageName(f: VisualFindings, index: number | null): string | null {
  if (index === null) return null;
  return f.media[index]?.label ?? `Image ${index + 1}`;
}

function SafeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  // Only http(s) links are rendered as links.
  if (!href || !/^https?:\/\//i.test(href)) return <>{children}</>;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--color-teal-600)' }}>{children}</a>;
}

export default function VisualFindingsPanel({ answer }: { answer: RankedAnswerV2 }) {
  const f = answer.visual_findings;
  if (!f) return null;
  const a = f.analysis;

  return (
    <section className="vt-findings" aria-label="Visual findings">
      {f.safety_first.length > 0 && (
        <div className="vt-safety" role="alert">
          <strong>Safety first — do this before any troubleshooting step</strong>
          <ul className="vt-list" style={{ color: 'inherit' }}>
            {f.safety_first.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {f.status.notices.length > 0 && (
        <div role="status" style={{ marginBottom: '.875rem', padding: '.625rem .875rem', borderRadius: 8, border: '1px dashed var(--color-slate-400)', fontSize: '.8125rem', lineHeight: 1.5 }}>
          {f.status.notices.map((n, i) => <div key={i}><strong>Notice: </strong>{n}</div>)}
        </div>
      )}

      <h3 className="vt-section-title" style={{ marginTop: 0 }}>Visual findings</h3>

      {f.media.some(m => m.thumbnail) && (
        <div className="vt-findings-media">
          {f.media.map((m, i) => m.thumbnail ? (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumbnail} alt={m.label} />
              <figcaption>{m.label}</figcaption>
            </figure>
          ) : null)}
        </div>
      )}

      {f.user_description && (
        <p style={{ fontSize: '.9rem', margin: '0 0 .75rem' }}><strong>Your description: </strong>{f.user_description}</p>
      )}

      {a ? (
        <div style={{ display: 'grid', gap: '.875rem' }}>
          {a.summary && <p style={{ margin: 0, fontSize: '.9rem' }}>{a.summary}</p>}

          {a.instrument_consistency.status === 'mismatch' && (
            <div className="vt-error" style={{ marginTop: 0 }}>
              <strong>Instrument mismatch: </strong>{a.instrument_consistency.explanation}
            </div>
          )}

          {a.ocr_text.length > 0 && (
            <div>
              <p className="vt-section-title">Text read from the images</p>
              <ul className="vt-list">
                {a.ocr_text.map((o, i) => (
                  <li key={i}>
                    <code>{o.text}</code> — {pct(o.confidence)}
                    {o.low_confidence && <span className="vt-lowconf">low confidence</span>}
                    {imageName(f, o.image_index) && <span className="vt-hint"> · {imageName(f, o.image_index)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.observations.length > 0 && (
            <div>
              <p className="vt-section-title">Observations</p>
              <ul className="vt-list">
                {a.observations.map((o, i) => (
                  <li key={i}>
                    {o.hazard && <strong style={{ color: '#b91c1c' }}>⚠ </strong>}
                    {o.description} — {pct(o.confidence)}
                    {o.low_confidence && <span className="vt-lowconf">low confidence, not stated as fact</span>}
                    {imageName(f, o.image_index) && <span className="vt-hint"> · {imageName(f, o.image_index)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.components.length > 0 && (
            <div>
              <p className="vt-section-title">Components identified</p>
              <ul className="vt-list">
                {a.components.map((c, i) => (
                  <li key={i}>
                    {c.name} — {pct(c.confidence)}
                    {c.low_confidence && <span className="vt-lowconf">low confidence</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.uncertainties.length > 0 && (
            <div>
              <p className="vt-section-title">Could not be determined</p>
              <ul className="vt-list">
                {a.uncertainties.map((u, i) => (
                  <li key={i}>{u.what}{u.better_photo ? <span className="vt-hint"> — Better photo: {u.better_photo}</span> : null}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="vt-hint">No image analysis is available for this report.</p>
      )}

      <div style={{ marginTop: '1rem' }}>
        <p className="vt-section-title">How the recommendations were produced</p>
        <p style={{ margin: 0, fontSize: '.875rem' }}>
          The diagnosis and actions below: <EvidenceBadge label={f.recommendations_label} />
        </p>
      </div>

      {f.internal_references.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p className="vt-section-title">LabPulse documents for this instrument</p>
          <ul className="vt-list">
            {f.internal_references.map((r, i) => (
              <li key={i}>
                <EvidenceBadge label={r.label} />{' '}
                <SafeLink href={r.url}>{r.title}</SafeLink>
                {!r.content_read && <span className="vt-hint"> — cited by title and link; LabPulse has not read its content</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <p className="vt-section-title">Web research</p>
        {f.web_sources.length > 0 ? (
          <ul className="vt-list">
            {f.web_sources.map((w, i) => (
              <li key={i}>
                <EvidenceBadge label={w.label} />{' '}
                <SafeLink href={w.url}>{w.title}</SafeLink>
                <span className="vt-hint"> · {w.category} · {w.domain}</span>
                {w.summary && <div style={{ fontSize: '.85rem', marginTop: '.15rem' }}>{w.summary}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="vt-hint" style={{ marginTop: 0 }}>
            {f.status.web_reason ?? 'No web sources were used for this report.'}
          </p>
        )}
        {f.status.web_queries.length > 0 && (
          <p className="vt-hint">Searched: {f.status.web_queries.map(q => `“${q}”`).join(', ')}</p>
        )}
      </div>
    </section>
  );
}

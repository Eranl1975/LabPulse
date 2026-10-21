import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { RankedAnswerV2 } from './types';
import type { EvidenceLabel } from './visual-types';
import { hypothesisHeading } from './hypothesis-clustering';
import { labelForSource, labelForGeneration, labelForAction, LABEL_COLOURS } from './evidence-labels';
import { safeThumbnails, pctLabel } from './visual-report';
import { buildQuickSummary, type ResponseFormat } from './quick-summary';

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
  },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: '#0a1628' },
  subtitle: { fontSize: 11, color: '#475569', marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
  },
  item: { marginBottom: 3, paddingLeft: 8 },
  safetyBox: {
    marginTop: 10,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 4,
  },
  safetyText: { fontSize: 9, color: '#991b1b' },
  confBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 3 },
  tableCell: { flex: 1, fontSize: 9, paddingHorizontal: 4 },
  tableHeader: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', paddingHorizontal: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
  checklist: { marginBottom: 2, paddingLeft: 12 },
  badge: { fontSize: 7, fontFamily: 'Helvetica-Bold', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  thumb: { width: 110, marginRight: 6, marginBottom: 6 },
  thumbImg: { width: 110, height: 82, objectFit: 'cover', borderRadius: 3 },
  thumbCaption: { fontSize: 7, color: '#64748b', marginTop: 1 },
});

function Badge({ label }: { label: EvidenceLabel }) {
  const c = LABEL_COLOURS[label];
  return <Text style={[s.badge, { color: c.fg, backgroundColor: c.bg, borderColor: c.border }]}>{label}</Text>;
}

function VisualSection({ answer }: { answer: RankedAnswerV2 }) {
  const f = answer.visual_findings;
  if (!f) return null;
  const a = f.analysis;
  const thumbs = safeThumbnails(answer);
  const imageName = (i: number | null) => (i === null ? '' : ` (${f.media[i]?.label ?? `Image ${i + 1}`})`);
  return (
    <>
      <Text style={s.sectionTitle}>Visual Findings</Text>
      {thumbs.length > 0 && (
        <View style={s.thumbs}>
          {thumbs.map((t, i) => (
            <View key={i} style={s.thumb} wrap={false}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={t.dataUrl} style={s.thumbImg} />
              <Text style={s.thumbCaption}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}
      {f.status.notices.map((n, i) => <Text key={`n${i}`} style={[s.item, { color: '#475569' }]}>Notice: {n}</Text>)}
      {f.user_description ? <Text style={s.item}>User description: {f.user_description}</Text> : null}
      {a ? (
        <>
          {a.summary ? <Text style={s.item}>{a.summary}</Text> : null}
          {a.instrument_consistency.status === 'mismatch' ? (
            <Text style={[s.item, { color: '#991b1b' }]}>Instrument mismatch: {a.instrument_consistency.explanation}</Text>
          ) : null}
          {a.ocr_text.length > 0 && <Text style={[s.item, { fontFamily: 'Helvetica-Bold' }]}>Text read from the images</Text>}
          {a.ocr_text.map((o, i) => (
            <Text key={`o${i}`} style={[s.item, { marginLeft: 12 }]}>
              • "{o.text}" — {pctLabel(o.confidence)}{o.low_confidence ? ' (low confidence)' : ''}{imageName(o.image_index)}
            </Text>
          ))}
          {a.observations.length > 0 && <Text style={[s.item, { fontFamily: 'Helvetica-Bold' }]}>Observations</Text>}
          {a.observations.map((o, i) => (
            <Text key={`b${i}`} style={[s.item, { marginLeft: 12 }]}>
              • {o.hazard ? '[HAZARD] ' : ''}{o.description} — {pctLabel(o.confidence)}{o.low_confidence ? ' (low confidence, not stated as fact)' : ''}{imageName(o.image_index)}
            </Text>
          ))}
          {a.components.length > 0 && (
            <Text style={s.item}>Components: {a.components.map(c => `${c.name} (${pctLabel(c.confidence)}${c.low_confidence ? ', low confidence' : ''})`).join('; ')}</Text>
          )}
          {a.uncertainties.map((u, i) => (
            <Text key={`u${i}`} style={[s.item, { color: '#475569' }]}>Could not determine: {u.what}{u.better_photo ? ` — better photo: ${u.better_photo}` : ''}</Text>
          ))}
        </>
      ) : (
        <Text style={[s.item, { color: '#475569' }]}>No image analysis is available for this report.</Text>
      )}

      {f.internal_references.length > 0 && <Text style={[s.item, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>LabPulse documents for this instrument</Text>}
      {f.internal_references.map((r, i) => (
        <View key={`r${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginBottom: 2 }} wrap={false}>
          <Badge label={r.label} />
          <Text style={{ fontSize: 9, marginLeft: 4, flex: 1 }}>{r.title}{r.url ? ` — ${r.url}` : ''}{r.content_read ? '' : ' (cited by title and link; content not read)'}</Text>
        </View>
      ))}

      {f.web_sources.length > 0 && <Text style={[s.item, { fontFamily: 'Helvetica-Bold', marginTop: 4 }]}>Web research</Text>}
      {f.web_sources.map((w, i) => (
        <View key={`w${i}`} style={{ marginLeft: 12, marginBottom: 3 }} wrap={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Badge label={w.label} />
            <Text style={{ fontSize: 9, marginLeft: 4, flex: 1 }}>{w.title} — {w.category}</Text>
          </View>
          <Text style={{ fontSize: 8, color: '#64748b' }}>{w.url}</Text>
          {w.summary ? <Text style={{ fontSize: 9, color: '#334155' }}>{w.summary}</Text> : null}
        </View>
      ))}
    </>
  );
}

function confColor(conf: number): { bg: string; fg: string } {
  if (conf >= 0.80) return { bg: '#ecfdf5', fg: '#065f46' };
  if (conf >= 0.60) return { bg: '#eff6ff', fg: '#1d4ed8' };
  if (conf >= 0.40) return { bg: '#fffbeb', fg: '#92400e' };
  return { bg: '#fef2f2', fg: '#991b1b' };
}

interface TroubleshootingPdfOptions {
  technique: string;
  vendor?: string;
  model?: string;
  issueCategory?: string;
  /** Quick Summary or Detailed Analysis (default) of the same answer. */
  format?: ResponseFormat;
}

/** The Quick Summary, derived from the same answer as the detailed PDF. */
function QuickSummarySection({ answer }: { answer: RankedAnswerV2 }) {
  const q = buildQuickSummary(answer);
  return (
    <>
      {q.notices.map((n, i) => (
        <Text key={i} style={[s.item, { color: '#475569' }]}>Notice: {n}</Text>
      ))}

      <Text style={s.sectionTitle}>1 · Identified Problem</Text>
      <Text style={s.item}>{q.problem}</Text>
      {q.observed ? <Text style={s.item}>Seen in the images: {q.observed}</Text> : null}
      <Text style={[s.item, { color: '#475569' }]}>
        Assessment: {q.assessment}{q.missing_info.length ? ` · confidence limited by missing ${q.missing_info.join(', ')}` : ''}
      </Text>

      <Text style={s.sectionTitle}>2 · Most Likely Causes</Text>
      {q.causes.length ? q.causes.map((c, i) => (
        <Text key={i} style={s.item}>
          {i + 1}. {c.text}{c.probability ? ` [${c.confirmed ? 'confirmed' : `${c.probability} probability`}]` : ''}
        </Text>
      )) : <Text style={s.item}>No cause could be ranked from the available evidence.</Text>}

      <Text style={s.sectionTitle}>3 · Recommended Actions</Text>
      {q.actions.map((x, i) => (
        <Text key={i} style={s.item}>{i + 1}. {x.kind === 'check' ? 'Check: ' : x.kind === 'info' ? 'Provide: ' : ''}{x.text}</Text>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingLeft: 8 }}>
        <Text style={{ fontSize: 9, marginRight: 4 }}>Recommendations:</Text>
        <Badge label={q.recommendations_label} />
      </View>

      {q.warnings.length || q.escalate ? (
        <View style={s.safetyBox}>
          <Text style={[s.safetyText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>4 · Critical Warnings</Text>
          {q.warnings.map((w, i) => <Text key={i} style={s.safetyText}>• {w}</Text>)}
          {q.escalate ? <Text style={s.safetyText}>• Stop and escalate if: {q.escalate}</Text> : null}
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Sources</Text>
      {q.sources.length ? q.sources.map((src, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3, paddingLeft: 8 }} wrap={false}>
          <Badge label={src.label} />
          <Text style={{ fontSize: 9, marginLeft: 4, flex: 1 }}>{src.title}{src.url ? ` — ${src.url}` : ''}</Text>
        </View>
      )) : <Text style={s.item}>No documented source backs these recommendations.</Text>}

      <Text style={[s.item, { marginTop: 10, color: '#64748b', fontSize: 9 }]}>
        This is the Quick Summary of the analysis. The Detailed Analysis has every hypothesis, diagnostic, action, reference and precaution.
      </Text>
    </>
  );
}

function TroubleshootingDocument({ answer, options }: { answer: RankedAnswerV2; options: TroubleshootingPdfOptions }) {
  const cc = confColor(answer.confidence);
  const instrument = [options.technique, options.vendor, options.model].filter(Boolean).join(' · ');

  return (
    <Document>
      <Page style={s.page} size="A4">
        <Text style={s.title}>LabPulse Troubleshooting Report{options.format === 'summary' ? ' — Quick Summary' : ''}</Text>
        <Text style={s.subtitle}>{instrument}{options.issueCategory ? ` — ${options.issueCategory}` : ''}</Text>

        <View style={[s.confBadge, { backgroundColor: cc.bg }]}>
          <Text style={{ color: cc.fg, fontSize: 9 }}>
            Confidence: {Math.round(answer.confidence * 100)}% — {answer.confidence_breakdown?.label ?? 'N/A'}
          </Text>
        </View>

        {options.format === 'summary' ? <QuickSummarySection answer={answer} /> : (<>
        {/* Generation notice */}
        {answer.generation?.notice ? (
          <Text style={[s.item, { color: '#475569' }]}>Notice: {answer.generation.notice}</Text>
        ) : null}

        {/* Visual safety steps lead the report */}
        {answer.visual_findings?.safety_first.length ? (
          <View style={s.safetyBox}>
            <Text style={[s.safetyText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>Safety first — before any troubleshooting step</Text>
            {answer.visual_findings.safety_first.map((w, i) => (
              <Text key={i} style={s.safetyText}>• {w}</Text>
            ))}
          </View>
        ) : null}

        <VisualSection answer={answer} />

        {/* Problem Summary */}
        <Text style={s.sectionTitle}>Problem Summary</Text>
        <Text style={s.item}>{answer.problem_summary}</Text>

        {/* Safety Warnings */}
        {answer.safety_warnings && answer.safety_warnings.length > 0 && (
          <View style={s.safetyBox}>
            <Text style={[s.safetyText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>Safety & Preservation Warnings</Text>
            {answer.safety_warnings.map((w, i) => (
              <Text key={i} style={s.safetyText}>• {w}</Text>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontSize: 9, marginRight: 4 }}>Recommendations below:</Text>
          <Badge label={labelForGeneration(answer.generation)} />
        </View>

        {/* Hypotheses / Likely Causes */}
        <Text style={s.sectionTitle}>
          {answer.hypotheses?.length ? 'Ranked Hypotheses' : 'Likely Causes'}
        </Text>
        {answer.hypotheses?.length ? (
          answer.hypotheses.map((h, i) => (
            <View key={i}>
              <Text style={s.item}>
                {h.rank}. [{h.probability}] {hypothesisHeading(h)} — {h.status === 'confirmed' ? 'CONFIRMED' : 'suspected'}
              </Text>
              {h.grouped_causes && h.grouped_causes.length > 1 ? (
                <Text style={[s.item, { marginLeft: 12, color: '#475569' }]}>
                  One test separates these {h.grouped_causes.length} causes: {h.grouped_causes.join('; ')}
                </Text>
              ) : null}
              {h.diagnostic_test ? (
                <Text style={[s.item, { marginLeft: 12, color: '#475569' }]}>Test: {h.diagnostic_test}{h.expected_result ? ` — Expected if true: ${h.expected_result}` : ''}</Text>
              ) : null}
            </View>
          ))
        ) : (
          answer.likely_causes.map((c, i) => (
            <Text key={i} style={s.item}>{i + 1}. {c}</Text>
          ))
        )}

        {/* Diagnostic Checks */}
        <Text style={s.sectionTitle}>Diagnostic Checks</Text>
        {answer.checks.map((c, i) => (
          <Text key={i} style={s.item}>{i + 1}. {c}</Text>
        ))}

        {/* Detector-Specific Checks */}
        {answer.detector_checks?.length ? (
          <>
            <Text style={s.sectionTitle}>Detector-Specific Checks</Text>
            {answer.detector_checks.map((block, bi) => (
              <View key={bi}>
                <Text style={[s.item, { fontWeight: 700 }]}>{block.label} — {block.title}</Text>
                {block.checks.map((c, i) => (
                  <Text key={i} style={[s.item, { marginLeft: 12 }]}>{i + 1}. {c}</Text>
                ))}
                {block.ion_reference?.length ? (
                  <>
                    <Text style={[s.item, { marginLeft: 12, fontWeight: 700 }]}>Reference ion sets:</Text>
                    {block.ion_reference.map((r, i) => (
                      <Text key={i} style={[s.item, { marginLeft: 24, color: '#475569' }]}>{r.ions} — {r.meaning}</Text>
                    ))}
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Corrective Actions */}
        <Text style={s.sectionTitle}>Corrective Actions</Text>
        {answer.corrective_actions.map((a, i) => (
          <Text key={i} style={s.item}>{i + 1}. {a}</Text>
        ))}

        {/* Action Details */}
        {answer.action_details && answer.action_details.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Action Details</Text>
            {answer.action_details.map((ad, i) => (
              <View key={i} style={{ marginBottom: 6, paddingLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, flex: 1 }}>{i + 1}. {ad.action}</Text>
                  <Badge label={labelForAction(ad, answer.generation)} />
                </View>
                <Text style={{ fontSize: 9, color: '#475569' }}>When: {ad.condition}</Text>
                <Text style={{ fontSize: 9, color: '#475569' }}>Materials: {ad.materials.join(', ') || 'None specified'}</Text>
                <Text style={{ fontSize: 9, color: '#475569' }}>Safety: {ad.safety_level} | Source: {ad.evidence_source}</Text>
                <Text style={{ fontSize: 9, color: '#475569' }}>Rollback: {ad.rollback}</Text>
              </View>
            ))}
          </>
        )}

        {/* Verification Criteria */}
        {answer.verification_criteria && answer.verification_criteria.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Verification Criteria</Text>
            <View style={s.tableRow}>
              <Text style={s.tableHeader}>Parameter</Text>
              <Text style={s.tableHeader}>Expected</Text>
              <Text style={s.tableHeader}>Tolerance</Text>
              <Text style={s.tableHeader}>Method</Text>
            </View>
            {answer.verification_criteria.map((vc, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableCell}>{vc.parameter}</Text>
                <Text style={s.tableCell}>{vc.expected_value}</Text>
                <Text style={s.tableCell}>{vc.tolerance}</Text>
                <Text style={s.tableCell}>{vc.method}</Text>
              </View>
            ))}
          </>
        )}

        {/* Escalation */}
        <Text style={s.sectionTitle}>Escalation Criteria</Text>
        {answer.stop_conditions.map((s2, i) => (
          <Text key={i} style={s.item}>• {s2}</Text>
        ))}

        {/* Sources, each with its evidence label */}
        <Text style={s.sectionTitle}>Evidence Sources</Text>
        {answer.sources_with_metadata?.length ? (
          answer.sources_with_metadata.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3, paddingLeft: 8 }} wrap={false}>
              <Badge label={labelForSource(e)} />
              <Text style={{ fontSize: 9, marginLeft: 4, flex: 1 }}>
                {e.source_metadata?.title ?? e.source_id}{e.source_metadata?.url ? ` — ${e.source_metadata.url}` : ''}: {e.excerpt}
              </Text>
            </View>
          ))
        ) : (
          answer.evidence_summary.map((e, i) => (
            <Text key={i} style={s.item}>• [{e.evidence_strength}] {e.source_id}: {e.excerpt}</Text>
          ))
        )}

        {/* Printable Checklist */}
        {answer.printable_checklist?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Printable Checklist</Text>
            {answer.printable_checklist.map((item, i) => (
              <Text key={i} style={s.checklist}>☐ {item}</Text>
            ))}
          </>
        )}
        </>)}

        <Text style={s.footer}>
          Generated by LabPulse v8.1.0 · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateTroubleshootingPdf(
  answer: RankedAnswerV2,
  options: TroubleshootingPdfOptions,
): Promise<Buffer> {
  return renderToBuffer(
    <TroubleshootingDocument answer={answer} options={options} />
  ) as Promise<Buffer>;
}

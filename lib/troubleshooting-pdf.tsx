import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { RankedAnswerV2 } from './types';

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
});

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
}

function TroubleshootingDocument({ answer, options }: { answer: RankedAnswerV2; options: TroubleshootingPdfOptions }) {
  const cc = confColor(answer.confidence);
  const instrument = [options.technique, options.vendor, options.model].filter(Boolean).join(' · ');

  return (
    <Document>
      <Page style={s.page} size="A4">
        <Text style={s.title}>LabPulse Troubleshooting Report</Text>
        <Text style={s.subtitle}>{instrument}{options.issueCategory ? ` — ${options.issueCategory}` : ''}</Text>

        <View style={[s.confBadge, { backgroundColor: cc.bg }]}>
          <Text style={{ color: cc.fg, fontSize: 9 }}>
            Confidence: {Math.round(answer.confidence * 100)}% — {answer.confidence_breakdown?.label ?? 'N/A'}
          </Text>
        </View>

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

        {/* Hypotheses / Likely Causes */}
        <Text style={s.sectionTitle}>
          {answer.hypotheses?.length ? 'Ranked Hypotheses' : 'Likely Causes'}
        </Text>
        {answer.hypotheses?.length ? (
          answer.hypotheses.map((h, i) => (
            <Text key={i} style={s.item}>
              {h.rank}. [{h.probability}] {h.cause} — {h.status === 'confirmed' ? 'CONFIRMED' : 'suspected'}
            </Text>
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
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>{i + 1}. {ad.action}</Text>
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

        {/* Sources */}
        <Text style={s.sectionTitle}>Evidence Sources</Text>
        {answer.evidence_summary.map((e, i) => (
          <Text key={i} style={s.item}>• [{e.evidence_strength}] {e.source_id}: {e.excerpt}</Text>
        ))}

        {/* Printable Checklist */}
        {answer.printable_checklist?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Printable Checklist</Text>
            {answer.printable_checklist.map((item, i) => (
              <Text key={i} style={s.checklist}>☐ {item}</Text>
            ))}
          </>
        )}

        <Text style={s.footer}>
          Generated by LabPulse v5.0.0 · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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

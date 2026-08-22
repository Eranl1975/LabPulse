import { Document, Page, Text, View, StyleSheet, Link, renderToBuffer } from '@react-pdf/renderer';
import type { CleaningProcedureContent } from './cleaning-types';

// ── Styles ──────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
  },

  // Header
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: '#0a1628' },
  subtitle: { fontSize: 11, color: '#475569', marginBottom: 4 },
  meta: { fontSize: 9, color: '#64748b', marginBottom: 2 },

  // Source badge
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  badge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  // AI disclaimer
  disclaimer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 4,
    fontSize: 9,
    color: '#92400e',
  },

  // Sections
  section: { marginTop: 14, marginBottom: 4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  // Lists
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  bullet: { width: 10, fontSize: 10, color: '#64748b' },
  olNum: { width: 16, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#475569' },
  listText: { flex: 1, fontSize: 9.5, color: '#334155', lineHeight: 1.5 },

  // Steps
  stepRow: { flexDirection: 'row', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  stepNum: {
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: '#0f9188',
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 18,
    marginRight: 8,
    marginTop: 1,
  },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0a1628', marginBottom: 2 },
  stepDuration: { fontSize: 8, color: '#0f9188', marginLeft: 6 },
  stepDesc: { fontSize: 9, color: '#475569', lineHeight: 1.5 },
  stepWarning: {
    fontSize: 8.5,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    padding: 4,
    borderRadius: 3,
    marginTop: 3,
  },

  // Danger section
  dangerSection: { marginTop: 14, marginBottom: 4, padding: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 4 },
  dangerTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  dangerItem: { fontSize: 9.5, color: '#991b1b', marginBottom: 3, fontFamily: 'Helvetica-Bold' },

  // Warning section
  warnSection: { marginTop: 14, marginBottom: 4, padding: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 4 },
  warnTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  warnItem: { fontSize: 9.5, color: '#78350f', marginBottom: 3 },

  // Frequency grid
  freqRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  freqCard: { flex: 1, padding: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 },
  freqLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  freqValue: { fontSize: 9, color: '#1e293b', lineHeight: 1.4 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 8,
    color: '#94a3b8',
  },

  link: { color: '#0f9188', textDecoration: 'underline' },
  bold: { fontFamily: 'Helvetica-Bold' },
});

// ── Badge config ────────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  official_manufacturer:      { color: '#16a34a', bg: '#f0fdf4', label: 'Official Manufacturer' },
  manufacturer_documentation: { color: '#d97706', bg: '#fffbeb', label: 'Manufacturer Documentation' },
  ai_generated:               { color: '#64748b', bg: '#f8fafc', label: 'AI-Generated' },
};

// ── Component ───────────────────────────────────────────────────────────────────

interface Props {
  procedure: CleaningProcedureContent;
  generatedAt?: string;
}

export function CleaningProcedurePDF({ procedure, generatedAt }: Props) {
  const badge = BADGE_CONFIG[procedure.source_type] ?? BADGE_CONFIG.ai_generated;
  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Document title={`Cleaning Procedure – ${procedure.manufacturer} ${procedure.model}`}>
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Text style={s.title}>Cleaning Procedure</Text>
        <Text style={s.subtitle}>{procedure.instrument}</Text>
        {procedure.manufacturer !== 'Generic' && (
          <Text style={s.meta}>Manufacturer: {procedure.manufacturer}</Text>
        )}
        {procedure.model !== 'General' && (
          <Text style={s.meta}>Model: {procedure.model}</Text>
        )}

        {/* Source badge */}
        <View style={s.badgeRow}>
          <Text style={[s.badge, { color: badge.color, backgroundColor: badge.bg }]}>
            {badge.label}
          </Text>
        </View>

        {/* AI disclaimer */}
        {procedure.source_type === 'ai_generated' && (
          <View style={s.disclaimer}>
            <Text style={s.bold}>AI-Generated Cleaning Procedure</Text>
            <Text>
              {' '}— Official manufacturer cleaning instructions were not located.
              Verify this procedure against the manufacturer&apos;s documentation before performing maintenance.
            </Text>
          </View>
        )}

        {/* Source link */}
        {procedure.source_url && (
          <View style={{ marginBottom: 4 }}>
            {procedure.source_title && (
              <Text style={{ fontSize: 9, color: '#475569' }}>{procedure.source_title}</Text>
            )}
            <Link src={procedure.source_url} style={s.link}>
              <Text style={{ fontSize: 9 }}>{procedure.source_url}</Text>
            </Link>
          </View>
        )}

        {/* Confidence */}
        {procedure.confidence_note && (
          <Text style={{ fontSize: 8.5, color: '#94a3b8', marginBottom: 8 }}>
            Confidence: {Math.round(procedure.confidence * 100)}% — {procedure.confidence_note}
          </Text>
        )}

        {/* ── Required Materials ───────────────────────────────────────── */}
        {procedure.materials_needed.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Required Materials</Text>
            {procedure.materials_needed.map((m, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listText}>
                  <Text style={s.bold}>{m.name}</Text>
                  {m.specification ? ` (${m.specification})` : ''}
                  {m.purpose ? ` — ${m.purpose}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Before Cleaning ──────────────────────────────────────────── */}
        {procedure.before_cleaning.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Before Cleaning</Text>
            {procedure.before_cleaning.map((step, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.olNum}>{i + 1}.</Text>
                <Text style={s.listText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Cleaning Steps ───────────────────────────────────────────── */}
        {procedure.cleaning_steps.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cleaning Steps</Text>
            {procedure.cleaning_steps.map((step) => (
              <View key={step.step_number} style={s.stepRow} wrap={false}>
                <Text style={s.stepNum}>{step.step_number}</Text>
                <View style={s.stepBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    {step.duration && <Text style={s.stepDuration}>{step.duration}</Text>}
                  </View>
                  <Text style={s.stepDesc}>{step.description}</Text>
                  {step.warnings?.map((w, wi) => (
                    <Text key={wi} style={s.stepWarning}>{w}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── After Cleaning ───────────────────────────────────────────── */}
        {procedure.after_cleaning.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>After Cleaning</Text>
            {procedure.after_cleaning.map((step, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.olNum}>{i + 1}.</Text>
                <Text style={s.listText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── What You Must Not Do ─────────────────────────────────────── */}
        {procedure.what_not_to_do.length > 0 && (
          <View style={s.dangerSection} wrap={false}>
            <Text style={s.dangerTitle}>What You Must Not Do</Text>
            {procedure.what_not_to_do.map((item, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={[s.listText, s.dangerItem]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Cleaning Frequency ───────────────────────────────────────── */}
        {procedure.cleaning_frequency && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Cleaning Frequency</Text>
            <View style={s.freqRow}>
              <View style={s.freqCard}>
                <Text style={s.freqLabel}>Routine</Text>
                <Text style={s.freqValue}>{procedure.cleaning_frequency.routine}</Text>
              </View>
              <View style={s.freqCard}>
                <Text style={s.freqLabel}>After Contamination</Text>
                <Text style={s.freqValue}>{procedure.cleaning_frequency.after_contamination}</Text>
              </View>
              <View style={s.freqCard}>
                <Text style={s.freqLabel}>Preventive</Text>
                <Text style={s.freqValue}>{procedure.cleaning_frequency.preventive}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Safety Warnings ──────────────────────────────────────────── */}
        {procedure.safety_warnings.length > 0 && (
          <View style={s.warnSection} wrap={false}>
            <Text style={s.warnTitle}>Safety Warnings</Text>
            {procedure.safety_warnings.map((w, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={[s.listText, s.warnItem]}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {procedure.notes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            {procedure.notes.map((n, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={[s.listText, { color: '#64748b' }]}>{n}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text>Generated by LabPulse{dateStr ? ` — ${dateStr}` : ''}</Text>
          <Text>labpulse.app</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render the cleaning procedure PDF to a Buffer. */
export async function renderCleaningPdf(
  procedure: CleaningProcedureContent,
  generatedAt?: string,
): Promise<Buffer> {
  return renderToBuffer(
    <CleaningProcedurePDF procedure={procedure} generatedAt={generatedAt} />,
  ) as Promise<Buffer>;
}

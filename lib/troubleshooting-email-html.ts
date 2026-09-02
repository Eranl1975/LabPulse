import type { RankedAnswer, RankedAnswerV2 } from './types';

// ── HTML entity escaping ────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Builder ─────────────────────────────────────────────────────────────────────

export interface TroubleshootingEmailOptions {
  technique: string;
  vendor?: string | null;
  model?: string | null;
  issueCategory?: string | null;
  symptomDescription?: string;
  message?: string;
  date?: string;
}

export function buildTroubleshootingEmailHtml(
  answer: RankedAnswer,
  options: TroubleshootingEmailOptions,
): string {
  const dateStr = options.date
    ? new Date(options.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const sectionStyle = 'margin:0 0 16px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;';
  const sectionTitle = 'margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;';

  // Instrument line
  const instrumentParts: string[] = [esc(options.technique)];
  if (options.vendor) instrumentParts.push(esc(options.vendor));
  if (options.model) instrumentParts.push(esc(options.model));
  const instrumentLabel = instrumentParts.join(' — ');

  // V2 check
  const v2 = 'confidence_breakdown' in answer ? (answer as RankedAnswerV2) : null;

  // Confidence badge (5-level)
  const pct = Math.round(answer.confidence * 100);
  const confColor = answer.confidence >= 0.95 ? '#065f46' : answer.confidence >= 0.80 ? '#16a34a' : answer.confidence >= 0.60 ? '#2563eb' : answer.confidence >= 0.40 ? '#d97706' : '#dc2626';
  const confBg = answer.confidence >= 0.95 ? '#ecfdf5' : answer.confidence >= 0.80 ? '#f0fdf4' : answer.confidence >= 0.60 ? '#eff6ff' : answer.confidence >= 0.40 ? '#fffbeb' : '#fef2f2';
  const confLabel = v2?.confidence_breakdown?.label ?? (answer.confidence >= 0.80 ? 'Strongly supported' : answer.confidence >= 0.60 ? 'Probable cause' : answer.confidence >= 0.40 ? 'Preliminary hypothesis' : 'Insufficient evidence');

  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<!-- Header -->
<tr><td style="background:#0a1628;padding:24px 28px;">
  <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#ffffff;">Troubleshooting Report</h1>
  <p style="margin:0;font-size:14px;color:#94a3b8;">${instrumentLabel}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:24px 28px;">`;

  // Personal message
  if (options.message?.trim()) {
    html += `
  <div style="margin:0 0 20px;padding:12px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:13px;color:#0c4a6e;line-height:1.5;">
    ${esc(options.message)}
  </div>`;
  }

  // Confidence badge
  html += `
  <div style="margin:0 0 16px;">
    <span style="display:inline-block;padding:3px 10px;background:${confBg};color:${confColor};font-size:11px;font-weight:600;border-radius:12px;">${confLabel} confidence — ${pct}%</span>
  </div>`;

  // Instrument details
  html += `
  <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">`;
  if (options.vendor) {
    html += `<tr><td style="font-size:12px;color:#64748b;padding:0 0 2px;">Vendor: <strong>${esc(options.vendor)}</strong></td></tr>`;
  }
  if (options.model) {
    html += `<tr><td style="font-size:12px;color:#64748b;padding:0 0 2px;">Model: <strong>${esc(options.model)}</strong></td></tr>`;
  }
  if (options.issueCategory) {
    html += `<tr><td style="font-size:12px;color:#64748b;padding:0 0 2px;">Issue: <strong>${esc(options.issueCategory)}</strong></td></tr>`;
  }
  html += `</table>`;

  // Problem Summary
  if (answer.problem_summary) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Problem Summary</h3>
    <p style="margin:0;font-size:13px;color:#334155;line-height:1.5;">${esc(answer.problem_summary)}</p>
  </div>`;
  }

  // Safety Warnings (V3)
  if (v2?.safety_warnings && v2.safety_warnings.length > 0) {
    html += `
  <div style="margin:0 0 16px;padding:12px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">⚠ Safety & Preservation</h3>
    <ul style="margin:0;padding-left:20px;">
      ${v2.safety_warnings.map(w =>
        `<li style="font-size:13px;color:#991b1b;margin:0 0 4px;line-height:1.5;">${esc(w)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Likely Causes
  if (answer.likely_causes.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Likely Causes</h3>
    <ol style="margin:0;padding-left:20px;">
      ${answer.likely_causes.map(c =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;">${esc(c)}</li>`
      ).join('\n      ')}
    </ol>
  </div>`;
  }

  // Diagnostic Checks
  if (answer.checks.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Diagnostic Checks</h3>
    <ol style="margin:0;padding-left:20px;">
      ${answer.checks.map(c =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;">${esc(c)}</li>`
      ).join('\n      ')}
    </ol>
  </div>`;
  }

  // Corrective Actions
  if (answer.corrective_actions.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Recommended Actions</h3>
    <ol style="margin:0;padding-left:20px;">
      ${answer.corrective_actions.map(a =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;">${esc(a)}</li>`
      ).join('\n      ')}
    </ol>
  </div>`;
  }

  // Stop / Escalation Conditions
  if (answer.stop_conditions.length > 0) {
    html += `
  <div style="margin:0 0 16px;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Escalation Triggers</h3>
    <ul style="margin:0;padding-left:20px;">
      ${answer.stop_conditions.map(s =>
        `<li style="font-size:13px;color:#78350f;margin:0 0 4px;line-height:1.5;">${esc(s)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Uncertainties
  if (answer.uncertainties.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Uncertainties</h3>
    <ul style="margin:0;padding-left:20px;">
      ${answer.uncertainties.map(u =>
        `<li style="font-size:12px;color:#64748b;margin:0 0 3px;line-height:1.5;">${esc(u)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Verification Criteria (V3)
  if (v2?.verification_criteria && v2.verification_criteria.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Verification Acceptance Criteria</h3>
    <table cellpadding="4" cellspacing="0" style="margin:0;width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;color:#475569;font-size:11px;padding:4px 8px;border-bottom:1px solid #e2e8f0;">Parameter</th>
        <th style="text-align:left;color:#475569;font-size:11px;padding:4px 8px;border-bottom:1px solid #e2e8f0;">Expected</th>
        <th style="text-align:left;color:#475569;font-size:11px;padding:4px 8px;border-bottom:1px solid #e2e8f0;">Tolerance</th>
        <th style="text-align:left;color:#475569;font-size:11px;padding:4px 8px;border-bottom:1px solid #e2e8f0;">Method</th>
      </tr>
      ${v2.verification_criteria.map(vc =>
        `<tr><td style="padding:4px 8px;color:#334155;border-bottom:1px solid #f1f5f9;">${esc(vc.parameter)}</td><td style="padding:4px 8px;color:#334155;border-bottom:1px solid #f1f5f9;">${esc(vc.expected_value)}</td><td style="padding:4px 8px;color:#334155;border-bottom:1px solid #f1f5f9;">${esc(vc.tolerance)}</td><td style="padding:4px 8px;color:#334155;border-bottom:1px solid #f1f5f9;">${esc(vc.method)}</td></tr>`
      ).join('\n      ')}
    </table>
  </div>`;
  }

  // References / Evidence (V2: with source classification)
  if (v2?.sources_with_metadata && v2.sources_with_metadata.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">References</h3>
    <ul style="margin:0;padding-left:20px;">
      ${v2.sources_with_metadata.map(s => {
        const meta = s.source_metadata;
        const tierBadge = meta ? `[Tier ${meta.tier}: ${esc(meta.classification)}]` : `[${esc(s.classification)}]`;
        const title = meta?.title ?? s.source_id;
        const org = meta?.manufacturer_or_org ? ` — ${esc(meta.manufacturer_or_org)}` : '';
        return `<li style="font-size:12px;color:#64748b;margin:0 0 3px;line-height:1.5;"><strong>${esc(title)}</strong>${org} <span style="font-size:10px;color:#94a3b8;">${tierBadge}</span></li>`;
      }).join('\n      ')}
    </ul>
  </div>`;
  } else if (answer.evidence_summary.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">References</h3>
    <ul style="margin:0;padding-left:20px;">
      ${answer.evidence_summary.map(e =>
        `<li style="font-size:12px;color:#64748b;margin:0 0 3px;line-height:1.5;"><strong>${esc(e.source_id)}</strong> (${esc(e.evidence_strength)}) — ${esc(e.excerpt)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Confidence Breakdown (V2)
  if (v2?.confidence_breakdown) {
    const cb = v2.confidence_breakdown;
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Confidence Breakdown</h3>
    <table cellpadding="0" cellspacing="0" style="margin:0;width:100%;">
      <tr><td style="font-size:12px;color:#64748b;padding:2px 0;">Score: <strong>${(cb.final_score * 100).toFixed(0)}%</strong> (${esc(cb.label)})</td></tr>
      ${cb.caps_applied.length > 0 ? `<tr><td style="font-size:11px;color:#94a3b8;padding:2px 0;">Caps: ${cb.caps_applied.map(c => esc(c)).join('; ')}</td></tr>` : ''}
      <tr><td style="font-size:11px;color:#94a3b8;padding:2px 0;">Source authority: ${(cb.factor_scores.source_authority * 100).toFixed(0)}% | Technique: ${(cb.factor_scores.technique_relevance * 100).toFixed(0)}% | Issue: ${(cb.factor_scores.issue_relevance * 100).toFixed(0)}% | Recency: ${(cb.factor_scores.recency * 100).toFixed(0)}% | Evidence: ${(cb.factor_scores.evidence_strength * 100).toFixed(0)}%</td></tr>
    </table>
  </div>`;
  }

  // Missing Information (V2)
  if (v2?.missing_information?.critical_missing?.length) {
    html += `
  <div style="margin:0 0 16px;padding:12px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.5px;">Missing Information</h3>
    <p style="font-size:12px;color:#9a3412;margin:0 0 4px;">Critical fields missing: <strong>${v2.missing_information.critical_missing.map(f => esc(f)).join(', ')}</strong></p>
    ${v2.missing_information.follow_up_questions.length > 0 ? `<ul style="margin:4px 0 0;padding-left:20px;">${v2.missing_information.follow_up_questions.map(q => `<li style="font-size:11px;color:#9a3412;line-height:1.5;">${esc(q)}</li>`).join('')}</ul>` : ''}
  </div>`;
  }

  // Footer
  html += `
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:11px;color:#94a3b8;">
    Generated by LabPulse &mdash; ${dateStr}
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return html;
}

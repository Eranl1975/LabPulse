import type { RankedAnswer } from './types';

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

  // Confidence badge
  const pct = Math.round(answer.confidence * 100);
  const confColor = answer.confidence >= 0.75 ? '#16a34a' : answer.confidence >= 0.50 ? '#d97706' : '#dc2626';
  const confBg = answer.confidence >= 0.75 ? '#f0fdf4' : answer.confidence >= 0.50 ? '#fffbeb' : '#fef2f2';
  const confLabel = answer.confidence >= 0.75 ? 'High' : answer.confidence >= 0.50 ? 'Medium' : 'Low';

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

  // References / Evidence
  if (answer.evidence_summary.length > 0) {
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

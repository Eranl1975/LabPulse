import type { CleaningProcedureContent } from './cleaning-types';

// ── HTML entity escaping ────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Badge config ────────────────────────────────────────────────────────────────

const BADGE: Record<string, { color: string; bg: string; label: string }> = {
  official_manufacturer:      { color: '#16a34a', bg: '#f0fdf4', label: 'Official Manufacturer' },
  manufacturer_documentation: { color: '#d97706', bg: '#fffbeb', label: 'Manufacturer Documentation' },
  ai_generated:               { color: '#64748b', bg: '#f8fafc', label: 'AI-Generated' },
};

// ── Builder ─────────────────────────────────────────────────────────────────────

export function buildCleaningEmailHtml(
  procedure: CleaningProcedureContent,
  options: { message?: string; generatedAt?: string },
): string {
  const badge = BADGE[procedure.source_type] ?? BADGE.ai_generated;
  const dateStr = options.generatedAt
    ? new Date(options.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const sectionStyle = 'margin:0 0 16px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;';
  const sectionTitle = 'margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;';

  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<!-- Header -->
<tr><td style="background:#0a1628;padding:24px 28px;">
  <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#ffffff;">Cleaning Procedure</h1>
  <p style="margin:0;font-size:14px;color:#94a3b8;">${esc(procedure.instrument)}</p>
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

  // Instrument details + badge
  html += `
  <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">`;
  if (procedure.manufacturer !== 'Generic') {
    html += `<tr><td style="font-size:12px;color:#64748b;padding:0 0 2px;">Manufacturer: <strong>${esc(procedure.manufacturer)}</strong></td></tr>`;
  }
  if (procedure.model !== 'General') {
    html += `<tr><td style="font-size:12px;color:#64748b;padding:0 0 2px;">Model: <strong>${esc(procedure.model)}</strong></td></tr>`;
  }
  html += `</table>
  <span style="display:inline-block;padding:3px 10px;background:${badge.bg};color:${badge.color};font-size:11px;font-weight:600;border-radius:12px;">${esc(badge.label)}</span>`;

  // AI disclaimer
  if (procedure.source_type === 'ai_generated') {
    html += `
  <div style="margin:12px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:12px;color:#92400e;line-height:1.5;">
    <strong>AI-Generated Cleaning Procedure</strong> &mdash; Official manufacturer cleaning instructions were not located. Verify this procedure against the manufacturer&rsquo;s documentation before performing maintenance.
  </div>`;
  }

  // Source link
  if (procedure.source_url) {
    html += `
  <p style="margin:8px 0;font-size:12px;color:#475569;">
    ${procedure.source_title ? esc(procedure.source_title) + ' &mdash; ' : ''}
    <a href="${esc(procedure.source_url)}" style="color:#0f9188;text-decoration:underline;">View Source</a>
  </p>`;
  }

  // Confidence
  if (procedure.confidence_note) {
    html += `
  <p style="margin:4px 0 16px;font-size:11px;color:#94a3b8;">
    Confidence: ${Math.round(procedure.confidence * 100)}% &mdash; ${esc(procedure.confidence_note)}
  </p>`;
  }

  // Required Materials
  if (procedure.materials_needed.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Required Materials</h3>
    <ul style="margin:0;padding-left:20px;">
      ${procedure.materials_needed.map(m =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;"><strong>${esc(m.name)}</strong>${m.specification ? ` (${esc(m.specification)})` : ''}${m.purpose ? ` &mdash; ${esc(m.purpose)}` : ''}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Before Cleaning
  if (procedure.before_cleaning.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Before Cleaning</h3>
    <ol style="margin:0;padding-left:20px;">
      ${procedure.before_cleaning.map(step =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;">${esc(step)}</li>`
      ).join('\n      ')}
    </ol>
  </div>`;
  }

  // Cleaning Steps
  if (procedure.cleaning_steps.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Cleaning Steps</h3>
    ${procedure.cleaning_steps.map(step => `
    <div style="margin:0 0 12px;padding:0 0 10px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 2px;">
        <strong style="font-size:13px;color:#0a1628;">${step.step_number}. ${esc(step.title)}</strong>
        ${step.duration ? `<span style="font-size:11px;color:#0f9188;margin-left:6px;">${esc(step.duration)}</span>` : ''}
      </p>
      <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">${esc(step.description)}</p>
      ${(step.warnings ?? []).map(w =>
        `<p style="margin:4px 0 0;font-size:11px;color:#b91c1c;background:#fef2f2;padding:4px 8px;border-radius:4px;">${esc(w)}</p>`
      ).join('\n      ')}
    </div>`).join('')}
  </div>`;
  }

  // After Cleaning
  if (procedure.after_cleaning.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">After Cleaning</h3>
    <ol style="margin:0;padding-left:20px;">
      ${procedure.after_cleaning.map(step =>
        `<li style="font-size:13px;color:#334155;margin:0 0 4px;line-height:1.5;">${esc(step)}</li>`
      ).join('\n      ')}
    </ol>
  </div>`;
  }

  // What You Must Not Do
  if (procedure.what_not_to_do.length > 0) {
    html += `
  <div style="margin:0 0 16px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">What You Must Not Do</h3>
    <ul style="margin:0;padding-left:20px;">
      ${procedure.what_not_to_do.map(item =>
        `<li style="font-size:13px;color:#991b1b;font-weight:600;margin:0 0 4px;line-height:1.5;">${esc(item)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Cleaning Frequency
  if (procedure.cleaning_frequency) {
    const freq = procedure.cleaning_frequency;
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Cleaning Frequency</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;vertical-align:top;width:33%;">
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Routine</p>
        <p style="margin:0;font-size:12px;color:#1e293b;">${esc(freq.routine)}</p>
      </td>
      <td width="8"></td>
      <td style="padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;vertical-align:top;width:33%;">
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">After Contamination</p>
        <p style="margin:0;font-size:12px;color:#1e293b;">${esc(freq.after_contamination)}</p>
      </td>
      <td width="8"></td>
      <td style="padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;vertical-align:top;width:33%;">
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Preventive</p>
        <p style="margin:0;font-size:12px;color:#1e293b;">${esc(freq.preventive)}</p>
      </td>
    </tr>
    </table>
  </div>`;
  }

  // Safety Warnings
  if (procedure.safety_warnings.length > 0) {
    html += `
  <div style="margin:0 0 16px;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Safety Warnings</h3>
    <ul style="margin:0;padding-left:20px;">
      ${procedure.safety_warnings.map(w =>
        `<li style="font-size:13px;color:#78350f;margin:0 0 4px;line-height:1.5;">${esc(w)}</li>`
      ).join('\n      ')}
    </ul>
  </div>`;
  }

  // Notes
  if (procedure.notes.length > 0) {
    html += `
  <div style="${sectionStyle}">
    <h3 style="${sectionTitle}">Notes</h3>
    <ul style="margin:0;padding-left:20px;">
      ${procedure.notes.map(n =>
        `<li style="font-size:12px;color:#64748b;margin:0 0 3px;line-height:1.5;">${esc(n)}</li>`
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
    Generated by LabPulse${dateStr ? ` &mdash; ${dateStr}` : ''}
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return html;
}

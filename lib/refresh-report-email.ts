// Sends the monthly refresh summary to the admin address.
// Never throws: a failed report email must not fail the refresh run itself.

import { createLogger } from './logger';

const log = createLogger('refresh-report-email');

export type ReportEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Strip CR/LF so a subject line cannot inject extra headers. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

export async function sendRefreshReport(
  subject: string,
  summary: string,
): Promise<ReportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REFRESH_REPORT_EMAIL;

  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };
  if (!to) return { sent: false, reason: 'REFRESH_REPORT_EMAIL not configured' };

  const html = `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.55">
  <h2 style="margin:0 0 12px">LabPulse documentation refresh</h2>
  <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:0">${esc(summary)}</pre>
</div>`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'LabPulse <onboarding@resend.dev>',
      to,
      subject: sanitizeHeaderValue(subject).slice(0, 200),
      html,
      text: summary,
    });

    return { sent: true };
  } catch (err) {
    log.warn('send', 'refresh report email failed', { error: String(err) });
    return { sent: false, reason: String(err) };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import type { RankedAnswer } from '@/lib/types';
import { buildTroubleshootingEmailHtml } from '@/lib/troubleshooting-email-html';
import type { TroubleshootingEmailOptions } from '@/lib/troubleshooting-email-html';

export const maxDuration = 30;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LEN = 200;
const MAX_MESSAGE_LEN = 2000;
const RATE_LIMIT = 5;
const RATE_WINDOW = 3_600_000; // 1 hour

/** Strip characters that could enable email header injection. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to use LabPulse.' },
      { status: 401 },
    );
  }

  // ── Rate limit ────────────────────────────────────────────────────────────────
  if (!checkRateLimit(`email:${user.id}`, RATE_LIMIT, RATE_WINDOW)) {
    return NextResponse.json(
      { error: 'Too many emails sent. Please wait before sending another.' },
      { status: 429 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { to, subject, message, answer, technique, vendor, model, issueCategory } = body as {
    to?: string;
    subject?: string;
    message?: string;
    answer?: RankedAnswer;
    technique?: string;
    vendor?: string;
    model?: string;
    issueCategory?: string;
  };

  // ── Validate inputs ───────────────────────────────────────────────────────────
  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 });
  }
  const cleanTo = to.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanTo) || /[,\r\n]/.test(cleanTo)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  if (!answer || typeof answer !== 'object') {
    return NextResponse.json({ error: 'Troubleshooting answer data is missing or invalid.' }, { status: 400 });
  }

  if (!technique || typeof technique !== 'string') {
    return NextResponse.json({ error: 'Technique is required.' }, { status: 400 });
  }

  const instrumentLabel = [technique, vendor, model].filter(Boolean).join(' — ');

  const cleanSubject = sanitizeHeaderValue(
    typeof subject === 'string' && subject.trim()
      ? subject.trim().slice(0, MAX_SUBJECT_LEN)
      : `LabPulse Troubleshooting – ${instrumentLabel}`,
  );

  const cleanMessage = typeof message === 'string'
    ? message.trim().slice(0, MAX_MESSAGE_LEN)
    : undefined;

  // ── Check for Resend API key ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: 'Email service is not configured. Please set RESEND_API_KEY.' },
      { status: 503 },
    );
  }

  // ── Build HTML body ───────────────────────────────────────────────────────────
  const emailOptions: TroubleshootingEmailOptions = {
    technique,
    vendor: vendor || null,
    model: model || null,
    issueCategory: issueCategory || null,
    symptomDescription: answer.problem_summary,
    message: cleanMessage,
    date: new Date().toISOString(),
  };

  const htmlBody = buildTroubleshootingEmailHtml(answer, emailOptions);

  // ── Send via Resend ───────────────────────────────────────────────────────────
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'LabPulse <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to: [cleanTo],
      subject: cleanSubject,
      html: htmlBody,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[troubleshooting-email] Send failed:', err);
    const errMsg = err instanceof Error ? err.message : 'Failed to send email.';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

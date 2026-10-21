import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { generateTroubleshootingPdf } from '@/lib/troubleshooting-pdf';
import type { RankedAnswerV2 } from '@/lib/types';
import { isResponseFormat } from '@/lib/quick-summary';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { answer: RankedAnswerV2; ranked_answer?: RankedAnswerV2; technique: string; vendor?: string; model?: string; issueCategory?: string; format?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  // Older clients sent the answer as `ranked_answer`.
  body.answer = body.answer ?? body.ranked_answer!;

  if (!body.answer || !body.technique) {
    return NextResponse.json({ error: 'answer and technique are required' }, { status: 400 });
  }

  try {
    const buffer = await generateTroubleshootingPdf(body.answer, {
      technique: body.technique,
      vendor: body.vendor,
      model: body.model,
      issueCategory: body.issueCategory,
      // Anything but an explicit 'summary' keeps the detailed PDF (older clients send none).
      format: isResponseFormat(body.format) ? body.format : 'detailed',
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="labpulse-${body.format === 'summary' ? 'summary' : 'report'}-${body.technique}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'PDF generation failed', detail: String(err) }, { status: 500 });
  }
}

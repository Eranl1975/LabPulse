import { NextRequest, NextResponse } from 'next/server';
import { readItems, writeItems } from '@/lib/store';
import type { KnowledgeItem } from '@/lib/types';

// GET /api/knowledge — list all items
export async function GET() {
  const items = readItems();
  return NextResponse.json(items);
}

// POST /api/knowledge — add a single new item
export async function POST(req: NextRequest) {
  let body: Partial<KnowledgeItem>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.technique || !body.symptom) {
    return NextResponse.json({ error: 'technique and symptom are required' }, { status: 400 });
  }

  const newItem: KnowledgeItem = {
    id: `item-${Date.now()}`,
    technique: body.technique,
    instrument_family: body.instrument_family ?? 'generic',
    model: body.model ?? null,
    issue_category: body.issue_category ?? null,
    symptom: body.symptom,
    likely_causes: body.likely_causes ?? [],
    diagnostics: body.diagnostics ?? [],
    corrective_actions: body.corrective_actions ?? [],
    severity: body.severity ?? 'medium',
    escalation_conditions: body.escalation_conditions ?? [],
    source_id: body.source_id ?? 'manual',
    confidence_score: body.confidence_score ?? 0.7,
    evidence_strength: body.evidence_strength ?? 'moderate',
    updated_at: new Date().toISOString(),
  };

  const items = readItems();
  items.push(newItem);
  writeItems(items);

  return NextResponse.json(newItem, { status: 201 });
}

// PUT /api/knowledge — bulk replace entire knowledge base
export async function PUT(req: NextRequest) {
  let items: KnowledgeItem[];
  try {
    items = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Body must be an array of knowledge items' }, { status: 400 });
  }

  writeItems(items);
  return NextResponse.json({ ok: true, count: items.length });
}

// PATCH /api/knowledge?id=xxx — update a single item
export async function PATCH(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  let patch: Partial<KnowledgeItem>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const items = readItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  items[idx] = { ...items[idx], ...patch, id, updated_at: new Date().toISOString() };
  writeItems(items);

  return NextResponse.json(items[idx]);
}

// DELETE /api/knowledge?id=xxx — remove a single item
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const items = readItems();
  const filtered = items.filter(i => i.id !== id);

  if (filtered.length === items.length) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  writeItems(filtered);
  return NextResponse.json({ ok: true });
}

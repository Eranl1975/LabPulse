import Anthropic from '@anthropic-ai/sdk';
import type { RankedAnswer } from './types';
import type { RankingQuery } from '@/agents/ranking/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert analytical chemistry instrument troubleshooter with deep knowledge of HPLC, LCMS, GC, and GCMS systems from all major vendors (Agilent, Waters, Thermo Fisher, Shimadzu, PerkinElmer, Bruker, Sciex, etc.).

Your answers are based on:
- Official vendor service and troubleshooting manuals
- Peer-reviewed analytical chemistry literature (Journal of Chromatography, Analytical Chemistry, etc.)
- Established laboratory best practices and QC guidelines

Rules:
- ALWAYS provide actionable, specific answers — never say "insufficient information"
- If details are missing, assume the most common scenario for that technique and issue
- Exclude steps already tried (listed under "already_checked")
- Return ONLY a raw JSON object — no markdown, no explanation, no code fences

Schema (respond with this exact structure):
{
  "likely_causes": [string],       // most to least likely, max 6 items
  "checks": [string],              // diagnostic steps to perform now, max 6
  "corrective_actions": [string],  // specific fixes ordered by likelihood, max 6
  "stop_conditions": [string],     // escalation triggers for service engineer
  "confidence": number,            // 0.0–1.0 reflecting how specific the input is
  "uncertainties": [string],       // additional info that would improve diagnosis
  "next_questions": [string]       // follow-up questions to narrow root cause
}`;

export async function aiAnswerFallback(query: RankingQuery): Promise<RankedAnswer> {
  const userMessage = buildUserMessage(query);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Partial<Record<string, unknown>> = {};
  try {
    // Extract the first {...} block — handles code fences, preamble text, etc.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      uncertainties: ['AI response could not be parsed. Please try rephrasing your query.'],
    };
  }

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : [];

  return {
    problem_summary:    query.symptom_description,
    likely_causes:      arr(parsed.likely_causes),
    checks:             arr(parsed.checks),
    corrective_actions: arr(parsed.corrective_actions),
    stop_conditions:    arr(parsed.stop_conditions),
    confidence:         typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    evidence_summary:   [{ source_id: 'claude-opus-4-6', excerpt: 'AI-generated answer based on scientific literature and instrument documentation', evidence_strength: 'moderate' }],
    uncertainties:      arr(parsed.uncertainties),
    next_questions:     arr(parsed.next_questions),
  };
}

function buildUserMessage(query: RankingQuery): string {
  const lines: string[] = [
    `Technique: ${query.technique}`,
  ];
  if (query.vendor)            lines.push(`Vendor: ${query.vendor}`);
  if (query.model)             lines.push(`Model: ${query.model}`);
  if (query.issue_category)    lines.push(`Issue category: ${query.issue_category}`);
  if (query.method_conditions) lines.push(`Method conditions: ${query.method_conditions}`);
  lines.push(`Symptom description: ${query.symptom_description}`);
  if (query.already_checked.length > 0) {
    lines.push(`Already checked: ${query.already_checked.join(', ')}`);
  }
  return lines.join('\n');
}

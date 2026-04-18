import Anthropic from '@anthropic-ai/sdk';
import type { RankedAnswer } from './types';
import type { RankingQuery } from '@/agents/ranking/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert analytical chemistry instrument troubleshooter with deep knowledge of HPLC, LCMS, GC, and GCMS systems from all major vendors (Agilent, Waters, Thermo Fisher, Shimadzu, PerkinElmer, Bruker, etc.).

When given an instrument problem, respond ONLY with a valid JSON object matching this exact schema:
{
  "likely_causes": string[],           // ordered from most to least likely, max 6
  "checks": string[],                  // diagnostic steps to run, max 6
  "corrective_actions": string[],      // specific fixes to attempt, max 6
  "stop_conditions": string[],         // when to escalate to service engineer
  "confidence": number,                // 0–1 based on how specific the description is
  "uncertainties": string[],           // what info is missing that would help
  "next_questions": string[]           // follow-up questions to narrow diagnosis
}

Base your answer on instrument manufacturer documentation, peer-reviewed analytical chemistry literature, and established troubleshooting practice. Be specific and actionable.`;

export async function aiAnswerFallback(query: RankingQuery): Promise<RankedAnswer> {
  const userMessage = buildUserMessage(query);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
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

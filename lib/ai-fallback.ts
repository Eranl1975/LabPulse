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

  let parsed: Partial<RankedAnswer> = {};
  try {
    // Strip markdown code fences if present
    const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(json);
  } catch {
    // Fallback if Claude returned unexpected format
    parsed = {
      uncertainties: ['AI response could not be parsed. Please try rephrasing your query.'],
    };
  }

  return {
    problem_summary:    query.symptom_description,
    likely_causes:      parsed.likely_causes      ?? [],
    checks:             parsed.checks             ?? [],
    corrective_actions: parsed.corrective_actions ?? [],
    stop_conditions:    parsed.stop_conditions    ?? [],
    confidence:         parsed.confidence         ?? 0.5,
    evidence_summary:   [{ source_id: 'claude-opus-4-6', excerpt: 'AI-generated answer based on scientific literature and instrument documentation', evidence_strength: 'moderate' }],
    uncertainties:      parsed.uncertainties      ?? [],
    next_questions:     parsed.next_questions     ?? [],
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

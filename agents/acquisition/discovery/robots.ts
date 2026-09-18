// Minimal robots.txt parser: enough to honour Disallow/Allow for our own user-agent.
// Rule: if robots.txt cannot be read, we treat the host as disallowed rather than
// assuming permission (no silent fallback, per docs/coding-rules.md).

export interface RobotsRules {
  /** Path prefixes that must not be fetched. */
  disallow: string[];
  /** Path prefixes explicitly permitted (override a matching Disallow). */
  allow: string[];
  /** Crawl-delay in milliseconds, when the host specifies one. */
  crawlDelayMs: number | null;
}

export const ALLOW_ALL: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null };
export const DENY_ALL: RobotsRules = { disallow: ['/'], allow: [], crawlDelayMs: null };

/**
 * Parse robots.txt, collecting the rules that apply to `userAgentToken`
 * (falling back to the `*` group when the bot is not named explicitly).
 */
export function parseRobots(body: string, userAgentToken: string): RobotsRules {
  const token = userAgentToken.toLowerCase();

  const groups = new Map<string, RobotsRules>();
  let activeAgents: string[] = [];
  let lastLineWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const sep = line.indexOf(':');
    if (sep === -1) continue;

    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!lastLineWasAgent) activeAgents = [];
      activeAgents.push(value.toLowerCase());
      for (const a of activeAgents) {
        if (!groups.has(a)) groups.set(a, { disallow: [], allow: [], crawlDelayMs: null });
      }
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (activeAgents.length === 0) continue;

    for (const agent of activeAgents) {
      const rules = groups.get(agent);
      if (!rules) continue;

      if (field === 'disallow') {
        // "Disallow:" with an empty value means allow everything.
        if (value) rules.disallow.push(value);
      } else if (field === 'allow') {
        if (value) rules.allow.push(value);
      } else if (field === 'crawl-delay') {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) rules.crawlDelayMs = seconds * 1000;
      }
    }
  }

  // Prefer a group naming our bot; otherwise use the wildcard group.
  const named = [...groups.entries()].find(([agent]) => token.includes(agent) && agent !== '*');
  if (named) return named[1];
  return groups.get('*') ?? ALLOW_ALL;
}

/**
 * True when `pathname` may be fetched under these rules.
 * Longest matching rule wins; Allow beats Disallow at equal length (standard behaviour).
 */
export function isPathAllowed(pathname: string, rules: RobotsRules): boolean {
  const longest = (patterns: string[]): number => {
    let best = -1;
    for (const p of patterns) {
      if (matchesPattern(pathname, p) && p.length > best) best = p.length;
    }
    return best;
  };

  const disallowed = longest(rules.disallow);
  if (disallowed === -1) return true;

  const allowed = longest(rules.allow);
  return allowed >= disallowed;
}

/** Supports the `*` wildcard and the `$` end-anchor used in robots.txt paths. */
function matchesPattern(pathname: string, pattern: string): boolean {
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return pathname.startsWith(pattern);
  }
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(pathname);
}

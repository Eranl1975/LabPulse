import { describe, it, expect } from 'vitest';
import { parseRobots, isPathAllowed } from '@/agents/acquisition/discovery/robots';
import { USER_AGENT } from '@/agents/acquisition/config/vendor-sites';
import { ROBOTS_ALLOW_ALL, ROBOTS_DENY_SUPPORT } from './fixtures/vendor-pages';

describe('parseRobots', () => {
  it('reads the wildcard group when the bot is not named', () => {
    const rules = parseRobots(ROBOTS_ALLOW_ALL, USER_AGENT);
    expect(rules.disallow).toContain('/private/');
    expect(rules.crawlDelayMs).toBe(0);
  });

  it('prefers a group naming our bot over the wildcard group', () => {
    const body = `User-agent: *
Disallow: /

User-agent: LabPulseDocBot
Disallow: /internal/
`;
    const rules = parseRobots(body, USER_AGENT);
    expect(rules.disallow).toEqual(['/internal/']);
    expect(isPathAllowed('/en/support/guide', rules)).toBe(true);
  });

  it('treats consecutive user-agent lines as one group', () => {
    const body = `User-agent: BotA
User-agent: LabPulseDocBot
Disallow: /blocked/
`;
    const rules = parseRobots(body, USER_AGENT);
    expect(isPathAllowed('/blocked/x', rules)).toBe(false);
  });

  it('ignores comments and blank lines', () => {
    const rules = parseRobots('# comment\n\nUser-agent: *\nDisallow: /x/ # trailing\n', USER_AGENT);
    expect(isPathAllowed('/x/y', rules)).toBe(false);
  });

  it('treats an empty Disallow as permission to crawl everything', () => {
    const rules = parseRobots('User-agent: *\nDisallow:\n', USER_AGENT);
    expect(isPathAllowed('/anything', rules)).toBe(true);
  });
});

describe('isPathAllowed', () => {
  const rules = parseRobots(ROBOTS_DENY_SUPPORT, USER_AGENT);

  it('blocks a disallowed prefix', () => {
    expect(isPathAllowed('/support/internal', rules)).toBe(false);
  });

  it('lets a longer Allow override a shorter Disallow', () => {
    expect(isPathAllowed('/support/public/guide.pdf', rules)).toBe(true);
  });

  it('allows unrelated paths', () => {
    expect(isPathAllowed('/library/manual.pdf', rules)).toBe(true);
  });

  it('honours the * wildcard and $ anchor', () => {
    const wild = parseRobots('User-agent: *\nDisallow: /*.pdf$\n', USER_AGENT);
    expect(isPathAllowed('/docs/manual.pdf', wild)).toBe(false);
    expect(isPathAllowed('/docs/manual.pdf?v=2', wild)).toBe(true);
    expect(isPathAllowed('/docs/manual.html', wild)).toBe(true);
  });
});

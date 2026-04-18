import { describe, it, expect } from 'vitest';
import { detectIssueCategory } from '@/agents/ranking/issue-detector';

describe('detectIssueCategory', () => {
  it('detects retention time shift', () => {
    expect(detectIssueCategory('retention time shifted 2 minutes earlier than expected'))
      .toBe('retention time shift');
  });

  it('detects peak tailing', () => {
    expect(detectIssueCategory('peak is tailing badly on the column'))
      .toBe('peak tailing');
  });

  it('detects noisy baseline', () => {
    expect(detectIssueCategory('we are seeing noisy baseline and baseline drift'))
      .toBe('noisy baseline');
  });

  it('detects high backpressure', () => {
    expect(detectIssueCategory('system shows high pressure alert, column may be clogged'))
      .toBe('high backpressure');
  });

  it('detects carryover', () => {
    expect(detectIssueCategory('carryover observed between samples in blank injections'))
      .toBe('carryover');
  });

  it('detects GC ghost peaks', () => {
    expect(detectIssueCategory('ghost peak appearing in blank injection runs'))
      .toBe('GC ghost peaks');
  });

  it('returns null when no keywords match', () => {
    expect(detectIssueCategory('the weather is nice today')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectIssueCategory('')).toBeNull();
  });
});

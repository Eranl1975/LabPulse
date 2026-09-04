import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM APIs before importing
const mockClick = vi.fn();
let capturedContent = '';
let capturedFilename = '';

vi.stubGlobal('Blob', class MockBlob {
  parts: string[];
  constructor(parts: string[]) {
    this.parts = parts;
    capturedContent = parts.join('');
  }
});

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
});

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({
    click: mockClick,
    href: '',
    set download(val: string) { capturedFilename = val; },
    get download() { return capturedFilename; },
  })),
});

import { exportAsText, exportAsCSV } from '@/lib/export';
import type { RankedAnswer } from '@/lib/types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';

const answer: RankedAnswer = {
  problem_summary: 'Test problem',
  likely_causes: ['Cause 1', 'Cause 2'],
  checks: ['Check 1'],
  corrective_actions: ['Action 1'],
  stop_conditions: ['Stop if X'],
  confidence: 0.85,
  evidence_summary: [{ source_id: 'test-src', excerpt: 'Test excerpt', evidence_strength: 'strong' }],
  uncertainties: ['Uncertainty 1'],
  next_questions: ['Question 1'],
};

const modes = {
  concise: { text: 'Concise view text' } as TextOutput,
  standard: { text: 'Standard view text' } as TextOutput,
  deep: { text: 'Deep view text' } as TextOutput,
  manager: {
    issue_summary: 'Issue summary',
    urgency: 'medium' as const,
    data_quality_risk: 'low',
    recommended_action: 'Do X',
  } as ManagerOutput,
};

describe('exportAsText', () => {
  beforeEach(() => {
    mockClick.mockClear();
    capturedContent = '';
    capturedFilename = '';
  });

  it('triggers download', () => {
    exportAsText(answer, modes, 'HPLC');
    expect(mockClick).toHaveBeenCalled();
  });

  it('includes technique in filename', () => {
    exportAsText(answer, modes, 'LCMS');
    expect(capturedFilename).toContain('LCMS');
  });

  it('includes confidence percentage', () => {
    exportAsText(answer, modes, 'HPLC');
    expect(capturedContent).toContain('85%');
  });

  it('includes standard and deep views', () => {
    exportAsText(answer, modes, 'HPLC');
    expect(capturedContent).toContain('Standard view text');
    expect(capturedContent).toContain('Deep view text');
  });

  it('includes manager summary', () => {
    exportAsText(answer, modes, 'HPLC');
    expect(capturedContent).toContain('Issue summary');
    expect(capturedContent).toContain('medium');
  });
});

describe('exportAsCSV', () => {
  beforeEach(() => {
    mockClick.mockClear();
    capturedContent = '';
    capturedFilename = '';
  });

  it('triggers download', () => {
    exportAsCSV(answer, 'GC');
    expect(mockClick).toHaveBeenCalled();
  });

  it('includes technique in filename', () => {
    exportAsCSV(answer, 'GC');
    expect(capturedFilename).toContain('GC');
  });

  it('includes header row', () => {
    exportAsCSV(answer, 'HPLC');
    expect(capturedContent).toContain('"Field","Value"');
  });

  it('includes causes', () => {
    exportAsCSV(answer, 'HPLC');
    expect(capturedContent).toContain('Cause 1');
    expect(capturedContent).toContain('Cause 2');
  });

  it('escapes double quotes in CSV', () => {
    const answerWithQuotes = {
      ...answer,
      likely_causes: ['Cause with "quotes"'],
    };
    exportAsCSV(answerWithQuotes, 'HPLC');
    expect(capturedContent).toContain('""quotes""');
  });
});

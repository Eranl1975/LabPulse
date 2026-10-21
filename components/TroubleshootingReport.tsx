'use client';

// One finished report: the Quick Summary / Detailed Analysis switch, the
// existing detail-level tabs (Detailed only) and the report itself. Used by the
// live result on /ask and by saved reports on /reports, so both look the same.

import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';
import type { RankedAnswerV2 } from '@/lib/types';
import type { ResponseFormat } from '@/lib/quick-summary';
import ModeSwitcher, { type DisplayMode } from './ModeSwitcher';
import AnswerDisplay from './AnswerDisplay';
import { ResponseFormatTabs } from './ResponseFormat';

export interface ReportModes {
  concise: TextOutput;
  standard: TextOutput;
  deep: TextOutput;
  manager: ManagerOutput;
}

interface Props {
  modes: ReportModes;
  confidence: number;
  /** Undefined for a legacy V1 answer, which has no structured fields to summarise. */
  rankedAnswer?: RankedAnswerV2;
  format: ResponseFormat;
  onFormatChange: (f: ResponseFormat) => void;
  mode: DisplayMode;
  onModeChange: (m: DisplayMode) => void;
  technique?: string;
  vendor?: string;
  model?: string;
  issueCategory?: string;
}

export default function TroubleshootingReport({
  modes, confidence, rankedAnswer, format, onFormatChange, mode, onModeChange,
  technique, vendor, model, issueCategory,
}: Props) {
  const effective: ResponseFormat = rankedAnswer ? format : 'detailed';
  return (
    <>
      {rankedAnswer && <ResponseFormatTabs value={effective} onChange={onFormatChange} />}
      {effective === 'detailed' && <ModeSwitcher selected={mode} onChange={onModeChange} />}
      <AnswerDisplay
        modes={modes}
        confidence={confidence}
        selected={mode}
        rankedAnswer={rankedAnswer}
        technique={technique}
        vendor={vendor}
        model={model}
        issueCategory={issueCategory}
        format={effective}
        onShowDetailed={() => onFormatChange('detailed')}
      />
    </>
  );
}

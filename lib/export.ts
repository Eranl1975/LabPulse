import type { RankedAnswer } from './types';
import type { TextOutput, ManagerOutput } from '@/agents/presentation/types';

/** Export troubleshooting results as a downloadable text file */
export function exportAsText(
  answer: RankedAnswer,
  modes: { concise: TextOutput; standard: TextOutput; deep: TextOutput; manager: ManagerOutput },
  technique: string,
): void {
  const lines = [
    `LabPulse Troubleshooting Report`,
    `Generated: ${new Date().toISOString()}`,
    `Technique: ${technique}`,
    `Confidence: ${Math.round(answer.confidence * 100)}%`,
    ``,
    `═══════════════════════════════════════`,
    `STANDARD VIEW`,
    `═══════════════════════════════════════`,
    modes.standard.text,
    ``,
    `═══════════════════════════════════════`,
    `DETAILED VIEW`,
    `═══════════════════════════════════════`,
    modes.deep.text,
    ``,
    `═══════════════════════════════════════`,
    `MANAGER SUMMARY`,
    `═══════════════════════════════════════`,
    `Issue: ${modes.manager.issue_summary}`,
    `Urgency: ${modes.manager.urgency}`,
    `Data Quality Risk: ${modes.manager.data_quality_risk}`,
    `Recommended Action: ${modes.manager.recommended_action}`,
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `labpulse-report-${technique}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export as CSV for LIMS integration */
export function exportAsCSV(answer: RankedAnswer, technique: string): void {
  const rows = [
    ['Field', 'Value'],
    ['Technique', technique],
    ['Problem', answer.problem_summary],
    ['Confidence', String(Math.round(answer.confidence * 100)) + '%'],
    ...answer.likely_causes.map((c, i) => [`Cause ${i + 1}`, c]),
    ...answer.checks.map((c, i) => [`Check ${i + 1}`, c]),
    ...answer.corrective_actions.map((a, i) => [`Action ${i + 1}`, a]),
    ...answer.stop_conditions.map((s, i) => [`Escalation ${i + 1}`, s]),
  ];

  const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `labpulse-${technique}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

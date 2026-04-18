import type { RankedAnswer } from '@/lib/types';
import type { PresentationMode, FormattedOutput } from './types';
import { formatConcise }  from './formatters/concise';
import { formatStandard } from './formatters/standard';
import { formatDeep }     from './formatters/deep';
import { formatManager }  from './formatters/manager';
import { formatJsonApi }  from './formatters/json-api';

export function present(answer: RankedAnswer, mode: PresentationMode): FormattedOutput {
  switch (mode) {
    case 'concise':  return formatConcise(answer);
    case 'standard': return formatStandard(answer);
    case 'deep':     return formatDeep(answer);
    case 'manager':  return formatManager(answer);
    case 'json':     return formatJsonApi(answer);
  }
}

export { formatConcise, formatStandard, formatDeep, formatManager, formatJsonApi };
export type { PresentationMode, FormattedOutput } from './types';

/**
 * Structured JSON logger — no external dependencies.
 * Usage: const log = createLogger('module-name');
 *        log.info('action', 'message', { key: 'value' });
 */

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') console.error(line);
  else if (entry.level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(module: string) {
  return {
    info(action: string, message: string, ctx?: Record<string, unknown>) {
      emit({ level: 'info', module, action, message, timestamp: new Date().toISOString(), ...ctx });
    },
    warn(action: string, message: string, ctx?: Record<string, unknown>) {
      emit({ level: 'warn', module, action, message, timestamp: new Date().toISOString(), ...ctx });
    },
    error(action: string, message: string, ctx?: Record<string, unknown>) {
      emit({ level: 'error', module, action, message, timestamp: new Date().toISOString(), ...ctx });
    },
  };
}

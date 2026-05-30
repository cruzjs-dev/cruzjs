import { existsSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

let logFile: string | null = null;
let logEnabled = true;

export function initLogger(rootDir: string): void {
  const logsDir = resolve(rootDir, '.deploy-logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  logFile = resolve(logsDir, `deploy-${timestamp}.log`);
  
  writeFileSync(logFile, `Deploy CLI Log - ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`);
}

export function log(level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  if (!logEnabled || !logFile) return;
  
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level}] ${message}`;
  
  if (data !== undefined) {
    try {
      if (data instanceof Error) {
        line += `\n  Error: ${data.message}`;
        if (data.stack) {
          line += `\n  Stack: ${data.stack}`;
        }
      } else if (typeof data === 'object') {
        line += `\n  Data: ${JSON.stringify(data, null, 2).split('\n').join('\n  ')}`;
      } else {
        line += `\n  Data: ${data}`;
      }
    } catch {
      line += `\n  Data: [unable to serialize]`;
    }
  }
  
  line += '\n';
  
  try {
    appendFileSync(logFile, line);
  } catch {
    // Can't write to log file
  }
}

export function logInfo(message: string, data?: unknown): void {
  log('INFO', message, data);
}

export function logDebug(message: string, data?: unknown): void {
  log('DEBUG', message, data);
}

export function logWarn(message: string, data?: unknown): void {
  log('WARN', message, data);
}

export function logError(message: string, data?: unknown): void {
  log('ERROR', message, data);
}

export function getLogFile(): string | null {
  return logFile;
}


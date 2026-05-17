import { app } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DESKTOP_ENTRY } from '../shared/desktopEntry.js';

type DiagnosticDetails = Record<string, string | number | boolean | null | undefined>;

const WINDOWS_PATH_PATTERN = /[A-Za-z]:\\[^\s"'<>]+/g;
const POSIX_PATH_PATTERN = /\/(?:Users|home|tmp|var|private|Volumes)\/[^\s"'<>]+/g;
const SECRET_PATTERN = /(sk-[A-Za-z0-9_-]{8,}|nxa_[A-Za-z0-9_-]{8,}|nxk_[A-Za-z0-9._-]{8,}|Bearer\s+[A-Za-z0-9._-]+)/g;

function redactDiagnosticText(value: string): string {
  return value
    .replace(SECRET_PATTERN, '[redacted-secret]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted-path]')
    .replace(POSIX_PATH_PATTERN, '[redacted-path]');
}

function normalizeDetails(details: DiagnosticDetails = {}): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (value === undefined) {
        return [key, null];
      }
      if (typeof value === 'string') {
        return [key, redactDiagnosticText(value)];
      }
      return [key, value];
    }),
  );
}

function getLogPath(fileName: string): string {
  const logDir = join(app.getPath('userData'), DESKTOP_ENTRY.diagnostics.logDirName);
  mkdirSync(logDir, { recursive: true });
  return join(logDir, fileName);
}

export function recordDesktopDiagnostic(event: string, details: DiagnosticDetails = {}): void {
  try {
    const entry = {
      at: new Date().toISOString(),
      app: DESKTOP_ENTRY.appName,
      event,
      details: normalizeDetails(details),
    };
    appendFileSync(getLogPath(DESKTOP_ENTRY.diagnostics.startupLogFileName), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // Diagnostics must never block app startup.
  }
}

export function installDesktopDiagnostics(): void {
  process.on('uncaughtException', (error) => {
    recordDesktopDiagnostic('process.uncaughtException', {
      name: error.name,
      message: error.message,
    });
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    recordDesktopDiagnostic('process.unhandledRejection', { message });
  });

  app.on('render-process-gone', (_event, _webContents, details) => {
    recordDesktopDiagnostic('app.render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  app.on('child-process-gone', (_event, details) => {
    recordDesktopDiagnostic('app.child-process-gone', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });
}

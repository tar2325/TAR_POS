import { ErrorHandler, Injectable } from '@angular/core';

export const CHUNK_RELOAD_KEY = 'pos_chunk_reload_ts';
export const CHUNK_RELOAD_INTERVAL_MS = 15000;

/**
 * Checks whether an error is caused by a stale or missing lazy chunk
 * (common after new deployments when chunk hashes change).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = (
    typeof error === 'string'
      ? error
      : (error as { message?: string })?.message ||
        (error as { reason?: { message?: string } })?.reason?.message ||
        String(error)
  ).toLowerCase();

  const chunkErrorPatterns = [
    'failed to fetch dynamically imported module',
    'loading chunk',
    'mime type of "text/html"',
    'expected a javascript-or-wasm module script',
    'error loading dynamically imported module',
    'importing a module script failed',
  ];

  return chunkErrorPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Triggers a page reload to fetch the latest index.html and bundle chunks,
 * throttling to avoid infinite reload loops.
 */
export function triggerChunkReload(win: Window = window): boolean {
  try {
    const lastReload = win.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > CHUNK_RELOAD_INTERVAL_MS) {
      win.sessionStorage.setItem(CHUNK_RELOAD_KEY, now.toString());
      win.location.reload();
      return true;
    }
  } catch (e) {
    console.error('Failed to access sessionStorage for chunk reload', e);
  }
  return false;
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isChunkLoadError(error)) {
      const reloaded = triggerChunkReload();
      if (reloaded) {
        console.warn(
          '[Auto-Recovery] New version deployed or chunk mismatch detected. Reloading page...',
        );
        return;
      }
    }
    console.error('[GlobalErrorHandler]', error);
  }
}

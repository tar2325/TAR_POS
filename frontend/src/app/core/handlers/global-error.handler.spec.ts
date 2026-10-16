import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GlobalErrorHandler,
  isChunkLoadError,
  triggerChunkReload,
  CHUNK_RELOAD_KEY,
} from './global-error.handler';

describe('GlobalErrorHandler & Chunk Auto-Recovery', () => {
  describe('isChunkLoadError', () => {
    it('should detect dynamic import failure', () => {
      const err = new TypeError(
        'Failed to fetch dynamically imported module: https://tar-pos-frontend.onrender.com/chunk-DHLpFKXp.js',
      );
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('should detect MIME type HTML error for module script', () => {
      const msg =
        'Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".';
      expect(isChunkLoadError(msg)).toBe(true);
    });

    it('should detect traditional webpack chunk load error', () => {
      const err = new Error('Loading chunk 42 failed.');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('should detect error nested in reason object', () => {
      const rejection = {
        reason: { message: 'Failed to fetch dynamically imported module: chunk-123.js' },
      };
      expect(isChunkLoadError(rejection)).toBe(true);
    });

    it('should return false for null, undefined, or regular runtime errors', () => {
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
      expect(isChunkLoadError(new TypeError("Cannot read properties of null (reading 'trim')"))).toBe(false);
      expect(isChunkLoadError('NetworkError: Failed to fetch')).toBe(false);
    });
  });

  describe('triggerChunkReload', () => {
    let mockStorage: Record<string, string>;
    let mockWindow: any;

    beforeEach(() => {
      mockStorage = {};
      mockWindow = {
        sessionStorage: {
          getItem: (key: string) => mockStorage[key] ?? null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
        },
        location: {
          reload: vi.fn(),
        },
      };
    });

    it('should reload and set timestamp when no previous reload attempted', () => {
      const reloaded = triggerChunkReload(mockWindow);
      expect(reloaded).toBe(true);
      expect(mockWindow.location.reload).toHaveBeenCalled();
      expect(mockStorage[CHUNK_RELOAD_KEY]).toBeTruthy();
    });

    it('should prevent infinite reload loop if called within 15 seconds', () => {
      mockStorage[CHUNK_RELOAD_KEY] = Date.now().toString();
      const reloaded = triggerChunkReload(mockWindow);
      expect(reloaded).toBe(false);
      expect(mockWindow.location.reload).not.toHaveBeenCalled();
    });

    it('should allow reload if last attempt was older than 15 seconds', () => {
      mockStorage[CHUNK_RELOAD_KEY] = (Date.now() - 20000).toString();
      const reloaded = triggerChunkReload(mockWindow);
      expect(reloaded).toBe(true);
      expect(mockWindow.location.reload).toHaveBeenCalled();
    });
  });

  describe('GlobalErrorHandler class', () => {
    let handler: GlobalErrorHandler;

    beforeEach(() => {
      handler = new GlobalErrorHandler();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    });

    afterEach(() => {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      vi.restoreAllMocks();
    });

    it('should log non-chunk errors to console.error', () => {
      const genericError = new Error('Database connection failed');
      handler.handleError(genericError);
      expect(console.error).toHaveBeenCalledWith('[GlobalErrorHandler]', genericError);
    });
  });
});

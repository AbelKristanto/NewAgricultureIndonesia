import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeError, createSanitizedResponse } from './error-sanitizer';

describe('error-sanitizer', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  describe('sanitizeError', () => {
    describe('production mode', () => {
      beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
      });

      it('returns localized AI error message for ai category', () => {
        const error = new Error('Gemini API rate limit exceeded');
        const result = sanitizeError(error, 'ai');

        expect(result).toEqual({
          success: false,
          error: 'Gagal menghasilkan analisis. Silakan coba lagi nanti.',
        });
      });

      it('returns localized database error message for database category', () => {
        const error = new Error('connection to PostgreSQL timed out');
        const result = sanitizeError(error, 'database');

        expect(result).toEqual({
          success: false,
          error: 'Gagal memuat data. Silakan coba lagi nanti.',
        });
      });

      it('returns localized general error message for general category', () => {
        const error = new Error('Something went wrong');
        const result = sanitizeError(error, 'general');

        expect(result).toEqual({
          success: false,
          error: 'Terjadi kesalahan. Silakan coba lagi nanti.',
        });
      });

      it('does not expose stack traces in production', () => {
        const error = new Error('fail');
        error.stack = 'Error: fail\n    at Object.<anonymous> (/app/src/lib/gemini.ts:42:11)';
        const result = sanitizeError(error, 'ai');

        expect(result.error).not.toContain('at Object');
        expect(result.error).not.toContain('/app/src/lib');
        expect(result.error).not.toContain('gemini.ts');
      });

      it('does not expose file paths in production', () => {
        const error = new Error('Error in /home/user/project/src/api/route.ts:15:3');
        const result = sanitizeError(error, 'general');

        expect(result.error).not.toContain('/home/user');
        expect(result.error).not.toContain('route.ts');
      });

      it('does not expose internal service names in production', () => {
        const error = new Error('Supabase connection failed: timeout after 5000ms');
        const result = sanitizeError(error, 'database');

        expect(result.error).not.toContain('Supabase');
        expect(result.error).not.toContain('timeout after 5000ms');
      });

      it('does not expose environment variables in production', () => {
        const error = new Error('Invalid key: SUPABASE_URL=https://abc.supabase.co');
        const result = sanitizeError(error, 'database');

        expect(result.error).not.toContain('SUPABASE_URL');
        expect(result.error).not.toContain('https://abc.supabase.co');
      });
    });

    describe('development mode', () => {
      beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'development');
      });

      it('includes original error message for debugging when safe', () => {
        const error = new Error('Request timeout');
        const result = sanitizeError(error, 'ai');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Request timeout');
        expect(result.error).toContain('Gagal menghasilkan analisis');
      });

      it('still sanitizes sensitive info in development', () => {
        const error = new Error('Gemini API key invalid');
        const result = sanitizeError(error, 'ai');

        expect(result.error).not.toContain('Gemini');
        expect(result.error).toBe('Gagal menghasilkan analisis. Silakan coba lagi nanti.');
      });

      it('sanitizes file paths in development', () => {
        const error = new Error('Error at /Users/dev/project/src/lib/gemini.ts:42');
        const result = sanitizeError(error, 'ai');

        expect(result.error).not.toContain('/Users/dev');
      });

      it('sanitizes environment variable patterns in development', () => {
        const error = new Error('Missing GOOGLE_API_KEY=sk-abc123');
        const result = sanitizeError(error, 'ai');

        expect(result.error).not.toContain('GOOGLE_API_KEY');
        expect(result.error).not.toContain('sk-abc123');
      });
    });

    describe('server-side logging', () => {
      beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
      });

      it('logs full error details with console.error', () => {
        const error = new Error('Gemini API failed');
        error.stack = 'Error: Gemini API failed\n    at /app/src/lib/gemini.ts:42:11';

        sanitizeError(error, 'ai');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[AI ERROR]',
          expect.stringContaining('Gemini API failed')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[AI ERROR]',
          expect.stringContaining('/app/src/lib/gemini.ts')
        );
      });

      it('logs string errors', () => {
        sanitizeError('connection refused', 'database');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[DATABASE ERROR]',
          'connection refused'
        );
      });

      it('logs unknown error types', () => {
        sanitizeError({ code: 500, msg: 'fail' }, 'general');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[GENERAL ERROR]',
          expect.stringContaining('"code":500')
        );
      });
    });

    describe('error type handling', () => {
      beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
      });

      it('handles Error objects', () => {
        const result = sanitizeError(new Error('test'), 'ai');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gagal menghasilkan analisis. Silakan coba lagi nanti.');
      });

      it('handles string errors', () => {
        const result = sanitizeError('something broke', 'database');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gagal memuat data. Silakan coba lagi nanti.');
      });

      it('handles null/undefined errors', () => {
        const result = sanitizeError(null, 'general');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Terjadi kesalahan. Silakan coba lagi nanti.');
      });

      it('handles object errors', () => {
        const result = sanitizeError({ message: 'fail' }, 'ai');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gagal menghasilkan analisis. Silakan coba lagi nanti.');
      });
    });
  });

  describe('createSanitizedResponse', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('returns a NextResponse with status 500 by default', async () => {
      const response = createSanitizedResponse(new Error('fail'), 'ai');

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Gagal menghasilkan analisis. Silakan coba lagi nanti.',
      });
    });

    it('accepts a custom status code', async () => {
      const response = createSanitizedResponse(new Error('fail'), 'database', 503);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Gagal memuat data. Silakan coba lagi nanti.',
      });
    });

    it('logs the full error server-side', () => {
      createSanitizedResponse(new Error('Supabase timeout'), 'database');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DATABASE ERROR]',
        expect.stringContaining('Supabase timeout')
      );
    });
  });
});

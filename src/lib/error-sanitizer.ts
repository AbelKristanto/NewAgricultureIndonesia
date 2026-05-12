import { NextResponse } from 'next/server';

export type ErrorCategory = 'ai' | 'database' | 'general';

/**
 * Localized Indonesian error messages by category.
 */
const LOCALIZED_MESSAGES: Record<ErrorCategory, string> = {
  ai: 'Gagal menghasilkan analisis. Silakan coba lagi nanti.',
  database: 'Gagal memuat data. Silakan coba lagi nanti.',
  general: 'Terjadi kesalahan. Silakan coba lagi nanti.',
};

/**
 * Internal service names that must never appear in client-facing responses.
 */
const INTERNAL_SERVICE_NAMES = [
  'Gemini',
  'Supabase',
  'PostgreSQL',
  'Postgres',
  'Google AI',
  'GenerativeAI',
  'supabase-js',
  'next-server',
  'node_modules',
];

/**
 * Patterns that indicate sensitive information in error messages.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  // Stack traces: lines starting with "at " followed by function/file info
  /at\s+[\w.<>\/\\]+/gi,
  // File paths: Unix-style
  /\/[\w.-]+\/[\w.-]+(?:\/[\w.-]+)*/g,
  // File paths: Windows-style
  /[A-Z]:\\[\w.-]+\\[\w.-]+(?:\\[\w.-]+)*/gi,
  // Environment variable patterns (KEY=value)
  /[A-Z_]{2,}=\S+/g,
  // Common env var references
  /process\.env\.\w+/g,
  // Line numbers in stack traces
  /:\d+:\d+/g,
];

/**
 * Checks if a string contains any sensitive information.
 */
function containsSensitiveInfo(message: string): boolean {
  if (!message) return false;

  // Check for internal service names
  for (const name of INTERNAL_SERVICE_NAMES) {
    if (message.toLowerCase().includes(name.toLowerCase())) {
      return true;
    }
  }

  // Check for sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts a readable error message from an unknown error value.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Extracts full error details for server-side logging.
 */
function extractErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Sanitizes an error for client-facing responses.
 *
 * - Logs full error details server-side with console.error
 * - In production: always returns a localized Indonesian error message
 * - In development: includes the original error message for debugging
 *   (unless it contains sensitive information)
 *
 * @param error - The error to sanitize (Error object or unknown)
 * @param category - The error category ('ai' | 'database' | 'general')
 * @returns A sanitized response object with { success: false, error: string }
 */
export function sanitizeError(
  error: unknown,
  category: ErrorCategory
): { success: false; error: string } {
  // Always log full error details server-side
  console.error(`[${category.toUpperCase()} ERROR]`, extractErrorDetails(error));

  const isProduction = process.env.NODE_ENV === 'production';
  const localizedMessage = LOCALIZED_MESSAGES[category];

  if (isProduction) {
    // In production, always return the sanitized localized message
    return { success: false, error: localizedMessage };
  }

  // In development, include original message for debugging
  // unless it contains sensitive information
  const originalMessage = extractErrorMessage(error);

  if (containsSensitiveInfo(originalMessage)) {
    return { success: false, error: localizedMessage };
  }

  return {
    success: false,
    error: `${localizedMessage} (Dev: ${originalMessage})`,
  };
}

/**
 * Creates a sanitized NextResponse for API error responses.
 *
 * @param error - The error to sanitize
 * @param category - The error category ('ai' | 'database' | 'general')
 * @param statusCode - HTTP status code (defaults to 500)
 * @returns A NextResponse with sanitized error body
 */
export function createSanitizedResponse(
  error: unknown,
  category: ErrorCategory,
  statusCode: number = 500
): NextResponse {
  const body = sanitizeError(error, category);
  return NextResponse.json(body, { status: statusCode });
}

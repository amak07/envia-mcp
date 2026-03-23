/**
 * Shared HTTP utility and response formatting functions.
 * Adapted from exploration api-client.ts — simplified for production use.
 */

import {
  CHARACTER_LIMIT,
  ALLOWED_HOSTS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BASE_DELAY_MS,
} from './constants.js';
import type { RetryOptions } from './types.js';

/** HTTP error with status code for handleApiError */
export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiHttpError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Centralized HTTP request function for Envia API calls.
 * Features: 30s timeout, SSRF hostname allowlist, exponential backoff retry on 429/5xx.
 */
export async function makeApiRequest<T>(options: {
  baseUrl: string;
  endpoint: string;
  method?: 'GET' | 'POST';
  data?: unknown;
  params?: Record<string, string>;
  apiKey?: string;
  retry?: RetryOptions;
  skipHostCheck?: boolean;
}): Promise<T> {
  const { baseUrl, endpoint, method = 'GET', data, params, apiKey, skipHostCheck } = options;
  const maxRetries = options.retry?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options.retry?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  let url = `${baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // SSRF prevention: only allow requests to known Envia API domains
  if (!skipHostCheck) {
    try {
      const parsedUrl = new URL(url);
      if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
        throw new Error(
          `Blocked: request to unauthorized host "${parsedUrl.hostname}". Only Envia API domains are allowed.`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Blocked:')) throw e;
      throw new Error('Blocked: invalid URL.');
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const init: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(30_000),
      };
      if (data !== undefined && method === 'POST') {
        init.body = JSON.stringify(data);
      }

      const res = await fetch(url, init);
      const text = await res.text();

      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { _raw: text };
      }

      if (res.ok) {
        return parsed as T;
      }

      // Decide whether to retry
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        // Respect Retry-After header on 429 (seconds format only; ignore HTTP-date)
        const retryAfter = res.headers.get('Retry-After');
        const parsedRetryAfter = retryAfter ? parseInt(retryAfter, 10) : NaN;
        const delay = Number.isFinite(parsedRetryAfter)
          ? parsedRetryAfter * 1000
          : baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      throw new ApiHttpError(res.status, parsed);
    } catch (e) {
      if (e instanceof ApiHttpError) throw e;
      lastError = e;
      if (attempt < maxRetries) {
        await sleep(baseDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  // All retries exhausted with a network-level error
  throw lastError instanceof Error
    ? lastError
    : new Error(`Network error after ${maxRetries + 1} attempts.`);
}

/**
 * Maps errors to actionable messages for AI agents.
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    switch (error.status) {
      case 400:
        return 'Error: Missing or invalid required field. Check carrier, address, and package fields.';
      case 401:
        return 'Error: Authentication failed. Verify your ENVIA_API_KEY is valid and not expired.';
      case 402:
        return 'Error: Insufficient balance. Top up your Envia prepaid balance before creating labels.';
      case 403:
        return 'Error: Forbidden. Your API key does not have permission for this operation.';
      case 422:
        return 'Error: Validation failed. One or more fields are invalid. Check the response for details.';
      case 429:
        return 'Error: Rate limit exceeded. Wait before making more requests.';
      default:
        if (error.status >= 500) {
          return 'Error: Envia API is temporarily unavailable. Try again in a few moments.';
        }
        // Check for known Envia error codes in response body
        if (error.body && typeof error.body === 'object' && 'error' in error.body) {
          const enviaError = error.body as { error?: { code?: number; message?: string } };
          if (enviaError.error?.code === 1115) {
            return 'Error 1115: Shipment is already canceled.';
          }
          if (enviaError.error?.code === 1125) {
            return 'Error 1125: No shipments found for the tracking numbers.';
          }
          if (enviaError.error?.message) {
            return `Error ${enviaError.error.code}: ${enviaError.error.message}`;
          }
        }
        return `Error: HTTP ${error.status}`;
    }
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return 'Error: Request timed out after 30 seconds. Try again.';
    }
    return `Error: ${error.message}`;
  }

  return 'Error: An unexpected error occurred.';
}

/**
 * Truncate a response array if the JSON representation exceeds CHARACTER_LIMIT.
 * Returns truncation metadata.
 */
export function truncateResponse<T>(
  items: T[],
  originalTotal: number,
): {
  items: T[];
  truncated: boolean;
  truncation_message?: string;
} {
  const json = JSON.stringify(items);
  if (json.length <= CHARACTER_LIMIT) {
    return { items, truncated: false };
  }

  // Truncate to half
  const truncatedItems = items.slice(0, Math.ceil(items.length / 2));
  return {
    items: truncatedItems,
    truncated: true,
    truncation_message: `Response truncated from ${originalTotal} to ${truncatedItems.length} items. Use 'limit' parameter or add filters to reduce results.`,
  };
}

/**
 * Format a number as MXN currency string.
 */
export function formatMXN(amount: number): string {
  return `$${amount.toFixed(2)} MXN`;
}

/**
 * Format a number as USD currency string.
 */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)} USD`;
}

/**
 * Shared HTTP utility and response formatting functions.
 * Adapted from exploration api-client.ts — simplified for production use.
 */

import { CHARACTER_LIMIT } from './constants.js';

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

/**
 * Centralized HTTP request function for Envia API calls.
 * Uses native fetch with 30s timeout.
 */
export async function makeApiRequest<T>(options: {
  baseUrl: string;
  endpoint: string;
  method?: 'GET' | 'POST';
  data?: unknown;
  params?: Record<string, string>;
  apiKey?: string;
}): Promise<T> {
  const { baseUrl, endpoint, method = 'GET', data, params, apiKey } = options;

  let url = `${baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

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

  if (!res.ok) {
    throw new ApiHttpError(res.status, parsed);
  }

  return parsed as T;
}

/**
 * Maps errors to actionable messages for AI agents.
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    switch (error.status) {
      case 400:
        return 'Error: Missing or invalid required field. Check carrier, address, and package fields.';
      case 403:
        return 'Error: Invalid API key. Verify ENVIA_API_KEY is set correctly.';
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

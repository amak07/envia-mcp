/**
 * Shared constants for the Envia MCP server and client library.
 */

/** Maximum response size in characters — truncate with actionable message if exceeded */
export const CHARACTER_LIMIT = 25_000;

/** Default API base URLs — sandbox by default for safety (overridden by env vars) */
export const DEFAULT_SHIPPING_URL = 'https://api-test.envia.com';
export const DEFAULT_QUERIES_URL = 'https://queries-test.envia.com';
export const DEFAULT_GEOCODES_URL = 'https://geocodes.envia.com'; // Always production — sandbox geocodes is DOWN (503)

/** Production API base URLs — set ENVIA_SHIPPING_URL / ENVIA_QUERIES_URL to use these */
export const PRODUCTION_SHIPPING_URL = 'https://api.envia.com';
export const PRODUCTION_QUERIES_URL = 'https://queries.envia.com';

/** Response format for MCP tools — all data-returning tools support this */
export const ResponseFormat = {
  MARKDOWN: 'markdown',
  JSON: 'json',
} as const;

export type ResponseFormat = (typeof ResponseFormat)[keyof typeof ResponseFormat];

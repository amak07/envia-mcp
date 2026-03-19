/**
 * Shared constants for the Envia MCP server and client library.
 */

/** Maximum response size in characters — truncate with actionable message if exceeded */
export const CHARACTER_LIMIT = 25_000;

/** Default API base URLs (overridden by env vars) */
export const DEFAULT_SHIPPING_URL = 'https://api.envia.com';
export const DEFAULT_QUERIES_URL = 'https://queries.envia.com';
export const DEFAULT_GEOCODES_URL = 'https://geocodes.envia.com';

/** Response format for MCP tools — all data-returning tools support this */
export enum ResponseFormat {
  MARKDOWN = 'markdown',
  JSON = 'json',
}

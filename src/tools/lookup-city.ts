/**
 * envia_lookup_city — Look up cities by name via the Geocodes API.
 * Read-only and idempotent. No authentication required.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaLookupCityOutput } from '../types.js';
import {
  EnviaLookupCityInputSchema,
  EnviaLookupCityOutputSchema,
} from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function formatCityMarkdown(output: EnviaLookupCityOutput): string {
  const lines: string[] = [];
  lines.push(`## City Lookup: "${output.city_query}"`);
  lines.push(`**${output.total} result${output.total === 1 ? '' : 's'} found**`);
  lines.push('');

  if (output.cities.length === 0) {
    lines.push('No matching cities found.');
    return lines.join('\n');
  }

  for (const c of output.cities) {
    lines.push(`### ${c.city}`);
    if (c.state) lines.push(`- **State:** ${c.state}`);
    if (c.postal_codes && c.postal_codes.length > 0) {
      const display = c.postal_codes.length > 10
        ? `${c.postal_codes.slice(0, 10).join(', ')} ... (+${c.postal_codes.length - 10} more)`
        : c.postal_codes.join(', ');
      lines.push(`- **Postal Codes:** ${display}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function registerLookupCityTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_lookup_city',
    {
      title: 'Look Up City',
      description: `Look up cities by name to find postal codes, state, and region information.

Uses the Envia Geocodes API which requires no authentication.

Args:
  city — City name to search for (e.g., "Monterrey", "Guadalajara")
  country_code — Country code (default: "MX")
  response_format — "markdown" (default) or "json"

Returns:
  List of matching cities with state, postal codes, and region info.

Examples:
  Look up Monterrey: city="Monterrey"
  Look up with country: city="Monterrey", country_code="MX"

Errors:
  500+ — Geocodes API temporarily unavailable (auto-retries with production fallback)`,
      inputSchema: EnviaLookupCityInputSchema,
      outputSchema: EnviaLookupCityOutputSchema,
      annotations: {
        title: 'Look Up City',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const items = await client.lookupCity(
          args.city,
          args.country_code ?? 'MX',
        );

        const output: EnviaLookupCityOutput = {
          total: items.length,
          city_query: args.city,
          cities: items.map((item) => ({
            city: item.city,
            state: item.state,
            postal_codes: item.postalCodes,
            regions: item.regions,
          })),
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatCityMarkdown(output);

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: output as unknown as Record<string, unknown>,
        };
      } catch (error) {
        const message = handleApiError(error);
        return {
          content: [{ type: 'text' as const, text: message }],
          isError: true,
        };
      }
    },
  );
}

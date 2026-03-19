/**
 * envia_validate_zipcode — Validate a Mexican postal code and return address details.
 * Read-only and idempotent. Uses Geocodes API (no authentication required).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaValidateZipcodeOutput } from '../types.js';
import {
  EnviaValidateZipcodeInputSchema,
  EnviaValidateZipcodeOutputSchema,
} from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function formatZipcodeMarkdown(output: EnviaValidateZipcodeOutput): string {
  const lines: string[] = [];

  if (!output.valid) {
    lines.push(`## Postal Code: ${output.postal_code}`);
    lines.push('');
    lines.push(`**Invalid postal code.** No data found for \`${output.postal_code}\`.`);
    return lines.join('\n');
  }

  lines.push(`## Postal Code: ${output.postal_code}`);
  lines.push('');
  lines.push(`- **Valid:** Yes`);
  if (output.city) lines.push(`- **City:** ${output.city}`);
  if (output.state) lines.push(`- **State:** ${output.state}`);
  if (output.state_code_2digit) lines.push(`- **State Code (2-digit):** ${output.state_code_2digit}`);
  if (output.state_code_3digit) lines.push(`- **State Code (3-digit):** ${output.state_code_3digit}`);
  if (output.neighborhoods && output.neighborhoods.length > 0) {
    lines.push(`- **Neighborhoods (${output.neighborhoods.length}):**`);
    for (const n of output.neighborhoods) {
      lines.push(`  - ${n}`);
    }
  }
  if (output.coordinates) {
    lines.push(
      `- **Coordinates:** ${output.coordinates.latitude}, ${output.coordinates.longitude}`,
    );
  }
  if (output.timezone) lines.push(`- **Timezone:** ${output.timezone}`);

  return lines.join('\n');
}

export function registerValidateZipcodeTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_validate_zipcode',
    {
      title: 'Validate Mexican Postal Code',
      description: `Validate a Mexican postal code and return address details (city, state, neighborhoods, coordinates).

Uses the Envia Geocodes API which requires no authentication.

Args:
  postal_code — 5-digit Mexican postal code (e.g., "06700")
  country_code — Country code (default: "MX")
  response_format — "markdown" (default) or "json"

Returns:
  Validity status, city, state, state codes, neighborhoods, coordinates, and timezone.

Examples:
  Valid code: postal_code="06700" -> Roma Norte, Ciudad de Mexico
  Invalid code: postal_code="99999" -> { valid: false }

Errors:
  500+ — Geocodes API temporarily unavailable (auto-retries with production fallback)`,
      inputSchema: EnviaValidateZipcodeInputSchema,
      outputSchema: EnviaValidateZipcodeOutputSchema,
      annotations: {
        title: 'Validate Mexican Postal Code',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const results = await client.validateZipCode(
          args.postal_code,
          args.country_code ?? 'MX',
        );

        let output: EnviaValidateZipcodeOutput;

        if (results.length === 0) {
          output = {
            valid: false,
            postal_code: args.postal_code,
          };
        } else {
          const item = results[0]!;
          output = {
            valid: true,
            postal_code: item.zip_code,
            city: item.locality,
            state: item.state.name,
            state_code_2digit: item.state.code['2digit'],
            state_code_3digit: item.state.code['3digit'],
            neighborhoods: item.suburbs,
            coordinates: {
              latitude: item.coordinates.latitude,
              longitude: item.coordinates.longitude,
            },
            timezone: item.info.time_zone,
          };
        }

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatZipcodeMarkdown(output);

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

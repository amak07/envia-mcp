/**
 * envia_schedule_pickup — Schedule a carrier pickup for packages.
 * Destructive operation — NOT idempotent, creates a real pickup request.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { PickupRequest, EnviaSchedulePickupOutput } from '../types.js';
import {
  EnviaSchedulePickupInputSchema,
  EnviaSchedulePickupOutputSchema,
} from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function formatPickupMarkdown(output: EnviaSchedulePickupOutput): string {
  const lines: string[] = [];
  lines.push(`## Pickup Scheduled`);
  lines.push('');
  if (output.confirmation) lines.push(`- **Confirmation:** ${output.confirmation}`);
  lines.push(`- **Carrier:** ${output.carrier}`);
  lines.push(`- **Date:** ${output.date}`);
  lines.push(`- **Window:** ${output.time_from}:00 - ${output.time_to}:00`);
  if (output.status) lines.push(`- **Status:** ${output.status}`);

  return lines.join('\n');
}

export function registerSchedulePickupTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_schedule_pickup',
    {
      title: 'Schedule Envia Carrier Pickup',
      description: `Schedule a carrier pickup for one or more packages. This is a DESTRUCTIVE operation — it creates a real pickup request.

WARNING: Duplicate calls may create duplicate pickups. Confirm with the user before proceeding.

Args:
  origin_* — Pickup address fields (name, street, street_number, neighborhood, city, state, postal_code, phone, email)
  carrier — Carrier string (e.g., "dhl", "fedex", "estafeta")
  tracking_numbers — Comma-separated tracking numbers to pick up
  date — Pickup date in YYYY-MM-DD format
  time_from — Pickup window start hour (0-23)
  time_to — Pickup window end hour (0-23)
  total_weight — Total weight in kg
  total_packages — Number of packages
  instructions — Special instructions (optional)
  response_format — "markdown" (default) or "json"

Returns:
  Pickup confirmation number, carrier, date, time window, and status.

Errors:
  400 — Invalid address, carrier, or time fields
  403 — Invalid API key`,
      inputSchema: EnviaSchedulePickupInputSchema,
      outputSchema: EnviaSchedulePickupOutputSchema,
      annotations: {
        title: 'Schedule Envia Carrier Pickup',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const origin = {
          name: args.origin_name,
          company: args.origin_company ?? '',
          phone: args.origin_phone,
          phone_code: args.origin_country ?? 'MX',
          email: args.origin_email,
          street: args.origin_street,
          number: args.origin_street_number,
          district: args.origin_neighborhood,
          city: args.origin_city,
          state: args.origin_state,
          country: args.origin_country ?? 'MX',
          postalCode: args.origin_postal_code,
          reference: '',
        };

        const trackingNumbers = args.tracking_numbers
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        const request: PickupRequest = {
          origin,
          carrier: args.carrier,
          trackingNumbers,
          date: args.date,
          timeFrom: args.time_from,
          timeTo: args.time_to,
          totalWeight: args.total_weight,
          totalPackages: args.total_packages,
          ...(args.instructions ? { instructions: args.instructions } : {}),
        };

        const result = await client.schedulePickup(request);

        const output: EnviaSchedulePickupOutput = {
          confirmation: result.confirmation,
          carrier: result.carrier,
          date: result.date,
          time_from: result.timeFrom,
          time_to: result.timeTo,
          status: result.status,
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatPickupMarkdown(output);

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

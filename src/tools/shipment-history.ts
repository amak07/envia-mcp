/**
 * envia_shipment_history — Get shipment history for a given month/year.
 * Read-only and idempotent.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaShipmentHistoryOutput } from '../types.js';
import {
  EnviaShipmentHistoryInputSchema,
  EnviaShipmentHistoryOutputSchema,
} from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function formatHistoryMarkdown(output: EnviaShipmentHistoryOutput): string {
  const lines: string[] = [];
  lines.push(`## Shipment History`);
  lines.push(`**${output.total} shipment${output.total === 1 ? '' : 's'}** for ${output.month}/${output.year}`);
  lines.push('');

  if (output.shipments.length === 0) {
    lines.push('No shipments found for this period.');
    return lines.join('\n');
  }

  for (const s of output.shipments) {
    lines.push(`### ${s.tracking_number} (${s.carrier})`);
    lines.push(`- **Status:** ${s.status}`);
    if (s.service) lines.push(`- **Service:** ${s.service}`);
    if (s.origin_city || s.destination_city) {
      lines.push(`- **Route:** ${s.origin_city ?? '?'} -> ${s.destination_city ?? '?'}`);
    }
    if (s.total_price != null) {
      lines.push(`- **Price:** $${s.total_price.toFixed(2)} ${s.currency ?? ''}`);
    }
    if (s.created_at) lines.push(`- **Created:** ${s.created_at}`);
    if (s.label_url) lines.push(`- **Label:** ${s.label_url}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function registerShipmentHistoryTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_shipment_history',
    {
      title: 'Get Envia Shipment History',
      description: `Get shipment history for a given month and year.

Args:
  month — Month number (1-12)
  year — Year (2020 or later)
  response_format — "markdown" (default) or "json"

Returns:
  List of shipments with tracking number, carrier, status, route, price, and label URL.

Errors:
  400 — Invalid month or year
  403 — Invalid API key`,
      inputSchema: EnviaShipmentHistoryInputSchema,
      outputSchema: EnviaShipmentHistoryOutputSchema,
      annotations: {
        title: 'Get Envia Shipment History',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const items = await client.getShipmentHistory(args.month, args.year);

        const output: EnviaShipmentHistoryOutput = {
          total: items.length,
          month: args.month,
          year: args.year,
          shipments: items.map((item) => ({
            tracking_number: item.trackingNumber,
            carrier: item.carrier,
            service: item.service,
            status: item.status,
            origin_city: item.originCity,
            destination_city: item.destinationCity,
            total_price: item.totalPrice,
            currency: item.currency,
            label_url: item.label,
            created_at: item.createdAt,
          })),
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatHistoryMarkdown(output);

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

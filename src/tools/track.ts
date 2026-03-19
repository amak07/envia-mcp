/**
 * envia_track — Track shipments by tracking number.
 * Read-only and idempotent.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaTrackOutput, TrackingItem } from '../types.js';
import { EnviaTrackInputSchema, EnviaTrackOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError, truncateResponse } from '../utils.js';

function mapTrackingItem(item: TrackingItem) {
  return {
    tracking_number: item.trackingNumber,
    carrier: item.carrier,
    status: item.status,
    status_date: item.createdAt,
    track_url: item.trackUrl,
    track_url_site: item.trackUrlSite,
    event_history: item.eventHistory,
    pod_file: item.podFile,
    folio: item.folio,
  };
}

function formatTrackMarkdown(output: EnviaTrackOutput): string {
  const lines: string[] = [];
  lines.push(`## Shipment Tracking`);
  lines.push(`**${output.total} shipment${output.total === 1 ? '' : 's'} found**`);
  lines.push('');

  for (const s of output.shipments) {
    lines.push(`### ${s.tracking_number}`);
    lines.push(`- **Carrier:** ${s.carrier}`);
    lines.push(`- **Status:** ${s.status}`);
    lines.push(`- **Date:** ${s.status_date}`);
    lines.push(`- **Track URL:** ${s.track_url}`);
    if (s.folio) {
      lines.push(`- **Folio:** ${s.folio}`);
    }
    if (s.pod_file) {
      lines.push(`- **POD File:** ${s.pod_file}`);
    }
    if (s.event_history.length > 0) {
      lines.push(`- **Events:** ${s.event_history.length} event${s.event_history.length === 1 ? '' : 's'} in history`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function registerTrackTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_track',
    {
      title: 'Track Envia Shipments',
      description: `Track one or more shipments by tracking number.

Args:
  tracking_numbers — Comma-separated tracking numbers (e.g., "2456698904,2456699011")
  response_format — "markdown" (default) or "json"

Returns:
  Tracking status, carrier, dates, URLs, and event history for each shipment.

Examples:
  Single: tracking_numbers="2456698904"
  Batch: tracking_numbers="2456698904,2456699011,2456699128"

Errors:
  1125 — No shipments found for the given tracking numbers
  403 — Invalid API key`,
      inputSchema: EnviaTrackInputSchema,
      outputSchema: EnviaTrackOutputSchema,
      annotations: {
        title: 'Track Envia Shipments',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const trackingNumbers = args.tracking_numbers
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const trackingItems = await client.trackShipments(trackingNumbers);
        const shipments = trackingItems.map(mapTrackingItem);
        const { items: truncatedShipments } = truncateResponse(shipments, shipments.length);

        const output: EnviaTrackOutput = {
          total: truncatedShipments.length,
          shipments: truncatedShipments,
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatTrackMarkdown(output);

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

/**
 * envia_get_carriers — List available shipping carriers from Envia.com.
 * Read-only and idempotent. Manual pagination over full carrier list.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { Carrier, EnviaGetCarriersOutput } from '../types.js';
import { EnviaGetCarriersInputSchema, EnviaGetCarriersOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function mapCarrier(c: Carrier) {
  return {
    id: c.id,
    name: c.name,
    endpoint: c.endpoint,
    country_code: c.country_code,
    track_url: c.track_url ?? '',
    logo: c.logo ?? '',
    box_weight_limit: c.box_weight_limit,
    pallet_weight_limit: c.pallet_weight_limit,
    pickup_sameday: !!c.pickup_sameday,
    pickup_start_time: c.pickup_start_time != null ? String(c.pickup_start_time) : null,
    pickup_end_time: c.pickup_end_time != null ? String(c.pickup_end_time) : null,
    pickup_span_time: c.pickup_span_time,
    pickup_sameday_limit_time:
      c.pickup_sameday_limit_time != null ? String(c.pickup_sameday_limit_time) : null,
  };
}

function formatCarriersMarkdown(output: EnviaGetCarriersOutput): string {
  const lines: string[] = [];
  lines.push(`## Envia Carriers`);
  lines.push(
    `**${output.total} total** | Showing ${output.count} (offset ${output.offset})`,
  );
  if (output.has_more) {
    lines.push(`> More results available. Use \`offset: ${output.next_offset}\` for the next page.`);
  }
  lines.push('');

  for (const c of output.carriers) {
    lines.push(`### ${c.name} (\`${c.endpoint}\`)`);
    lines.push(`- **ID:** ${c.id}`);
    lines.push(`- **Box Weight Limit:** ${c.box_weight_limit != null ? `${c.box_weight_limit} kg` : 'N/A'}`);
    if (c.pallet_weight_limit != null) {
      lines.push(`- **Pallet Weight Limit:** ${c.pallet_weight_limit} kg`);
    }
    lines.push(`- **Same-day Pickup:** ${c.pickup_sameday ? 'Yes' : 'No'}`);
    if (c.track_url) {
      lines.push(`- **Track URL:** ${c.track_url}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function registerGetCarriersTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_get_carriers',
    {
      title: 'List Envia Carriers',
      description: `List available shipping carriers on Envia.com for a country.

Mexico has 34+ carriers including DHL, FedEx, Estafeta, PaqueteExpress, Redpack, etc.

Args:
  country_code — Country code (default: "MX")
  limit — Max results per page (1-50, default: 20)
  offset — Pagination offset (default: 0)
  response_format — "markdown" (default) or "json"

Returns:
  Paginated list of carriers with ID, name, endpoint, weight limits, and pickup info.

Examples:
  First page: limit=20, offset=0
  Second page: limit=20, offset=20
  All MX carriers: limit=50, offset=0

Errors:
  403 — Invalid API key`,
      inputSchema: EnviaGetCarriersInputSchema,
      outputSchema: EnviaGetCarriersOutputSchema,
      annotations: {
        title: 'List Envia Carriers',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const allCarriers = await client.getCarriers(args.country_code ?? 'MX');

        const limit = args.limit ?? 20;
        const offset = args.offset ?? 0;
        const page = allCarriers.slice(offset, offset + limit);
        const hasMore = offset + limit < allCarriers.length;

        const output: EnviaGetCarriersOutput = {
          total: allCarriers.length,
          count: page.length,
          offset,
          carriers: page.map(mapCarrier),
          has_more: hasMore,
          ...(hasMore ? { next_offset: offset + limit } : {}),
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatCarriersMarkdown(output);

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

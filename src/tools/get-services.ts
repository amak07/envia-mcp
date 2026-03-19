/**
 * envia_get_services — List available services for a carrier on Envia.com.
 * Read-only and idempotent. Manual pagination over full service list.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { CarrierService, EnviaGetServicesOutput } from '../types.js';
import { EnviaGetServicesInputSchema, EnviaGetServicesOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function mapService(s: CarrierService) {
  return {
    service_id: s.service_id,
    carrier_name: s.carrier_name,
    name: s.name,
    description: s.description,
    delivery_estimate: s.delivery_estimate,
    cash_on_delivery: !!s.cash_on_delivery,
    drop_off: !!s.drop_off,
    active: !!s.active,
  };
}

function formatServicesMarkdown(output: EnviaGetServicesOutput): string {
  const lines: string[] = [];
  lines.push(`## Services for ${output.carrier}`);
  lines.push(
    `**${output.total} total** | Showing ${output.count} (offset ${output.offset})`,
  );
  if (output.has_more) {
    lines.push(`> More results available. Use \`offset: ${output.next_offset}\` for the next page.`);
  }
  lines.push('');

  for (const s of output.services) {
    lines.push(`### ${s.name} (ID: ${s.service_id})`);
    lines.push(`- **Description:** ${s.description}`);
    lines.push(`- **Delivery Estimate:** ${s.delivery_estimate}`);
    lines.push(`- **COD:** ${s.cash_on_delivery ? 'Yes' : 'No'}`);
    lines.push(`- **Drop-off:** ${s.drop_off ? 'Yes' : 'No'}`);
    lines.push(`- **Active:** ${s.active ? 'Yes' : 'No'}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function registerGetServicesTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_get_services',
    {
      title: 'List Carrier Services',
      description: `List available services for a specific carrier on Envia.com.

Service counts vary by carrier: DHL=31, FedEx=130, Estafeta=8.

Args:
  carrier — Carrier string (e.g., "dhl", "fedex", "estafeta")
  country_code — Country code (default: "MX")
  limit — Max results per page (1-100, default: 20)
  offset — Pagination offset (default: 0)
  response_format — "markdown" (default) or "json"

Returns:
  Paginated list of services with ID, name, description, delivery estimate, and capabilities.

Examples:
  DHL services: carrier="dhl"
  FedEx page 2: carrier="fedex", limit=20, offset=20

Errors:
  400 — Invalid carrier name
  403 — Invalid API key`,
      inputSchema: EnviaGetServicesInputSchema,
      outputSchema: EnviaGetServicesOutputSchema,
      annotations: {
        title: 'List Carrier Services',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const allServices = await client.getServices(
          args.carrier,
          args.country_code ?? 'MX',
        );

        const limit = args.limit ?? 20;
        const offset = args.offset ?? 0;
        const page = allServices.slice(offset, offset + limit);
        const hasMore = offset + limit < allServices.length;

        const output: EnviaGetServicesOutput = {
          total: allServices.length,
          count: page.length,
          offset,
          carrier: args.carrier,
          services: page.map(mapService),
          has_more: hasMore,
          ...(hasMore ? { next_offset: offset + limit } : {}),
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatServicesMarkdown(output);

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

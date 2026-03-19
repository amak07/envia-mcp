/**
 * envia_create_label — Purchase a shipping label from Envia.com.
 * NOT read-only, NOT idempotent. Each call costs money and creates a new shipment.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaCreateLabelOutput, EnviaLabelAddress } from '../types.js';
import { EnviaCreateLabelInputSchema, EnviaCreateLabelOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError, formatUSD } from '../utils.js';

function formatLabelMarkdown(output: EnviaCreateLabelOutput): string {
  const lines: string[] = [];
  lines.push(`## Shipping Label Created`);
  lines.push('');
  lines.push(`- **Carrier:** ${output.carrier}`);
  lines.push(`- **Service:** ${output.service}`);
  lines.push(`- **Shipment ID:** ${output.shipment_id}`);
  lines.push(`- **Tracking Number:** ${output.tracking_number}`);
  lines.push(`- **Track URL:** ${output.track_url}`);
  lines.push(`- **Label URL:** ${output.label_url}`);
  lines.push(`- **Total Price:** ${formatUSD(output.total_price_usd)}`);
  lines.push(`- **Account Balance:** ${formatUSD(output.current_balance_usd)}`);
  lines.push('');
  lines.push(`> The label PDF is a permanent S3 link. Download it promptly.`);

  return lines.join('\n');
}

export function registerCreateLabelTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_create_label',
    {
      title: 'Purchase Envia Shipping Label',
      description: `Purchase a shipping label from Envia.com. THIS COSTS REAL MONEY.

WARNING: This tool is NOT idempotent. Each call creates a NEW shipment and charges your account.
Do NOT call this tool multiple times for the same shipment — you will be double-charged.
Always confirm with the user before calling this tool.

Args:
  origin_* — Sender address fields (name, company, street, street_number, neighborhood, city, state, postal_code, phone, email)
  origin_rfc — RFC / tax ID (default: XAXX010101000 for general public)
  dest_* — Recipient address fields (same structure)
  package_name — Short name for the package
  package_weight_kg, package_length_cm, package_width_cm, package_height_cm — Dimensions
  package_contents — Description of contents
  declared_value_mxn — Declared value (optional, default 0)
  carrier — Carrier string from quote response (e.g., "dhl")
  service — Service string from quote response (e.g., "ground")
  print_format — "PDF" (default) or "ZPL"
  print_size — "STOCK_4X6" (default) or "PAPER_8.5X11"
  response_format — "markdown" (default) or "json"

Returns:
  Shipment ID, tracking number, label URL, total price in USD, and remaining balance.

Errors:
  400 — Invalid address/package fields or carrier/service mismatch
  403 — Invalid API key
  Insufficient balance — Check current_balance_usd in response`,
      inputSchema: EnviaCreateLabelInputSchema,
      outputSchema: EnviaCreateLabelOutputSchema,
      annotations: {
        title: 'Purchase Envia Shipping Label',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const originAddress: EnviaLabelAddress = {
          name: args.origin_name,
          company: args.origin_company ?? '',
          phone: args.origin_phone,
          phone_code: '52',
          email: args.origin_email,
          street: args.origin_street,
          number: args.origin_street_number,
          district: args.origin_neighborhood,
          city: args.origin_city,
          state: args.origin_state,
          country: 'MX',
          postalCode: args.origin_postal_code,
          reference: '',
          type: 'origin',
          identificationNumber: args.origin_rfc ?? 'XAXX010101000',
        };

        const destAddress: EnviaLabelAddress = {
          name: args.dest_name,
          company: args.dest_company ?? '',
          phone: args.dest_phone,
          phone_code: '52',
          email: args.dest_email,
          street: args.dest_street,
          number: args.dest_street_number,
          district: args.dest_neighborhood,
          city: args.dest_city,
          state: args.dest_state,
          country: 'MX',
          postalCode: args.dest_postal_code,
          reference: '',
          type: 'destination',
          identificationNumber: '',
        };

        const packages = [
          {
            name: args.package_name,
            content: args.package_contents,
            amount: 1,
            type: 'box',
            weight: args.package_weight_kg,
            insurance: 0,
            declaredValue: args.declared_value_mxn ?? 0,
            weightUnit: 'KG',
            lengthUnit: 'CM',
            dimensions: {
              length: args.package_length_cm,
              width: args.package_width_cm,
              height: args.package_height_cm,
            },
          },
        ];

        const labelItem = await client.createLabel(
          originAddress,
          destAddress,
          packages,
          args.carrier,
          args.service,
          {
            printFormat: args.print_format ?? 'PDF',
            printSize: args.print_size ?? 'STOCK_4X6',
          },
        );

        const output: EnviaCreateLabelOutput = {
          shipment_id: labelItem.shipmentId,
          tracking_number: labelItem.trackingNumber,
          track_url: labelItem.trackUrl,
          label_url: labelItem.label,
          total_price_usd: labelItem.totalPrice,
          current_balance_usd: labelItem.currentBalance,
          carrier: labelItem.carrier,
          service: labelItem.service,
          currency: 'USD',
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatLabelMarkdown(output);

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

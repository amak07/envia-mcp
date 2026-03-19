/**
 * envia_quote — Get shipping rate quotes from Envia.com carriers.
 * Read-only and idempotent. No charges incurred.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { RateQuoteItem, EnviaQuoteOutput } from '../types.js';
import { EnviaQuoteInputSchema, EnviaQuoteOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError, truncateResponse, formatMXN } from '../utils.js';

/** Extract a charge amount from costSummary[0].costAdditionalCharges by tag keyword match. */
function extractCharge(item: RateQuoteItem, ...keywords: string[]): number {
  const charges = item.costSummary[0]?.costAdditionalCharges ?? [];
  const match = charges.find((c) => {
    const tag = c.translationTag.toLowerCase();
    return keywords.some((kw) => tag.includes(kw));
  });
  return match?.amount ?? 0;
}

function mapQuoteItem(item: RateQuoteItem) {
  return {
    carrier: item.carrier,
    service: item.service,
    service_description: item.serviceDescription,
    delivery_days: item.deliveryDate.dateDifference,
    base_price_mxn: item.basePrice,
    additional_charges: {
      fuel: extractCharge(item, 'fuel', 'combustible'),
      green_tax: extractCharge(item, 'green', 'verde'),
      extended_zone: extractCharge(item, 'extended', 'zona'),
    },
    total_price_mxn: item.totalPrice,
    currency: 'MXN' as const,
  };
}

function formatQuoteMarkdown(output: EnviaQuoteOutput): string {
  const lines: string[] = [];
  lines.push(`## Shipping Quotes`);
  lines.push(`**${output.total} option${output.total === 1 ? '' : 's'} found** (showing ${output.count})`);
  if (output.truncated) {
    lines.push(`> Response truncated. Add a \`carrier\` filter to reduce results.`);
  }
  lines.push('');

  for (const q of output.quotes) {
    lines.push(`### ${q.carrier} - ${q.service}`);
    lines.push(`- **Total:** ${formatMXN(q.total_price_mxn)}`);
    lines.push(`- **Base:** ${formatMXN(q.base_price_mxn)}`);
    if (q.additional_charges.fuel > 0) {
      lines.push(`- **Fuel surcharge:** ${formatMXN(q.additional_charges.fuel)}`);
    }
    if (q.additional_charges.green_tax > 0) {
      lines.push(`- **Green tax:** ${formatMXN(q.additional_charges.green_tax)}`);
    }
    if (q.additional_charges.extended_zone > 0) {
      lines.push(`- **Extended zone:** ${formatMXN(q.additional_charges.extended_zone)}`);
    }
    lines.push(`- **Delivery:** ${q.delivery_days} business day${q.delivery_days === 1 ? '' : 's'}`);
    lines.push(`- **Service:** ${q.service_description}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function registerQuoteTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_quote',
    {
      title: 'Get Envia Shipping Quotes',
      description: `Get shipping rate quotes from 34+ Mexican carriers via Envia.com.

Args:
  origin_* — Sender address fields (name, street, street_number, neighborhood, city, state, postal_code, phone, email)
  dest_* — Recipient address fields (same structure)
  package_weight_kg — Weight in kg
  package_length_cm, package_width_cm, package_height_cm — Dimensions in cm
  package_contents — Description of contents
  declared_value_mxn — Declared value (optional, default 0)
  carrier — Carrier filter: "dhl", "fedex", "estafeta", etc. Omit to quote ALL carriers.
  response_format — "markdown" (default) or "json"

Returns:
  List of rate options sorted by price (cheapest first) with carrier, service, delivery days, and price breakdown.

Examples:
  Quote all carriers: omit carrier field
  Quote single carrier: carrier="fedex"

Errors:
  400 — Invalid address or package fields
  403 — Invalid API key`,
      inputSchema: EnviaQuoteInputSchema,
      outputSchema: EnviaQuoteOutputSchema,
      annotations: {
        title: 'Get Envia Shipping Quotes',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const origin = {
          name: args.origin_name,
          company: args.origin_company ?? '',
          phone: args.origin_phone,
          phone_code: 'MX',
          email: args.origin_email,
          street: args.origin_street,
          number: args.origin_street_number,
          district: args.origin_neighborhood,
          city: args.origin_city,
          state: args.origin_state,
          country: 'MX',
          postalCode: args.origin_postal_code,
          reference: '',
        };

        const destination = {
          name: args.dest_name,
          company: args.dest_company ?? '',
          phone: args.dest_phone,
          phone_code: 'MX',
          email: args.dest_email,
          street: args.dest_street,
          number: args.dest_street_number,
          district: args.dest_neighborhood,
          city: args.dest_city,
          state: args.dest_state,
          country: 'MX',
          postalCode: args.dest_postal_code,
          reference: '',
        };

        const packages = [
          {
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

        let rateItems: RateQuoteItem[];
        if (args.carrier) {
          rateItems = await client.getQuotes(origin, destination, packages, args.carrier);
        } else {
          rateItems = await client.getQuotesAllCarriers(origin, destination, packages);
        }

        const quotes = rateItems.map(mapQuoteItem);
        const { items: truncatedQuotes, truncated } = truncateResponse(quotes, quotes.length);

        const output: EnviaQuoteOutput = {
          total: quotes.length,
          count: truncatedQuotes.length,
          quotes: truncatedQuotes,
          truncated,
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatQuoteMarkdown(output);

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

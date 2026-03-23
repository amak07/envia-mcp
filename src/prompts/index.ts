/**
 * MCP Prompts — user-initiated workflow templates.
 * Prompts generate structured instructions that guide the agent through multi-step workflows.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAllPrompts(server: McpServer): void {
  // ─── Diagnose Shipment ───
  server.registerPrompt(
    'diagnose-shipment',
    {
      description: 'Investigate a shipment\'s tracking status and identify any issues',
      argsSchema: {
        tracking_number: z.string().describe('The tracking number to investigate'),
      },
    },
    async ({ tracking_number }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Investigate the shipment with tracking number "${tracking_number}".

Steps:
1. Use the envia_track tool with this tracking number
2. Analyze the current status and event history
3. Check if there are any concerning patterns:
   - Is the shipment stuck in one status for too long?
   - Are there any error statuses?
   - Has the shipment been canceled?
4. If the status is "Created" but no movement, check when it was created
5. Report your findings with:
   - Current status and last update time
   - Carrier and service information
   - Any issues or concerns identified
   - Recommended next steps if there are problems`,
          },
        },
      ],
    }),
  );

  // ─── Compare Rates ───
  server.registerPrompt(
    'compare-rates',
    {
      description: 'Quote all carriers for a route and compare price vs speed',
      argsSchema: {
        origin_postal_code: z.string().describe('Origin 5-digit Mexican postal code'),
        dest_postal_code: z.string().describe('Destination 5-digit Mexican postal code'),
        weight_kg: z.string().describe('Package weight in kilograms'),
        length_cm: z.string().describe('Package length in centimeters'),
        width_cm: z.string().describe('Package width in centimeters'),
        height_cm: z.string().describe('Package height in centimeters'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Compare shipping rates for a package from postal code ${args.origin_postal_code} to ${args.dest_postal_code}.

Package: ${args.weight_kg}kg, ${args.length_cm}×${args.width_cm}×${args.height_cm} cm

Steps:
1. First, validate both postal codes using envia_validate_zipcode to get city/state info
2. Use the validated address info to get quotes from all carriers using envia_quote (omit carrier to quote all)
3. Present a comparison table sorted by price, showing:
   - Carrier name
   - Service level
   - Delivery estimate (days)
   - Total price (MXN)
4. Highlight the cheapest option and the fastest option
5. If they're different, explain the price/speed tradeoff

Note: You'll need to provide full address fields for the quote. Use the postal code validation results for city, state, and neighborhood. Use placeholder values for name, phone, email, street, and number.`,
          },
        },
      ],
    }),
  );

  // ─── Verify Address ───
  server.registerPrompt(
    'verify-address',
    {
      description: 'Validate a Mexican postal code and return full address information',
      argsSchema: {
        postal_code: z.string().describe('5-digit Mexican postal code to validate'),
      },
    },
    async ({ postal_code }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Validate the Mexican postal code "${postal_code}" and return all available address information.

Steps:
1. Use envia_validate_zipcode with this postal code
2. Report:
   - Whether the postal code is valid
   - City and state (with state codes)
   - Available neighborhoods/colonias
   - Geographic coordinates
   - Timezone
3. If invalid, explain that the postal code was not found in the Envia geocodes database`,
          },
        },
      ],
    }),
  );

  // ─── Prepare International Shipment ───
  server.registerPrompt(
    'prepare-international-shipment',
    {
      description: 'Step-by-step guide for preparing an international shipment',
      argsSchema: {
        origin_country: z.string().describe('Origin country code (e.g. "MX")'),
        destination_country: z.string().describe('Destination country code (e.g. "US")'),
        product_description: z.string().describe('Description of the product being shipped'),
      },
    },
    async (args) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Prepare an international shipment from ${args.origin_country} to ${args.destination_country} for: "${args.product_description}".

Steps:
1. **Classify the product** — Use envia_classify_hscode with the product description to get the correct HS code for customs
2. **Get shipping rates** — Use envia_get_shipping_rates (envia_quote) to compare carrier options for the ${args.origin_country} → ${args.destination_country} route. Present a comparison table with carrier, service, delivery estimate, and price
3. **Create the label** — Once the user selects a carrier/service, use envia_create_label with the HS code and customs information included
4. **Schedule pickup** — Use envia_schedule_pickup to arrange carrier pickup at the origin address

Important notes:
- International shipments require HS codes for customs clearance
- Commercial invoices may be needed — use the client library's generateCommercialInvoice() method
- Confirm duties payment preference with the user: sender, recipient, or envia_guaranteed
- Currency defaults to MXN but can be configured per-request`,
          },
        },
      ],
    }),
  );
}

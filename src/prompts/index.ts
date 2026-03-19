/**
 * MCP Prompts — user-initiated workflow templates.
 * Prompts generate structured instructions that guide the agent through multi-step workflows.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAllPrompts(server: McpServer): void {
  // ─── Diagnose Shipment ───
  server.prompt(
    'diagnose-shipment',
    'Investigate a shipment\'s tracking status and identify any issues',
    { tracking_number: z.string().describe('The tracking number to investigate') },
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
  server.prompt(
    'compare-rates',
    'Quote all carriers for a route and compare price vs speed',
    {
      origin_postal_code: z.string().describe('Origin 5-digit Mexican postal code'),
      dest_postal_code: z.string().describe('Destination 5-digit Mexican postal code'),
      weight_kg: z.string().describe('Package weight in kilograms'),
      length_cm: z.string().describe('Package length in centimeters'),
      width_cm: z.string().describe('Package width in centimeters'),
      height_cm: z.string().describe('Package height in centimeters'),
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
  server.prompt(
    'verify-address',
    'Validate a Mexican postal code and return full address information',
    { postal_code: z.string().describe('5-digit Mexican postal code to validate') },
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
}

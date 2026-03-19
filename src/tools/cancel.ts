/**
 * envia_cancel — Cancel a shipment and request a refund.
 * Destructive operation — cannot be undone.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaCancelOutput } from '../types.js';
import { EnviaCancelInputSchema, EnviaCancelOutputSchema } from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError, formatUSD } from '../utils.js';

function formatCancelMarkdown(output: EnviaCancelOutput): string {
  const lines: string[] = [];
  lines.push(`## Shipment Canceled`);
  lines.push('');
  lines.push(`- **Tracking Number:** ${output.tracking_number}`);
  lines.push(`- **Carrier:** ${output.carrier}`);
  lines.push(`- **Status:** ${output.status}`);
  lines.push(`- **Refunded:** ${formatUSD(output.refunded_amount)}`);
  lines.push(`- **Balance Returned:** ${formatUSD(output.balance_returned)}`);
  if (output.balance_return_date) {
    lines.push(`- **Return Date:** ${output.balance_return_date}`);
  }

  return lines.join('\n');
}

export function registerCancelTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_cancel',
    {
      title: 'Cancel Envia Shipment',
      description: `Cancel a shipment and request a refund. This is a DESTRUCTIVE operation.

WARNING: Cancellation cannot be undone. Confirm with the user before proceeding.
If the shipment is already canceled, error 1115 will be returned.

Args:
  carrier — Carrier string (e.g., "dhl", "fedex", "estafeta")
  tracking_number — Tracking number of the shipment to cancel
  response_format — "markdown" (default) or "json"

Returns:
  Cancellation status, refunded amount, and balance return info.

Errors:
  1115 — Shipment is already canceled
  400 — Invalid carrier or tracking number
  403 — Invalid API key`,
      inputSchema: EnviaCancelInputSchema,
      outputSchema: EnviaCancelOutputSchema,
      annotations: {
        title: 'Cancel Envia Shipment',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const cancellation = await client.cancelShipment(args.carrier, args.tracking_number);

        const output: EnviaCancelOutput = {
          tracking_number: cancellation.trackingNumber,
          carrier: cancellation.carrier,
          status: 'canceled',
          refunded_amount: cancellation.refundedAmount,
          balance_returned: cancellation.balanceReturned,
          balance_return_date: cancellation.balanceReturnDate,
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatCancelMarkdown(output);

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

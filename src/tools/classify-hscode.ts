/**
 * envia_classify_hscode — Classify a product description into an HS code.
 * Read-only and idempotent.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';
import type { EnviaClassifyHscodeOutput } from '../types.js';
import {
  EnviaClassifyHscodeInputSchema,
  EnviaClassifyHscodeOutputSchema,
} from '../types.js';
import { ResponseFormat } from '../constants.js';
import { handleApiError } from '../utils.js';

function formatHscodeMarkdown(output: EnviaClassifyHscodeOutput): string {
  const lines: string[] = [];
  lines.push(`## HS Code Classification`);
  lines.push('');
  lines.push(`- **HS Code:** ${output.hs_code}`);
  if (output.description) lines.push(`- **Description:** ${output.description}`);
  if (output.confidence_score != null) {
    lines.push(`- **Confidence:** ${(output.confidence_score * 100).toFixed(1)}%`);
  }
  if (output.alternatives && output.alternatives.length > 0) {
    lines.push(`- **Alternatives (${output.alternatives.length}):**`);
    for (const alt of output.alternatives) {
      lines.push(`  - ${alt}`);
    }
  }

  return lines.join('\n');
}

export function registerClassifyHscodeTool(server: McpServer, client: EnviaClient): void {
  server.registerTool(
    'envia_classify_hscode',
    {
      title: 'Classify HS Code',
      description: `Classify a product description into a Harmonized System (HS) code for customs declarations.

Args:
  description — Product description to classify (e.g., "ceramic brake pads for automobiles")
  destination_countries — Comma-separated destination country codes (optional, e.g., "US,CA")
  include_alternatives — Include alternative HS codes (default: true)
  response_format — "markdown" (default) or "json"

Returns:
  HS code, description, confidence score, and alternative codes.

Errors:
  400 — Invalid or empty description
  403 — Invalid API key`,
      inputSchema: EnviaClassifyHscodeInputSchema,
      outputSchema: EnviaClassifyHscodeOutputSchema,
      annotations: {
        title: 'Classify HS Code',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const shipToCountries = args.destination_countries
          ? args.destination_countries.split(',').map((c) => c.trim()).filter(Boolean)
          : undefined;

        const result = await client.classifyHsCode(args.description, {
          shipToCountries,
          includeAlternatives: args.include_alternatives ?? true,
        });

        const output: EnviaClassifyHscodeOutput = {
          hs_code: result.hsCode,
          description: result.description,
          confidence_score: result.confidenceScore,
          alternatives: result.alternatives,
        };

        const text =
          args.response_format === ResponseFormat.JSON
            ? JSON.stringify(output, null, 2)
            : formatHscodeMarkdown(output);

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

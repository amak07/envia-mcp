#!/usr/bin/env node

/**
 * Envia MCP Server — exposes Envia.com shipping API as MCP tools, resources, and prompts.
 * Uses StdioServerTransport for local development (Claude Code, Claude Desktop).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { EnviaClient } from './client.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { registerAllPrompts } from './prompts/index.js';
import {
  DEFAULT_SHIPPING_URL,
  DEFAULT_QUERIES_URL,
  DEFAULT_GEOCODES_URL,
} from './constants.js';

const server = new McpServer({
  name: 'envia-mcp-server',
  version: '0.1.0',
});

const client = new EnviaClient({
  apiKey: process.env.ENVIA_API_KEY ?? '',
  shippingUrl: process.env.ENVIA_SHIPPING_URL ?? DEFAULT_SHIPPING_URL,
  queriesUrl: process.env.ENVIA_QUERIES_URL ?? DEFAULT_QUERIES_URL,
  geocodesUrl: process.env.ENVIA_GEOCODES_URL ?? DEFAULT_GEOCODES_URL,
});

registerAllTools(server, client);
registerAllResources(server);
registerAllPrompts(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Envia MCP Server v0.1.0 running on stdio');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

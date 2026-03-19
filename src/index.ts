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
  PRODUCTION_SHIPPING_URL,
} from './constants.js';

const apiKey = process.env.ENVIA_API_KEY;
if (!apiKey) {
  console.error('Error: ENVIA_API_KEY environment variable is required.');
  console.error('Set it in your MCP server configuration or .env file.');
  process.exit(1);
}

const server = new McpServer({
  name: 'envia-mcp-server',
  version: '0.1.0',
});

const shippingUrl = process.env.ENVIA_SHIPPING_URL ?? DEFAULT_SHIPPING_URL;
const client = new EnviaClient({
  apiKey,
  shippingUrl,
  queriesUrl: process.env.ENVIA_QUERIES_URL ?? DEFAULT_QUERIES_URL,
  geocodesUrl: process.env.ENVIA_GEOCODES_URL ?? DEFAULT_GEOCODES_URL,
});

registerAllTools(server, client);
registerAllResources(server);
registerAllPrompts(server);

const isProduction = shippingUrl === PRODUCTION_SHIPPING_URL;

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Envia MCP Server v0.1.0 running on stdio (${isProduction ? 'PRODUCTION' : 'sandbox'})`);
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

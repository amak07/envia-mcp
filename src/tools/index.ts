/**
 * Barrel module — registers all MCP tools with the server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnviaClient } from '../client.js';

import { registerQuoteTool } from './quote.js';
import { registerCreateLabelTool } from './create-label.js';
import { registerTrackTool } from './track.js';
import { registerCancelTool } from './cancel.js';
import { registerValidateZipcodeTool } from './validate-zipcode.js';
import { registerGetCarriersTool } from './get-carriers.js';
import { registerGetServicesTool } from './get-services.js';

export function registerAllTools(server: McpServer, client: EnviaClient): void {
  registerQuoteTool(server, client);
  registerCreateLabelTool(server, client);
  registerTrackTool(server, client);
  registerCancelTool(server, client);
  registerValidateZipcodeTool(server, client);
  registerGetCarriersTool(server, client);
  registerGetServicesTool(server, client);
}

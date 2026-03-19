# envia-mcp

MCP server and client library for the [Envia.com](https://envia.com) shipping API.

- **`envia-mcp`** — MCP server exposing shipping tools for AI agents (Claude Code, Claude Desktop)
- **`envia-mcp/client`** — Standalone TypeScript client for direct use in Node.js apps

## Quick Start

```bash
npm install envia-mcp
```

### As MCP Server (Claude Code)

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "envia": {
      "command": "npx",
      "args": ["envia-mcp"],
      "env": {
        "ENVIA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### As Client Library

```typescript
import { EnviaClient } from 'envia-mcp/client';

const client = new EnviaClient({
  apiKey: process.env.ENVIA_API_KEY!,
  shippingUrl: 'https://api.envia.com',
  queriesUrl: 'https://queries.envia.com',
  geocodesUrl: 'https://geocodes.envia.com',
});
```

## License

MIT

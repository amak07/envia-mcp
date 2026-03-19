<p align="center">
  <img src="https://envia.com/favicon.ico" alt="Envia logo" width="64" />
</p>

<h1 align="center">envia-mcp</h1>

<p align="center">
  <a href="https://github.com/amak07/envia-mcp/actions"><img src="https://img.shields.io/github/actions/workflow/status/amak07/envia-mcp/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="https://github.com/amak07/envia-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-1.27-7c3aed?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+" alt="MCP 1.27" /></a>
</p>

<p align="center"><strong>MCP server + TypeScript client for the <a href="https://envia.com">Envia.com</a> shipping API.</strong></p>

<p align="center">
  Quote, label, track, and cancel shipments across <strong>34+ Mexican carriers</strong> — from AI agents or your own code.
</p>

---

## What's Inside

**Two exports, one package:**

| Export | Import | Use Case |
|--------|--------|----------|
| **MCP Server** | `envia-mcp` | AI agents (Claude Code, Claude Desktop, Cursor) interact with Envia via natural language |
| **Client Library** | `envia-mcp/client` | Node.js/TypeScript apps call the Envia API directly with full type safety |
| **Type Definitions** | `envia-mcp/types` | Zod schemas and TypeScript types for all API entities |

---

## Quick Start

### As an MCP Server

Add to your Claude Code config (`.mcp.json`):

```json
{
  "mcpServers": {
    "envia": {
      "command": "node",
      "args": ["/path/to/envia-mcp/dist/index.js"],
      "env": {
        "ENVIA_API_KEY": "your-api-key"
      }
    }
  }
}
```

Or, if installed globally via npm:

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

### As a Client Library

```typescript
import { EnviaClient } from 'envia-mcp/client';

const client = new EnviaClient({
  apiKey: process.env.ENVIA_API_KEY!,
  shippingUrl: 'https://api.envia.com',
  queriesUrl: 'https://queries.envia.com',
  geocodesUrl: 'https://geocodes.envia.com',
});

// Get rates from all carriers, sorted by price
const quotes = await client.getQuotesAllCarriers(origin, destination, packages);

// Purchase a label (charges your prepaid balance in USD)
const label = await client.createLabel(origin, destination, packages, 'fedex', 'ground');

// Track a shipment
const tracking = await client.trackShipments(['TRACK123']);
```

---

## MCP Tools

The server exposes **7 tools** that AI agents can call:

| Tool | Description | Destructive |
|------|-------------|:-----------:|
| `envia_quote` | Get shipping rates from all carriers for a route | |
| `envia_create_label` | Purchase a shipping label (charges USD balance) | Yes |
| `envia_track` | Track one or more shipments by tracking number | |
| `envia_cancel` | Cancel a shipment and request refund | Yes |
| `envia_validate_zipcode` | Validate a Mexican postal code and get address info | |
| `envia_get_carriers` | List available carriers for a country | |
| `envia_get_services` | List services for a specific carrier | |

All tools return both **Markdown** (for display) and **structured data** (for programmatic use).

## MCP Resources

6 documentation resources provide AI agents with context about the Envia API:

| URI | Content |
|-----|---------|
| `envia://docs/overview` | API hosts, auth model, sandbox vs production |
| `envia://docs/address-format-mx` | Mexican address fields, state codes, colonia mapping |
| `envia://docs/carriers` | 34 carriers, service counts, weight limits |
| `envia://docs/rate-response` | Price breakdown, MXN currency, additional charges |
| `envia://docs/label-response` | USD currency, permanent label URLs, no idempotency |
| `envia://docs/errors` | Error codes and how to handle them |

## MCP Prompts

3 workflow prompts guide agents through multi-step tasks:

| Prompt | What It Does |
|--------|-------------|
| `diagnose-shipment` | Investigate tracking status, identify stuck/failed shipments |
| `compare-rates` | Quote all carriers for a route, compare price vs speed |
| `verify-address` | Validate a postal code, return neighborhoods and coordinates |

---

## Client API

The `EnviaClient` class provides typed methods for every Envia operation:

```typescript
import { EnviaClient } from 'envia-mcp/client';

const client = new EnviaClient({ apiKey, shippingUrl, queriesUrl, geocodesUrl });
```

| Method | Returns | Description |
|--------|---------|-------------|
| `getQuotes(origin, dest, packages, carrier)` | `RateQuoteItem[]` | Rates from one carrier |
| `getQuotesAllCarriers(origin, dest, packages)` | `RateQuoteItem[]` | Fan-out to all carriers, sorted by price |
| `createLabel(origin, dest, packages, carrier, service)` | `LabelItem` | Purchase a shipping label |
| `trackShipments(trackingNumbers)` | `TrackingItem[]` | Track one or more shipments |
| `cancelShipment(carrier, trackingNumber)` | `CancellationItem` | Cancel and request refund |
| `validateZipCode(postalCode, countryCode?)` | `PostalCodeItem[]` | Validate postal code (no auth needed) |
| `getCarriers(countryCode?)` | `Carrier[]` | List available carriers |
| `getServices(carrier, countryCode?)` | `CarrierService[]` | List services for a carrier |

---

## Envia API Gotchas

Things that will bite you if you're not careful:

| Gotcha | Details |
|--------|---------|
| **`phone_code` differs** | `"MX"` for rate quotes, `"52"` for labels |
| **Quotes are MXN, labels are USD** | Prepaid balance is denominated in USD |
| **Labels are NOT idempotent** | Duplicate call = double charge, different tracking number |
| **Sandbox geocodes is DOWN** | Always use production `geocodes.envia.com` |
| **Carrier is required per quote** | The client fans out automatically, but the raw API needs one carrier per call |
| **Track by tracking number** | `shipmentId` does NOT work as a tracking key |

---

## Configuration

The MCP server reads configuration from environment variables:

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `ENVIA_API_KEY` | Yes | — | Your Envia.com API key |
| `ENVIA_SHIPPING_URL` | | `https://api.envia.com` | Shipping API base URL |
| `ENVIA_QUERIES_URL` | | `https://queries.envia.com` | Queries API base URL |
| `ENVIA_GEOCODES_URL` | | `https://geocodes.envia.com` | Geocodes API base URL |

For sandbox testing, use `api-test.envia.com` and `queries-test.envia.com` (geocodes sandbox is down — use production).

---

## Development

```bash
# Clone and install
git clone https://github.com/amak07/envia-mcp.git
cd envia-mcp
npm install

# Build
npm run build

# Type check
npm run typecheck

# Run tests (30 unit tests, mocked API)
npm run test:run

# Dev mode (watch + restart)
npm run dev
```

### Project Structure

```
src/
  index.ts          # MCP server entry point (shebang, stdio transport)
  client.ts         # EnviaClient class (standalone, no MCP dependency)
  types.ts          # Zod schemas + TypeScript types for all API entities
  utils.ts          # HTTP helpers, error handling, formatting
  constants.ts      # API URLs, character limits, response format
  tools/
    quote.ts        # envia_quote — fan-out rate quoting
    create-label.ts # envia_create_label — label purchase
    track.ts        # envia_track — shipment tracking
    cancel.ts       # envia_cancel — shipment cancellation
    validate-zipcode.ts  # envia_validate_zipcode — postal code lookup
    get-carriers.ts # envia_get_carriers — carrier directory
    get-services.ts # envia_get_services — service catalog
    index.ts        # Barrel — registerAllTools()
  resources/
    index.ts        # 6 inline documentation resources
  prompts/
    index.ts        # 3 workflow prompts
  client.test.ts    # 30 unit tests (mocked fetch)
tests/
  fixtures/         # Real API response snapshots (JSON)
```

---

## Tech Stack

- **TypeScript** with strict mode
- **MCP SDK** `@modelcontextprotocol/sdk` 1.27+
- **Zod** for runtime schema validation
- **Native `fetch`** (Node.js 18+ built-in, no axios)
- **Vitest** for unit testing
- **ESM** (`"type": "module"`)

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built for <a href="https://github.com/Refacciones-Direct/refacciones-direct">RefaccionesDirect</a> — open-sourced for the MCP community.
</p>

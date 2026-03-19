<p align="center">
  <img src="enviacom_logo.jpg" alt="Envia.com logo" width="128" />
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
  Quote, label, track, and cancel shipments across <strong>170+ carriers in 18 countries</strong> — from AI agents or your own code.
</p>

---

## What's Inside

**Two exports, one package:**

| Export | Import | Use Case |
|--------|--------|----------|
| **MCP Server** | `envia-mcp` | AI agents (Claude Code, Claude Desktop, Cursor) interact with Envia via natural language |
| **Client Library** | `envia-mcp/client` | Node.js/TypeScript apps call the Envia API directly with full type safety |
| **Type Definitions** | `envia-mcp/types` | Zod schemas and TypeScript types for all API entities |

### Supported Countries

#### Americas

| Country | Code | Carriers | Notable Carriers |
|---------|:----:|:--------:|-----------------|
| Mexico | MX | 34 | DHL, FedEx, Estafeta, Paquetexpress, UPS |
| United States | US | 33 | FedEx, UPS, USPS, DHL, Sendle, LSO |
| Colombia | CO | 16 | FedEx, DHL, Coordinadora, Servientrega, TCC |
| Argentina | AR | 12 | Andreani, Correo Argentino, FedEx, DHL, OCA |
| Brazil | BR | 11 | Correios, FedEx, DHL, Jadlog, Loggi |
| Chile | CL | 10 | Chilexpress, Correos Chile, FedEx, DHL, Starken |
| Guatemala | GT | 7 | Cargo Expreso, DHL, Telomando |
| Canada | CA | 4 | Canada Post, Canpar, DHL, Purolator |
| Uruguay | UY | 3 | DHL, Treggo |
| Peru | PE | 1 | Olva |

#### Europe, Asia & Oceania

| Country | Code | Carriers | Notable Carriers |
|---------|:----:|:--------:|-----------------|
| Spain | ES | 16 | Correos, DHL, FedEx, GLS, SEUR, UPS |
| India | IN | 9 | BlueDart, Delhivery, FedEx, Aramex, Xpressbees |
| France | FR | 4 | Chronopost, Mondial Relay, UPS |
| Italy | IT | 4 | Poste Italiane, BRT, InPost, UPS |
| Australia | AU | 3 | Aramex, FedEx, Sendle |
| Hong Kong | HK | 1 | FedEx |
| Japan | JP | 1 | — |
| China | CN | 1 | — |

> Envia adds carriers and countries over time. Use `envia_get_carriers` to get the current list.

---

## Quick Start

### As an MCP Server

> The server connects to **Envia's sandbox** by default — no real charges, safe to experiment.

Add to your Claude Code config (`.mcp.json`):

```json
{
  "mcpServers": {
    "envia": {
      "command": "node",
      "args": ["/path/to/envia-mcp/dist/index.js"],
      "env": {
        "ENVIA_API_KEY": "your-sandbox-api-key"
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
        "ENVIA_API_KEY": "your-sandbox-api-key"
      }
    }
  }
}
```

### As a Client Library

```typescript
import { EnviaClient } from 'envia-mcp/client';

// Sandbox (default — safe for testing)
const client = new EnviaClient({
  apiKey: process.env.ENVIA_API_KEY!,
  shippingUrl: 'https://api-test.envia.com',
  queriesUrl: 'https://queries-test.envia.com',
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
| `envia_validate_zipcode` | Validate a postal code and get address info | |
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
| **`phone_code` differs** | Country code string for quotes (e.g. `"MX"`), dialing code for labels (e.g. `"52"`) |
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
| `ENVIA_SHIPPING_URL` | | `https://api-test.envia.com` | Shipping API base URL |
| `ENVIA_QUERIES_URL` | | `https://queries-test.envia.com` | Queries API base URL |
| `ENVIA_GEOCODES_URL` | | `https://geocodes.envia.com` | Geocodes API base URL |

## Sandbox vs Production

**The server defaults to Envia's sandbox environment.** This is intentional.

The `envia_create_label` tool purchases real shipping labels — it costs money and is **not idempotent** (calling it twice creates two labels with different tracking numbers, charged twice). AI agents can trigger this tool multiple times during a conversation, and there is no undo. Defaulting to sandbox prevents accidental charges during development, testing, and experimentation.

This follows industry best practice: [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp) recommends "never connect to production"; [Stripe](https://docs.stripe.com/keys) separates test/live keys; [Slack MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/slack) disables destructive operations by default.

### Switching to production

To use the live Envia API, set the URL environment variables to production hosts:

```json
{
  "mcpServers": {
    "envia": {
      "command": "node",
      "args": ["/path/to/envia-mcp/dist/index.js"],
      "env": {
        "ENVIA_API_KEY": "your-production-api-key",
        "ENVIA_SHIPPING_URL": "https://api.envia.com",
        "ENVIA_QUERIES_URL": "https://queries.envia.com"
      }
    }
  }
}
```

**Important notes:**
- Sandbox and production use **separate API keys** — a sandbox key won't work on production and vice versa
- Geocodes (`geocodes.envia.com`) always uses production — the sandbox geocodes endpoint is down (503)
- The server logs `(sandbox)` or `(PRODUCTION)` on startup so you always know which environment you're hitting

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

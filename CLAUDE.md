# envia-mcp — Envia.com MCP Server & Client Library

## Tech Stack

- **Runtime:** Node.js 22+ (ESM)
- **Language:** TypeScript (strict mode)
- **MCP SDK:** @modelcontextprotocol/sdk
- **Validation:** Zod
- **HTTP:** Native fetch (no axios)
- **Testing:** Vitest

## Commands

- `npm run build` — Compile TypeScript to dist/
- `npm run typecheck` — Type check without emitting
- `npm run test` — Vitest (watch mode)
- `npm run test:run` — Vitest (single run)
- `npm run dev` — Run server with tsx watch
- `npm run start` — Run compiled server

## Architecture

Two exports from one package:

1. **`envia-mcp`** — MCP server entry point (`src/index.ts`)
   - 7 tools (quote, create-label, track, cancel, validate-zipcode, get-carriers, get-services)
   - 6 resources (API docs as markdown)
   - 3 prompts (diagnose-shipment, compare-rates, verify-address)

2. **`envia-mcp/client`** — Standalone client (`src/client.ts`)
   - `EnviaClient` class with typed methods
   - Zero MCP dependency

3. **`envia-mcp/types`** — TypeScript types + Zod schemas (`src/types.ts`)

## Key Patterns

- Tools return both `content[].text` AND `structuredContent`
- All tools support `response_format` (markdown/json)
- Input schemas use `.strict()` enforcement
- MCP resources are inline template literals (no file I/O)
- Geocodes API needs no auth — sandbox is DOWN, always use production
- Quote prices: MXN. Label prices: **USD**
- `phone_code`: "MX" for quotes, "52" for labels

## Windows MINGW64 Note

Use `npm.cmd` / `npx.cmd` instead of `npm` / `npx` on this machine.

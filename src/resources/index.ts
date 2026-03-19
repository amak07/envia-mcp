/**
 * MCP Resources — static documentation for AI agent context.
 * Content is inline as template literals (no runtime file I/O).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const OVERVIEW_CONTENT = `# Envia.com API Overview

## What Is Envia?
Envia is a Mexican shipping aggregator that provides a single API to access 34+ carriers (DHL, FedEx, Estafeta, Paquetexpress, and more). One API key, one integration, access to all carriers.

## Three Separate API Hosts

| API | Base URL | Auth Required | Purpose |
|-----|----------|---------------|---------|
| **Shipping API** | \`api.envia.com\` | Yes (Bearer token) | Quotes, labels, tracking, cancellation |
| **Queries API** | \`queries.envia.com\` | Yes (Bearer token) | Carrier lists, service lists, countries, states |
| **Geocodes API** | \`geocodes.envia.com\` | **No** | Postal code validation, neighborhood lookup |

All three share the same API key (for Shipping + Queries), but are hosted on different domains.

## Authentication
- Header: \`Authorization: Bearer <API_KEY>\`
- Same key works for both Shipping and Queries APIs
- Geocodes API requires **no authentication at all**

## Sandbox vs Production
- Sandbox: \`api-test.envia.com\`, \`queries-test.envia.com\`
- Production: \`api.envia.com\`, \`queries.envia.com\`
- **Important:** Sandbox geocodes is DOWN (503). Always use production \`geocodes.envia.com\`
- Sandbox and production use **separate API keys** (not shared)

## Pricing Model
- Free platform access
- Pay-per-label from prepaid balance (denominated in USD)
- Quote prices are in MXN, but label charges are in **USD**
`;

const ADDRESS_MX_CONTENT = `# Mexican Address Format for Envia API

## Required Fields (Rate Quotes)
| Field | Description | Example |
|-------|-------------|---------|
| \`name\` | Contact name | "Juan Pérez" |
| \`company\` | Company name (can be empty) | "Refacciones Norte S.A." |
| \`phone\` | 10-digit number (no country code) | "8118765432" |
| \`phone_code\` | **"MX" for quotes, "52" for labels** | "MX" |
| \`email\` | Email address | "juan@example.com" |
| \`street\` | Street name (no number) | "Av. Industrial" |
| \`number\` | Exterior/street number | "2500" |
| \`district\` | Colonia / neighborhood | "Parque Industrial" |
| \`city\` | City or municipio | "Monterrey" |
| \`state\` | 2-letter state code | "NL" |
| \`country\` | Country code | "MX" |
| \`postalCode\` | 5-digit postal code | "64000" |
| \`reference\` | Delivery reference (can be empty) | "Bodega 12" |

## Additional Fields for Labels
| Field | Description |
|-------|-------------|
| \`type\` | "origin" or "destination" |
| \`identificationNumber\` | RFC / tax ID (use "XAXX010101000" for general public) |

## State Codes (2-digit)
Common codes: NL (Nuevo León), CX/CMX (CDMX), JA/JAL (Jalisco), BC (Baja California), YUC (Yucatán), OAX (Oaxaca), QR (Quintana Roo)

**Note:** The Geocodes API returns state codes in the \`state.code.2digit\` field. The Queries API returns them in \`code_2_digits\`. Both return the same values.

## Colonia (Neighborhood)
- In the API, colonia maps to the \`district\` field
- The Geocodes API returns available colonias in the \`suburbs\` array
- Colonia is critical for Mexican deliveries — carriers use it for routing
`;

const CARRIERS_CONTENT = `# Envia Carrier Reference

## Overview
Mexico has **34 carriers** available through Envia. Each carrier has different service levels, weight limits, and pickup capabilities.

## Major Carriers
| Carrier | Endpoint String | Services | Box Weight Limit |
|---------|----------------|----------|-----------------|
| DHL | \`dhl\` | 31 | Varies |
| FedEx | \`fedex\` | 130 | Varies |
| Estafeta | \`estafeta\` | 8 | Varies |
| Paquetexpress | \`paquetexpress\` | 6 | Varies |
| Castores | \`castores\` | 1 | Varies |

## Carrier String
The \`endpoint\` field from the carriers API is the string used in rate/label requests. Always use lowercase (e.g., "dhl", "fedex", "estafeta").

## Service Levels
Each carrier offers different service levels (ground, express, next-day, etc.). Use \`envia_get_services\` to list services for a specific carrier.

## Pickup Windows
Some carriers support same-day pickup. Check the \`pickup_sameday\`, \`pickup_start_time\`, and \`pickup_end_time\` fields from the carrier list.

## Weight Limits
Each carrier has box and pallet weight limits. Use \`envia_get_carriers\` to check the \`box_weight_limit\` and \`pallet_weight_limit\` fields.
`;

const RATE_RESPONSE_CONTENT = `# Envia Rate Response Format

## Price Breakdown
Each rate quote contains a detailed price breakdown:

| Field | Description |
|-------|-------------|
| \`basePrice\` | Base shipping rate in MXN |
| \`additionalCharges\` | Sum of fuel surcharge + green tax + extended zone |
| \`taxes\` | Tax amount |
| \`totalPrice\` | Final price: basePrice + additionalCharges + taxes |
| \`currency\` | Always "MXN" for rate quotes |

## Additional Charges Detail
Found in \`costSummary[0].costAdditionalCharges\` array:

| Charge Type | Translation Tag Contains |
|-------------|------------------------|
| Fuel surcharge | "fuel" or "combustible" |
| Green tax | "green" or "verde" |
| Extended zone | "extended" or "zona" |

## Key Facts
- **Currency is always MXN** for rate quotes
- \`declaredValue\` does NOT affect pricing (insurance stays 0)
- Carrier field is REQUIRED per API call — to compare all carriers, the tool fans out internally
- Quotes are ephemeral — no TTL, no expiry, no quote ID
- Multi-package saves ~35% (use the client library directly for multi-package)
- \`basePrice + additionalCharges = totalPrice\` (before taxes)
`;

const LABEL_RESPONSE_CONTENT = `# Envia Label Response Format

## Response Fields
| Field | Description |
|-------|-------------|
| \`shipmentId\` | Unique shipment identifier |
| \`trackingNumber\` | Carrier tracking number |
| \`trackUrl\` | Envia tracking page URL |
| \`label\` | **Permanent S3 URL** to label PDF — no expiry |
| \`totalPrice\` | Amount charged in **USD** (not MXN!) |
| \`currentBalance\` | Remaining prepaid balance in USD |
| \`currency\` | Always "USD" for labels |

## Critical Differences from Quotes
- **Currency is USD**, not MXN (prepaid balance is in USD)
- \`phone_code\` must be "52" (not "MX" like quotes)
- Origin needs \`type: "origin"\`, destination needs \`type: "destination"\`
- Origin needs \`identificationNumber\` (RFC / tax ID)

## No Idempotency
**WARNING:** Calling the label endpoint twice with identical data creates TWO separate labels:
- Different tracking numbers
- Charged twice
- No deduplication mechanism

Always confirm with the user before creating a label.

## Label URLs
- Permanent S3 links — no signed parameters, no expiry
- Safe to store the URL directly (no need to download/re-host)
- PDF format is recommended (ZPL may still return PDF)

## Multi-Package Labels
- Multiple packages in one shipment share ONE tracking number
- One label covers all packages
`;

const ERRORS_CONTENT = `# Envia API Error Reference

## HTTP Status Errors
| Status | Meaning | How to Handle |
|--------|---------|---------------|
| 400 | Missing/invalid required field | Check carrier, address, and package fields |
| 403 | Invalid API key | Verify ENVIA_API_KEY is set correctly |
| 429 | Rate limit exceeded | Wait before making more requests |
| 5xx | Server error | Retry after a few moments |

## Envia-Specific Error Codes
| Code | Context | Message | Action |
|------|---------|---------|--------|
| 1115 | Cancel | "Shipment is already canceled" | Safe to ignore — cancellation was already done |
| 1125 | Track | "No shipments found for the tracking numbers" | Invalid or unrecognized tracking number |

## Common Mistakes
1. **Missing carrier in rate request** — Carrier is required per API call. The \`envia_quote\` tool handles this automatically by fanning out.
2. **Using "MX" as phone_code for labels** — Must be "52" for labels (not "MX" like quotes)
3. **Expecting MXN for label prices** — Labels charge in USD, not MXN
4. **Tracking by shipment ID** — Must use trackingNumber, not shipmentId
5. **Using sandbox geocodes** — Sandbox geocodes is DOWN (503). Always use production geocodes.envia.com

## Error Response Shape
\`\`\`json
{
  "meta": "error",
  "error": {
    "code": 1125,
    "description": "Not found",
    "message": "No shipments found for the tracking numbers"
  }
}
\`\`\`
`;

export function registerAllResources(server: McpServer): void {
  const resources: Array<{
    name: string;
    uri: string;
    description: string;
    content: string;
  }> = [
    {
      name: 'Envia API Overview',
      uri: 'envia://docs/overview',
      description: 'What Envia is, 3 API hosts, sandbox vs production, auth model',
      content: OVERVIEW_CONTENT,
    },
    {
      name: 'Mexico Address Format',
      uri: 'envia://docs/address-format-mx',
      description: 'Required fields, state codes (2-digit), colonia/suburbs mapping',
      content: ADDRESS_MX_CONTENT,
    },
    {
      name: 'Carrier Reference',
      uri: 'envia://docs/carriers',
      description: '34 carriers, service counts, weight limits, pickup windows',
      content: CARRIERS_CONTENT,
    },
    {
      name: 'Rate Response Format',
      uri: 'envia://docs/rate-response',
      description: 'Price breakdown, costSummary, additionalCharges, MXN currency',
      content: RATE_RESPONSE_CONTENT,
    },
    {
      name: 'Label Response Format',
      uri: 'envia://docs/label-response',
      description: 'USD currency, permanent S3 URLs, no idempotency, tracking numbers',
      content: LABEL_RESPONSE_CONTENT,
    },
    {
      name: 'Error Reference',
      uri: 'envia://docs/errors',
      description: 'Error codes 400, 1115, 1125, and how to handle them',
      content: ERRORS_CONTENT,
    },
  ];

  for (const resource of resources) {
    server.resource(resource.name, resource.uri, { description: resource.description, mimeType: 'text/markdown' }, async () => ({
      contents: [
        {
          uri: resource.uri,
          mimeType: 'text/markdown' as const,
          text: resource.content,
        },
      ],
    }));
  }
}

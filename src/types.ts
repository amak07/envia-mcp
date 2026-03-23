/**
 * TypeScript types and Zod schemas for the Envia API.
 * Adapted from exploration test suite schemas (validated against 46 real API snapshots).
 *
 * Three schema categories:
 * 1. Client types — used by EnviaClient methods
 * 2. API response schemas — validate raw API responses
 * 3. MCP schemas — flat input/output schemas for MCP tools
 */

import { z } from 'zod';
import { ResponseFormat } from './constants.js';

// ════════════════════════════════════════════════════════════════════════════════
// 1. CLIENT TYPES
// ════════════════════════════════════════════════════════════════════════════════

/** Options for retry behavior on transient errors (429, 5xx) */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/** Configuration for the Envia client */
export interface EnviaClientConfig {
  apiKey: string;
  shippingUrl: string;
  queriesUrl: string;
  geocodesUrl: string;
  /** Default currency for rate quotes and labels (default: 'MXN'). API defaults to USD if omitted. */
  defaultCurrency?: string;
  /** Retry options for transient errors (default: 3 retries, 500ms base delay) */
  retry?: RetryOptions;
}

/** Address for rate quote requests (phone_code: "MX") */
export interface EnviaAddress {
  name: string;
  company: string;
  phone: string;
  phone_code: string;
  email: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  reference: string;
}

/** Address for label requests (phone_code: "52", adds type + RFC) */
export interface EnviaLabelAddress extends EnviaAddress {
  type: 'origin' | 'destination';
  identificationNumber: string;
}

/** Package for rate quote requests */
export interface EnviaPackage {
  content: string;
  amount: number;
  type: string;
  weight: number;
  insurance: number;
  declaredValue: number;
  weightUnit: string;
  lengthUnit: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

/** Package for label requests (adds name) */
export interface EnviaLabelPackage extends EnviaPackage {
  name: string;
}

/** Label print options */
export interface LabelOptions {
  printFormat?: 'PDF' | 'ZPL';
  printSize?: 'STOCK_4X6' | 'PAPER_8.5X11';
}

/** Request body for scheduling a carrier pickup */
export interface PickupRequest {
  origin: EnviaAddress;
  carrier: string;
  trackingNumbers: string[];
  date: string;
  timeFrom: number;
  timeTo: number;
  totalWeight: number;
  totalPackages: number;
  instructions?: string;
}

/** Options for HS code classification */
export interface HsCodeOptions {
  hsCodeProvided?: string;
  shipToCountries?: string[];
  includeAlternatives?: boolean;
}

/** Request body for generating a commercial invoice */
export interface CommercialInvoiceRequest {
  origin: EnviaAddress;
  destination: EnviaAddress;
  carrier: string;
  packages: CommercialInvoicePackage[];
  customsSettings: {
    dutiesPaymentEntity: string;
    exportReason: string;
  };
}

/** Package with customs items for commercial invoices */
export interface CommercialInvoicePackage extends EnviaPackage {
  items: {
    description: string;
    hsCode: string;
    quantity: number;
    price: number;
    countryOfManufacture: string;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. API RESPONSE SCHEMAS (validate raw Envia API responses)
// ════════════════════════════════════════════════════════════════════════════════

// ─── Carriers (Queries API) ───

export const CarrierSchema = z.object({
  id: z.number(),
  name: z.string(),
  endpoint: z.string(),
  country_code: z.string(),
  track_url: z.string().nullable(),
  logo: z.string().nullable(),
  box_weight_limit: z.number(),
  pallet_weight_limit: z.number().nullable(),
  pickup_sameday: z.number(),
  pickup_sameday_limit_time: z.number().nullable(),
  pickup_span_time: z.number().nullable(),
  pickup_start_time: z.number().nullable(),
  pickup_end_time: z.number().nullable(),
});

export type Carrier = z.infer<typeof CarrierSchema>;

export const CarrierServiceSchema = z.object({
  service_id: z.number(),
  carrier_name: z.string(),
  country_code: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  description: z.string(),
  delivery_estimate: z.string(),
  cash_on_delivery: z.number(),
  drop_off: z.number(),
  active: z.number(),
});

export type CarrierService = z.infer<typeof CarrierServiceSchema>;

// ─── Postal Code (Geocodes API) ───

export const PostalCodeStateCodeSchema = z.object({
  '1digit': z.string().nullable(),
  '2digit': z.string(),
  '3digit': z.string(),
});

export const PostalCodeItemSchema = z.object({
  zip_code: z.string(),
  country: z.object({
    name: z.string(),
    code: z.string(),
  }),
  state: z.object({
    name: z.string(),
    iso_code: z.string(),
    code: PostalCodeStateCodeSchema,
  }),
  locality: z.string(),
  additional_info: z.object({ street: z.string().nullable() }),
  suburbs: z.array(z.string()),
  coordinates: z.object({
    latitude: z.string(),
    longitude: z.string(),
  }),
  info: z.object({
    stat: z.string(),
    stat_8digit: z.string(),
    time_zone: z.string(),
    utc: z.string(),
  }),
  regions: z.object({
    region_1: z.string(),
    region_2: z.string(),
    region_3: z.string(),
    region_4: z.string(),
  }),
});

export type PostalCodeItem = z.infer<typeof PostalCodeItemSchema>;

export const PostalCodeResponseSchema = z.array(PostalCodeItemSchema);

// ─── Rate Quoting (Shipping API) ───

export const AdditionalChargeSchema = z.object({
  id: z.number(),
  addToInvoice: z.number(),
  conceptId: z.number(),
  additionalService: z.string(),
  translationTag: z.string(),
  amount: z.number(),
  commission: z.number(),
  taxes: z.number(),
  cost: z.number(),
  value: z.number(),
});

export const CostSummarySchema = z.object({
  quantity: z.number(),
  basePrice: z.number(),
  basePriceTaxes: z.number(),
  extendedFare: z.number(),
  insurance: z.number(),
  additionalServices: z.number(),
  additionalServicesTaxes: z.number(),
  additionalCharges: z.number(),
  additionalChargesTaxes: z.number(),
  taxes: z.number(),
  totalPrice: z.number(),
  costAdditionalServices: z.array(z.unknown()),
  costAdditionalCharges: z.array(AdditionalChargeSchema),
  currency: z.string(),
});

export const RateQuoteItemSchema = z.object({
  carrierId: z.number(),
  carrier: z.string(),
  carrierDescription: z.string(),
  serviceId: z.number(),
  service: z.string(),
  serviceDescription: z.string(),
  dropOff: z.number(),
  branchType: z.unknown().nullable(),
  zone: z.number(),
  deliveryEstimate: z.string(),
  deliveryDate: z.object({
    date: z.string(),
    dateDifference: z.number(),
    timeUnit: z.string(),
    time: z.string(),
  }),
  quantity: z.number(),
  basePrice: z.number(),
  basePriceTaxes: z.number(),
  extendedFare: z.number(),
  insurance: z.number(),
  additionalServices: z.number(),
  additionalServicesTaxes: z.number(),
  additionalCharges: z.number(),
  additionalChargesTaxes: z.number(),
  importFee: z.number(),
  customKeyCost: z.number(),
  taxes: z.number(),
  totalPrice: z.number(),
  currency: z.string(),
  smsCost: z.number(),
  whatsappCost: z.number(),
  customKey: z.boolean(),
  cashOnDeliveryCommission: z.number(),
  cashOnDeliveryAmount: z.number(),
  calculatedDeclaredValue: z.number(),
  isMps: z.boolean(),
  shipmentTaxes: z.array(z.unknown()),
  branches: z.array(z.unknown()),
  costSummary: z.array(CostSummarySchema),
  packageDetails: z.object({
    totalWeight: z.number(),
    weightUnit: z.string(),
    details: z.array(
      z.object({
        appliedWeightType: z.string(),
        weightUnit: z.string(),
        weight: z.number(),
        content: z.string(),
      }),
    ),
  }),
  landedCostId: z.unknown().nullable(),
  classifiedHsCodes: z.array(z.unknown()),
  landedCostTotal: z.unknown().nullable(),
});

export type RateQuoteItem = z.infer<typeof RateQuoteItemSchema>;

export const RateResponseSchema = z.object({
  meta: z.literal('rate'),
  data: z.array(RateQuoteItemSchema),
});

// ─── Label Generation (Shipping API) ───

export const LabelPackageSchema = z.object({
  trackingNumber: z.string(),
  trackUrl: z.string(),
  content: z.string(),
  weight: z.number(),
  weightUnit: z.string(),
});

export const LabelItemSchema = z.object({
  carrier: z.string(),
  service: z.string(),
  shipmentId: z.number(),
  trackingNumber: z.string(),
  folio: z.string(),
  trackUrl: z.string(),
  label: z.string(),
  packages: z.array(LabelPackageSchema),
  additionalFiles: z.array(z.unknown()),
  totalPrice: z.number(),
  currentBalance: z.number(),
  currency: z.string(),
});

export type LabelItem = z.infer<typeof LabelItemSchema>;

export const LabelResponseSchema = z.object({
  meta: z.literal('generate'),
  data: z.array(LabelItemSchema),
});

// ─── Tracking (Shipping API) ───

export const TrackingContentSchema = z.object({
  tracking_number: z.string(),
  status_parent_id: z.number(),
  parentStatusBackgroundColor: z.string(),
  parentStatusTextColor: z.string(),
  status_translation_tag: z.string(),
  class_name: z.string(),
  status: z.string(),
  content: z.string(),
  type: z.string(),
  length: z.number(),
  width: z.number(),
  height: z.number(),
  weight: z.number(),
  totalWeight: z.number(),
  weightUnit: z.string(),
  lengthUnit: z.string(),
  originalRequest: z.boolean(),
});

export const TrackingItemSchema = z.object({
  company: z.string(),
  companyId: z.number(),
  carrier: z.string(),
  carrierId: z.number(),
  carrierDescription: z.string(),
  service: z.string(),
  serviceDescription: z.string(),
  country: z.string(),
  localeId: z.number(),
  trackingNumber: z.string(),
  folio: z.string().nullable(),
  cashOnDelivery: z.boolean(),
  accountShipment: z.string(),
  trackUrl: z.string(),
  trackUrlSite: z.string(),
  status: z.string(),
  statusColor: z.string(),
  estimatedDelivery: z.string().nullable(),
  pickupDate: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  signedBy: z.string().nullable(),
  informationDetail: z.string().nullable(),
  createdAt: z.string(),
  destination: z.object({
    name: z.string(),
    company: z.string().nullable(),
    email: z.string(),
    phone: z.string(),
    street: z.string(),
    number: z.string(),
    district: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    branchInfo: z.unknown().nullable(),
  }),
  content: TrackingContentSchema,
  eventHistory: z.array(z.unknown()),
  companyInfo: z.object({
    name: z.string(),
    color: z.string().nullable(),
    logo: z.string().nullable(),
  }),
  additionalFolios: z.array(z.unknown()),
  podFile: z.string().nullable(),
  podEvidences: z.array(z.unknown()),
  packages: z.array(TrackingContentSchema),
  parentTrackingNumber: z.string(),
});

export type TrackingItem = z.infer<typeof TrackingItemSchema>;

export const TrackingResponseSchema = z.object({
  meta: z.literal('generaltrack'),
  data: z.array(TrackingItemSchema),
});

// ─── Cancellation (Shipping API) ───

export const CancellationItemSchema = z.object({
  carrier: z.string(),
  service: z.string(),
  trackingNumber: z.string(),
  folio: z.string().nullable(),
  ecommerce: z.unknown().nullable(),
  refundedAmount: z.number(),
  currency: z.string(),
  balanceReturned: z.number(),
  balanceReturnDate: z.string().nullable(),
});

export type CancellationItem = z.infer<typeof CancellationItemSchema>;

export const CancellationResponseSchema = z.object({
  meta: z.literal('cancel'),
  data: z.array(CancellationItemSchema),
});

// ─── Shipment History (Queries API) ───

export const ShipmentHistoryItemSchema = z
  .object({
    trackingNumber: z.string(),
    carrier: z.string(),
    service: z.string().optional(),
    status: z.string(),
    originCity: z.string().optional(),
    destinationCity: z.string().optional(),
    totalPrice: z.number().optional(),
    currency: z.string().optional(),
    label: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type ShipmentHistoryItem = z.infer<typeof ShipmentHistoryItemSchema>;

// ─── Pickup (Shipping API) ───

export const PickupResultSchema = z
  .object({
    confirmation: z.string().optional(),
    carrier: z.string(),
    date: z.string(),
    timeFrom: z.number(),
    timeTo: z.number(),
    status: z.string().optional(),
  })
  .passthrough();

export type PickupResult = z.infer<typeof PickupResultSchema>;

// ─── HS Code Classification (Shipping API) ───

export const HsCodeClassificationSchema = z
  .object({
    hsCode: z.string(),
    description: z.string().optional(),
    confidenceScore: z.number().optional(),
    alternatives: z.array(z.string()).optional(),
  })
  .passthrough();

export type HsCodeClassification = z.infer<typeof HsCodeClassificationSchema>;

// ─── Commercial Invoice (Shipping API) ───

export const CommercialInvoiceResultSchema = z
  .object({
    invoiceNumber: z.string().optional(),
    invoiceUrl: z.string().optional(),
    invoiceId: z.string().optional(),
  })
  .passthrough();

export type CommercialInvoiceResult = z.infer<typeof CommercialInvoiceResultSchema>;

// ─── City Lookup (Geocodes API) ───

export const CityLookupItemSchema = z
  .object({
    city: z.string(),
    state: z.string().optional(),
    postalCodes: z.array(z.string()).optional(),
    regions: z.record(z.string()).optional(),
  })
  .passthrough();

export type CityLookupItem = z.infer<typeof CityLookupItemSchema>;

// ─── Available Carriers (Queries API) ───

export const AvailableCarrierSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    country_code: z.string(),
    logo: z.string().optional(),
  })
  .passthrough();

export type AvailableCarrier = z.infer<typeof AvailableCarrierSchema>;

// ─── Error Response ───

export const ApiErrorSchema = z.object({
  meta: z.literal('error'),
  error: z.object({
    code: z.number(),
    description: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ════════════════════════════════════════════════════════════════════════════════
// 3. MCP TOOL SCHEMAS (flat inputs for LLM consumption, clean outputs)
// ════════════════════════════════════════════════════════════════════════════════

// ─── Shared field for response format ───

const responseFormatField = z
  .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

// ─── envia_quote ───

export const EnviaQuoteInputSchema = z.object({
  origin_name: z.string().describe('Sender contact name'),
  origin_company: z.string().optional().describe('Sender company name'),
  origin_street: z.string().describe('Street name (no number)'),
  origin_street_number: z.string().describe('Exterior/street number'),
  origin_neighborhood: z.string().describe('Colonia / neighborhood (maps to "district" in API)'),
  origin_city: z.string().describe('City or municipio'),
  origin_state: z.string().describe('2-letter state code: NL, CX, JA, BC, etc.'),
  origin_postal_code: z.string().describe('5-digit Mexican postal code'),
  origin_phone: z.string().describe('10-digit phone number (no country code)'),
  origin_email: z.string().describe('Email address'),

  dest_name: z.string().describe('Recipient contact name'),
  dest_company: z.string().optional().describe('Recipient company name'),
  dest_street: z.string().describe('Street name (no number)'),
  dest_street_number: z.string().describe('Exterior/street number'),
  dest_neighborhood: z.string().describe('Colonia / neighborhood'),
  dest_city: z.string().describe('City or municipio'),
  dest_state: z.string().describe('2-letter state code: NL, CX, JA, BC, etc.'),
  dest_postal_code: z.string().describe('5-digit Mexican postal code'),
  dest_phone: z.string().describe('10-digit phone number (no country code)'),
  dest_email: z.string().describe('Email address'),

  package_weight_kg: z.number().describe('Package weight in kilograms'),
  package_length_cm: z.number().describe('Package length in centimeters'),
  package_width_cm: z.number().describe('Package width in centimeters'),
  package_height_cm: z.number().describe('Package height in centimeters'),
  package_contents: z.string().describe('Description of contents (e.g., "Brake pads")'),
  declared_value_mxn: z
    .number()
    .optional()
    .default(0)
    .describe('Declared value in MXN (does NOT affect price — insurance is always 0)'),

  carrier: z
    .string()
    .optional()
    .describe('Carrier string: dhl, fedex, estafeta, paquetexpress, etc. Omit to quote all carriers.'),

  response_format: responseFormatField,
}).strict();

export type EnviaQuoteInput = z.infer<typeof EnviaQuoteInputSchema>;

export const EnviaQuoteOutputSchema = z.object({
  total: z.number().describe('Total number of rate options found'),
  count: z.number().describe('Number returned in this response'),
  quotes: z.array(
    z.object({
      carrier: z.string(),
      service: z.string(),
      service_description: z.string(),
      delivery_days: z.number(),
      base_price_mxn: z.number(),
      additional_charges: z.object({
        fuel: z.number(),
        green_tax: z.number(),
        extended_zone: z.number(),
      }),
      total_price_mxn: z.number(),
      currency: z.literal('MXN'),
    }),
  ),
  truncated: z.boolean(),
});

export type EnviaQuoteOutput = z.infer<typeof EnviaQuoteOutputSchema>;

// ─── envia_create_label ───

export const EnviaCreateLabelInputSchema = z.object({
  origin_name: z.string().describe('Sender contact name'),
  origin_company: z.string().optional().describe('Sender company name'),
  origin_street: z.string().describe('Street name'),
  origin_street_number: z.string().describe('Exterior/street number'),
  origin_neighborhood: z.string().describe('Colonia / neighborhood'),
  origin_city: z.string().describe('City or municipio'),
  origin_state: z.string().describe('2-letter state code'),
  origin_postal_code: z.string().describe('5-digit postal code'),
  origin_phone: z.string().describe('10-digit phone number'),
  origin_email: z.string().describe('Email address'),
  origin_rfc: z
    .string()
    .optional()
    .default('XAXX010101000')
    .describe('RFC / tax ID. Use XAXX010101000 for general public.'),

  dest_name: z.string().describe('Recipient contact name'),
  dest_company: z.string().optional().describe('Recipient company name'),
  dest_street: z.string().describe('Street name'),
  dest_street_number: z.string().describe('Exterior/street number'),
  dest_neighborhood: z.string().describe('Colonia / neighborhood'),
  dest_city: z.string().describe('City or municipio'),
  dest_state: z.string().describe('2-letter state code'),
  dest_postal_code: z.string().describe('5-digit postal code'),
  dest_phone: z.string().describe('10-digit phone number'),
  dest_email: z.string().describe('Email address'),

  package_name: z.string().describe('Short name for the package'),
  package_weight_kg: z.number().describe('Package weight in kilograms'),
  package_length_cm: z.number().describe('Package length in centimeters'),
  package_width_cm: z.number().describe('Package width in centimeters'),
  package_height_cm: z.number().describe('Package height in centimeters'),
  package_contents: z.string().describe('Description of contents'),
  declared_value_mxn: z.number().optional().default(0).describe('Declared value in MXN'),

  carrier: z.string().describe('Carrier string from quote response (e.g., "dhl")'),
  service: z.string().describe('Service string from quote response (e.g., "ground")'),

  print_format: z
    .enum(['PDF', 'ZPL'])
    .optional()
    .default('PDF')
    .describe('Label format. PDF recommended — ZPL may return PDF regardless.'),
  print_size: z
    .enum(['STOCK_4X6', 'PAPER_8.5X11'])
    .optional()
    .default('STOCK_4X6')
    .describe('Label paper size'),

  response_format: responseFormatField,
}).strict();

export type EnviaCreateLabelInput = z.infer<typeof EnviaCreateLabelInputSchema>;

export const EnviaCreateLabelOutputSchema = z.object({
  shipment_id: z.number(),
  tracking_number: z.string(),
  track_url: z.string(),
  label_url: z.string(),
  total_price_usd: z.number(),
  current_balance_usd: z.number(),
  carrier: z.string(),
  service: z.string(),
  currency: z.literal('USD'),
});

export type EnviaCreateLabelOutput = z.infer<typeof EnviaCreateLabelOutputSchema>;

// ─── envia_track ───

export const EnviaTrackInputSchema = z.object({
  tracking_numbers: z
    .string()
    .describe(
      'Comma-separated tracking numbers (e.g., "2456698904,2456699011"). Supports batch tracking.',
    ),
  response_format: responseFormatField,
}).strict();

export type EnviaTrackInput = z.infer<typeof EnviaTrackInputSchema>;

export const EnviaTrackOutputSchema = z.object({
  total: z.number(),
  shipments: z.array(
    z.object({
      tracking_number: z.string(),
      carrier: z.string(),
      status: z.string(),
      status_date: z.string(),
      track_url: z.string(),
      track_url_site: z.string(),
      event_history: z.array(z.unknown()),
      pod_file: z.string().nullable(),
      folio: z.string().nullable(),
    }),
  ),
});

export type EnviaTrackOutput = z.infer<typeof EnviaTrackOutputSchema>;

// ─── envia_cancel ───

export const EnviaCancelInputSchema = z.object({
  carrier: z.string().describe('Carrier string (e.g., "dhl")'),
  tracking_number: z.string().describe('Tracking number of the shipment to cancel'),
  response_format: responseFormatField,
}).strict();

export type EnviaCancelInput = z.infer<typeof EnviaCancelInputSchema>;

export const EnviaCancelOutputSchema = z.object({
  tracking_number: z.string(),
  carrier: z.string(),
  status: z.literal('canceled'),
  refunded_amount: z.number(),
  balance_returned: z.number(),
  balance_return_date: z.string().nullable(),
});

export type EnviaCancelOutput = z.infer<typeof EnviaCancelOutputSchema>;

// ─── envia_validate_zipcode ───

export const EnviaValidateZipcodeInputSchema = z.object({
  postal_code: z.string().describe('5-digit Mexican postal code (e.g., "06700")'),
  country_code: z.string().optional().default('MX').describe('Country code (default: MX)'),
  response_format: responseFormatField,
}).strict();

export type EnviaValidateZipcodeInput = z.infer<typeof EnviaValidateZipcodeInputSchema>;

export const EnviaValidateZipcodeOutputSchema = z.object({
  valid: z.boolean(),
  postal_code: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  state_code_2digit: z.string().optional(),
  state_code_3digit: z.string().optional(),
  neighborhoods: z.array(z.string()).optional(),
  coordinates: z
    .object({
      latitude: z.string(),
      longitude: z.string(),
    })
    .optional(),
  timezone: z.string().optional(),
});

export type EnviaValidateZipcodeOutput = z.infer<typeof EnviaValidateZipcodeOutputSchema>;

// ─── envia_get_carriers ───

export const EnviaGetCarriersInputSchema = z.object({
  country_code: z
    .string()
    .optional()
    .default('MX')
    .describe('Country code (default: MX). Returns 34 carriers for Mexico.'),
  limit: z.number().int().min(1).max(50).default(20).describe('Maximum results to return'),
  offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
  response_format: responseFormatField,
}).strict();

export type EnviaGetCarriersInput = z.infer<typeof EnviaGetCarriersInputSchema>;

export const EnviaGetCarriersOutputSchema = z.object({
  total: z.number(),
  count: z.number(),
  offset: z.number(),
  carriers: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      endpoint: z.string(),
      country_code: z.string(),
      track_url: z.string(),
      logo: z.string(),
      box_weight_limit: z.number().nullable(),
      pallet_weight_limit: z.number().nullable(),
      pickup_sameday: z.boolean().nullable(),
      pickup_start_time: z.string().nullable(),
      pickup_end_time: z.string().nullable(),
      pickup_span_time: z.number().nullable(),
      pickup_sameday_limit_time: z.string().nullable(),
    }),
  ),
  has_more: z.boolean(),
  next_offset: z.number().optional(),
});

export type EnviaGetCarriersOutput = z.infer<typeof EnviaGetCarriersOutputSchema>;

// ─── envia_get_services ───

export const EnviaGetServicesInputSchema = z.object({
  carrier: z.string().describe('Carrier string (e.g., "dhl", "fedex", "estafeta")'),
  country_code: z.string().optional().default('MX').describe('Country code (default: MX)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum results to return'),
  offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
  response_format: responseFormatField,
}).strict();

export type EnviaGetServicesInput = z.infer<typeof EnviaGetServicesInputSchema>;

export const EnviaGetServicesOutputSchema = z.object({
  total: z.number(),
  count: z.number(),
  offset: z.number(),
  carrier: z.string(),
  services: z.array(
    z.object({
      service_id: z.number(),
      carrier_name: z.string(),
      name: z.string(),
      description: z.string(),
      delivery_estimate: z.string(),
      cash_on_delivery: z.boolean(),
      drop_off: z.boolean(),
      active: z.boolean(),
    }),
  ),
  has_more: z.boolean(),
  next_offset: z.number().optional(),
});

export type EnviaGetServicesOutput = z.infer<typeof EnviaGetServicesOutputSchema>;

// ─── envia_shipment_history ───

export const EnviaShipmentHistoryInputSchema = z.object({
  month: z.number().int().min(1).max(12).describe('Month (1-12)'),
  year: z.number().int().min(2020).describe('Year (2020 or later)'),
  response_format: responseFormatField,
}).strict();

export type EnviaShipmentHistoryInput = z.infer<typeof EnviaShipmentHistoryInputSchema>;

export const EnviaShipmentHistoryOutputSchema = z.object({
  total: z.number().describe('Total number of shipments found'),
  month: z.number(),
  year: z.number(),
  shipments: z.array(
    z.object({
      tracking_number: z.string(),
      carrier: z.string(),
      service: z.string().optional(),
      status: z.string(),
      origin_city: z.string().optional(),
      destination_city: z.string().optional(),
      total_price: z.number().optional(),
      currency: z.string().optional(),
      label_url: z.string().optional(),
      created_at: z.string().optional(),
    }),
  ),
});

export type EnviaShipmentHistoryOutput = z.infer<typeof EnviaShipmentHistoryOutputSchema>;

// ─── envia_schedule_pickup ───

export const EnviaSchedulePickupInputSchema = z.object({
  origin_name: z.string().describe('Sender contact name'),
  origin_company: z.string().optional().describe('Sender company name'),
  origin_street: z.string().describe('Street name'),
  origin_street_number: z.string().describe('Exterior/street number'),
  origin_neighborhood: z.string().describe('Colonia / neighborhood'),
  origin_city: z.string().describe('City or municipio'),
  origin_state: z.string().describe('2-letter state code'),
  origin_postal_code: z.string().describe('5-digit postal code'),
  origin_phone: z.string().describe('10-digit phone number'),
  origin_email: z.string().describe('Email address'),

  carrier: z.string().describe('Carrier string (e.g., "dhl", "fedex", "estafeta")'),
  tracking_numbers: z.string().describe('Comma-separated tracking numbers to pick up'),
  date: z.string().describe('Pickup date in YYYY-MM-DD format'),
  time_from: z.number().int().min(0).max(23).describe('Pickup window start hour (0-23)'),
  time_to: z.number().int().min(0).max(23).describe('Pickup window end hour (0-23)'),
  total_weight: z.number().describe('Total weight of all packages in kg'),
  total_packages: z.number().int().min(1).describe('Total number of packages'),
  instructions: z.string().optional().describe('Special pickup instructions (optional)'),

  response_format: responseFormatField,
}).strict();

export type EnviaSchedulePickupInput = z.infer<typeof EnviaSchedulePickupInputSchema>;

export const EnviaSchedulePickupOutputSchema = z.object({
  confirmation: z.string().optional(),
  carrier: z.string(),
  date: z.string(),
  time_from: z.number(),
  time_to: z.number(),
  status: z.string().optional(),
});

export type EnviaSchedulePickupOutput = z.infer<typeof EnviaSchedulePickupOutputSchema>;

// ─── envia_classify_hscode ───

export const EnviaClassifyHscodeInputSchema = z.object({
  description: z.string().describe('Product description to classify (e.g., "ceramic brake pads for automobiles")'),
  destination_countries: z.string().optional().describe('Comma-separated destination country codes (e.g., "US,CA")'),
  include_alternatives: z.boolean().optional().default(true).describe('Include alternative HS codes (default: true)'),
  response_format: responseFormatField,
}).strict();

export type EnviaClassifyHscodeInput = z.infer<typeof EnviaClassifyHscodeInputSchema>;

export const EnviaClassifyHscodeOutputSchema = z.object({
  hs_code: z.string(),
  description: z.string().optional(),
  confidence_score: z.number().optional(),
  alternatives: z.array(z.string()).optional(),
});

export type EnviaClassifyHscodeOutput = z.infer<typeof EnviaClassifyHscodeOutputSchema>;

// ─── envia_lookup_city ───

export const EnviaLookupCityInputSchema = z.object({
  city: z.string().describe('City name to search for (e.g., "Monterrey", "Guadalajara")'),
  country_code: z.string().optional().default('MX').describe('Country code (default: MX)'),
  response_format: responseFormatField,
}).strict();

export type EnviaLookupCityInput = z.infer<typeof EnviaLookupCityInputSchema>;

export const EnviaLookupCityOutputSchema = z.object({
  total: z.number().describe('Number of matching cities'),
  city_query: z.string(),
  cities: z.array(
    z.object({
      city: z.string(),
      state: z.string().optional(),
      postal_codes: z.array(z.string()).optional(),
      regions: z.record(z.string()).optional(),
    }),
  ),
});

export type EnviaLookupCityOutput = z.infer<typeof EnviaLookupCityOutputSchema>;

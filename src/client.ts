/**
 * Envia API client library — standalone, zero MCP dependency.
 * This is what applications import directly via `envia-mcp/client`.
 *
 * Adapted from exploration helpers/fixtures.ts mappers and api-client.ts patterns.
 * Key differences from exploration code:
 * - Clean config (no typo-tolerant env var chains)
 * - Typed responses with Zod validation
 * - Geocodes sandbox fallback (sandbox is DOWN — falls back to production)
 */

import { DEFAULT_GEOCODES_URL } from './constants.js';
import type {
  EnviaAddress,
  EnviaClientConfig,
  EnviaLabelAddress,
  EnviaLabelPackage,
  EnviaPackage,
  LabelOptions,
  Carrier,
  CarrierService,
  RateQuoteItem,
  LabelItem,
  TrackingItem,
  CancellationItem,
  PostalCodeItem,
  ShipmentHistoryItem,
  PickupRequest,
  PickupResult,
  HsCodeOptions,
  HsCodeClassification,
  CommercialInvoiceRequest,
  CommercialInvoiceResult,
  CityLookupItem,
  AvailableCarrier,
} from './types.js';
import { makeApiRequest, ApiHttpError } from './utils.js';

// ════════════════════════════════════════════════════════════════════════════════
// Request body builders (adapted from exploration fixtures.ts)
// ════════════════════════════════════════════════════════════════════════════════

function buildRateRequestBody(
  origin: EnviaAddress,
  destination: EnviaAddress,
  packages: EnviaPackage[],
  carrier?: string,
  currency: string = 'MXN',
): Record<string, unknown> {
  return {
    origin,
    destination,
    packages,
    settings: { currency },
    shipment: {
      type: 1,
      import: 0,
      ...(carrier ? { carrier } : {}),
    },
  };
}

function buildLabelRequestBody(
  origin: EnviaLabelAddress,
  destination: EnviaLabelAddress,
  packages: EnviaLabelPackage[],
  carrier: string,
  service: string,
  options?: LabelOptions,
  currency: string = 'MXN',
): Record<string, unknown> {
  return {
    origin,
    destination,
    packages,
    settings: {
      currency,
      printFormat: options?.printFormat ?? 'PDF',
      printSize: options?.printSize ?? 'STOCK_4X6',
    },
    shipment: {
      carrier,
      service,
      reverse_pickup: 0,
      type: 1,
      import: 0,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// Client
// ════════════════════════════════════════════════════════════════════════════════

export class EnviaClient {
  private config: EnviaClientConfig;

  constructor(config: EnviaClientConfig) {
    if (!config.apiKey) {
      throw new Error('ENVIA_API_KEY is required');
    }
    this.config = config;
  }

  /** Wrapper around makeApiRequest that injects config-level retry options */
  private request<T>(options: Parameters<typeof makeApiRequest>[0]): Promise<T> {
    return makeApiRequest<T>({
      ...options,
      retry: options.retry ?? this.config.retry,
    });
  }

  // ─── Quoting ───

  /**
   * Get shipping rates for a single carrier.
   * Supports multi-package (packages[] array for batching savings).
   * @param currency Override currency (default: config.defaultCurrency ?? 'MXN'). API returns USD if omitted.
   */
  async getQuotes(
    origin: EnviaAddress,
    destination: EnviaAddress,
    packages: EnviaPackage[],
    carrier: string,
    currency?: string,
  ): Promise<RateQuoteItem[]> {
    const cur = currency ?? this.config.defaultCurrency ?? 'MXN';
    const body = buildRateRequestBody(origin, destination, packages, carrier, cur);
    const response = await this.request<{ meta: string; data: RateQuoteItem[] }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/rate/',
      method: 'POST',
      data: body,
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

  /**
   * Fan-out to multiple carriers using Promise.all.
   * Merges and sorts results by totalPrice ascending.
   * If carriers not provided, fetches all available carriers first.
   * @param currency Override currency (default: config.defaultCurrency ?? 'MXN')
   */
  async getQuotesAllCarriers(
    origin: EnviaAddress,
    destination: EnviaAddress,
    packages: EnviaPackage[],
    carriers?: string[],
    currency?: string,
  ): Promise<RateQuoteItem[]> {
    let carrierList = carriers;
    if (!carrierList) {
      const allCarriers = await this.getCarriers('MX');
      carrierList = allCarriers.map((c) => c.endpoint);
    }

    const results = await Promise.all(
      carrierList.map(async (carrier) => {
        try {
          return await this.getQuotes(origin, destination, packages, carrier, currency);
        } catch {
          // Carrier may not serve this route — skip silently
          return [];
        }
      }),
    );

    return results.flat().sort((a, b) => a.totalPrice - b.totalPrice);
  }

  // ─── Labels ───

  /**
   * Purchase a shipping label. THIS COSTS MONEY.
   * NOT idempotent — duplicate call = double charge + different tracking number.
   *
   * Key differences from quotes:
   * - phone_code must be "52" (not "MX")
   * - origin gets type: "origin", destination gets type: "destination"
   * - origin gets identificationNumber (RFC)
   * - Returns USD currency (not MXN)
   * - Label URLs are permanent S3 links
   */
  async createLabel(
    origin: EnviaLabelAddress,
    destination: EnviaLabelAddress,
    packages: EnviaLabelPackage[],
    carrier: string,
    service: string,
    options?: LabelOptions,
    currency?: string,
  ): Promise<LabelItem> {
    const cur = currency ?? this.config.defaultCurrency ?? 'MXN';
    const body = buildLabelRequestBody(origin, destination, packages, carrier, service, options, cur);
    const response = await this.request<{ meta: string; data: LabelItem[] }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/generate/',
      method: 'POST',
      data: body,
      apiKey: this.config.apiKey,
    });
    const item = response.data[0];
    if (!item) {
      throw new Error('Label API returned empty data array');
    }
    return item;
  }

  // ─── Tracking ───

  /**
   * Track one or more shipments by tracking number.
   * Must use trackingNumber — shipmentId does NOT work as a tracking key.
   */
  async trackShipments(trackingNumbers: string[]): Promise<TrackingItem[]> {
    const response = await this.request<{ meta: string; data: TrackingItem[] }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/generaltrack/',
      method: 'POST',
      data: { trackingNumbers },
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

  // ─── Cancellation ───

  /**
   * Cancel a shipment and request a refund.
   * Only needs carrier + trackingNumber.
   * Error 1115 = already cancelled (safe to ignore).
   */
  async cancelShipment(
    carrier: string,
    trackingNumber: string,
  ): Promise<CancellationItem> {
    const response = await this.request<{ meta: string; data: CancellationItem[] }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/cancel/',
      method: 'POST',
      data: { carrier, trackingNumber },
      apiKey: this.config.apiKey,
    });
    const item = response.data[0];
    if (!item) {
      throw new Error('Cancel API returned empty data array');
    }
    return item;
  }

  // ─── Address Validation (Geocodes API — no auth) ───

  /**
   * Validate a postal code and return full address details.
   * Uses Geocodes API which requires NO authentication.
   * Returns array — check length for validity. Invalid CPs return empty [].
   *
   * Sandbox geocodes is DOWN — falls back to production geocodes.envia.com.
   */
  async validateZipCode(
    postalCode: string,
    countryCode: string = 'MX',
  ): Promise<PostalCodeItem[]> {
    try {
      return await this.request<PostalCodeItem[]>({
        baseUrl: this.config.geocodesUrl,
        endpoint: `/zipcode/${encodeURIComponent(countryCode)}/${encodeURIComponent(postalCode)}`,
        method: 'GET',
        retry: { maxRetries: 0 }, // Don't retry sandbox — fallback is the retry strategy
        // No apiKey — geocodes requires no auth
      });
    } catch (error) {
      // Sandbox geocodes is DOWN (503) — fallback to production
      if (error instanceof ApiHttpError && error.status >= 500) {
        return await this.request<PostalCodeItem[]>({
          baseUrl: DEFAULT_GEOCODES_URL,
          endpoint: `/zipcode/${encodeURIComponent(countryCode)}/${encodeURIComponent(postalCode)}`,
          method: 'GET',
        });
      }
      throw error;
    }
  }

  // ─── Reference Data (Queries API) ───

  /**
   * List available carriers for a country.
   * Mexico has 34 carriers.
   */
  async getCarriers(countryCode: string = 'MX'): Promise<Carrier[]> {
    const response = await this.request<{ data: Carrier[] }>({
      baseUrl: this.config.queriesUrl,
      endpoint: '/carrier',
      method: 'GET',
      params: { country_code: countryCode },
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

  /**
   * List services for a carrier.
   * Service counts vary: DHL=31, FedEx=130, Estafeta=8.
   */
  async getServices(
    carrier: string,
    countryCode: string = 'MX',
  ): Promise<CarrierService[]> {
    const response = await this.request<{ data: CarrierService[] }>({
      baseUrl: this.config.queriesUrl,
      endpoint: `/service/${carrier}`,
      method: 'GET',
      params: { country_code: countryCode },
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

  // ─── Shipment History ───

  /**
   * Get shipment history for a given month and year.
   * Returns all shipments created during that period.
   */
  async getShipmentHistory(month: number, year: number): Promise<ShipmentHistoryItem[]> {
    const mm = String(month).padStart(2, '0');
    const response = await this.request<{ data: ShipmentHistoryItem[] }>({
      baseUrl: this.config.queriesUrl,
      endpoint: `/guide/${mm}/${year}`,
      method: 'GET',
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

  // ─── Pickup Scheduling ───

  /**
   * Schedule a carrier pickup for one or more shipments.
   */
  async schedulePickup(request: PickupRequest): Promise<PickupResult> {
    const response = await this.request<{ data: PickupResult }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/pickup/',
      method: 'POST',
      data: request,
      apiKey: this.config.apiKey,
    });
    return response.data;
  }

  // ─── HS Code Classification ───

  /**
   * Classify a product description into an HS code for customs.
   */
  async classifyHsCode(
    description: string,
    options?: HsCodeOptions,
  ): Promise<HsCodeClassification> {
    const response = await this.request<{ data: HsCodeClassification }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/utils/classify-hscode',
      method: 'POST',
      data: {
        description,
        ...options,
      },
      apiKey: this.config.apiKey,
    });
    return response.data;
  }

  // ─── Commercial Invoice ───

  /**
   * Generate a commercial invoice for international shipments.
   */
  async generateCommercialInvoice(
    request: CommercialInvoiceRequest,
  ): Promise<CommercialInvoiceResult> {
    const response = await this.request<{ data: CommercialInvoiceResult }>({
      baseUrl: this.config.shippingUrl,
      endpoint: '/ship/commercial-invoice',
      method: 'POST',
      data: request,
      apiKey: this.config.apiKey,
    });
    return response.data;
  }

  // ─── City Lookup (Geocodes API — no auth) ───

  /**
   * Look up cities by name. Uses Geocodes API (no authentication required).
   * Sandbox geocodes is DOWN — falls back to production geocodes.envia.com.
   */
  async lookupCity(
    city: string,
    countryCode: string = 'MX',
  ): Promise<CityLookupItem[]> {
    try {
      return await this.request<CityLookupItem[]>({
        baseUrl: this.config.geocodesUrl,
        endpoint: `/locate/${encodeURIComponent(countryCode)}/${encodeURIComponent(city)}`,
        method: 'GET',
        retry: { maxRetries: 0 }, // Don't retry sandbox — fallback is the retry strategy
        // No apiKey — geocodes requires no auth
      });
    } catch (error) {
      // Sandbox geocodes is DOWN (503) — fallback to production
      if (error instanceof ApiHttpError && error.status >= 500) {
        return await this.request<CityLookupItem[]>({
          baseUrl: DEFAULT_GEOCODES_URL,
          endpoint: `/locate/${encodeURIComponent(countryCode)}/${encodeURIComponent(city)}`,
          method: 'GET',
        });
      }
      throw error;
    }
  }

  // ─── Available Carriers (Queries API) ───

  /**
   * Get available carriers for a country, optionally filtered by international support.
   */
  async getAvailableCarriers(
    countryCode: string = 'MX',
    international: boolean = false,
  ): Promise<AvailableCarrier[]> {
    const intFlag = international ? 1 : 0;
    const response = await this.request<{ data: AvailableCarrier[] }>({
      baseUrl: this.config.queriesUrl,
      endpoint: `/available-carrier/${countryCode}/${intFlag}`,
      method: 'GET',
      apiKey: this.config.apiKey,
    });
    return response.data ?? [];
  }

}

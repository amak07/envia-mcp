/**
 * Unit tests for EnviaClient.
 * Mocks globalThis.fetch to return fixture-based responses.
 * No live API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnviaClient } from './client.js';
import { ApiHttpError } from './utils.js';
import type { EnviaAddress, EnviaLabelAddress, EnviaPackage, EnviaLabelPackage } from './types.js';

// ────────────────────────────────────────────────────────────────────────────
// Fixture data (extracted from tests/fixtures/ snapshot files)
// ────────────────────────────────────────────────────────────────────────────

/** Subset of 02-carriers-mx.json — first 3 carriers */
const carriersApiResponse = {
  data: [
    {
      id: 181,
      name: 'afimex',
      endpoint: 'https://api-test.envia.com/',
      country_code: 'MX',
      track_url: 'https://uy.treggo.co/',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/afimex.svg',
      box_weight_limit: 70,
      pallet_weight_limit: null,
      pickup_sameday: 0,
      pickup_start_time: 9,
      pickup_end_time: 18,
      pickup_span_time: null,
      pickup_sameday_limit_time: null,
    },
    {
      id: 2,
      name: 'dhl',
      endpoint: 'https://api-test.envia.com/',
      country_code: 'MX',
      track_url: 'http://www.dhl.com/en/express/tracking.html?AWB=',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/dhl.svg',
      box_weight_limit: 68,
      pallet_weight_limit: null,
      pickup_sameday: 1,
      pickup_start_time: 10,
      pickup_end_time: 20,
      pickup_span_time: 0,
      pickup_sameday_limit_time: 14,
    },
    {
      id: 1,
      name: 'fedex',
      endpoint: 'https://api-test.envia.com/',
      country_code: 'MX',
      track_url: 'https://www.fedex.com/apps/fedextrack/?tracknumbers=',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/fedex.svg',
      box_weight_limit: 100,
      pallet_weight_limit: 1000,
      pickup_sameday: 1,
      pickup_start_time: 9,
      pickup_end_time: 18,
      pickup_span_time: 4,
      pickup_sameday_limit_time: 14,
    },
  ],
};

/** Subset of 02-services-major-carriers.json — DHL services (first 3) */
const servicesApiResponse = {
  data: [
    {
      service_id: 6,
      carrier_name: 'dhl',
      country_code: 'MX',
      name: 'ground',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/dhl.svg',
      description: 'DHL Economy ',
      delivery_estimate: '2-4 dias',
      cash_on_delivery: 0,
      drop_off: 0,
      active: 1,
    },
    {
      service_id: 7,
      carrier_name: 'dhl',
      country_code: 'MX',
      name: 'express',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/dhl.svg',
      description: 'Dhl Express',
      delivery_estimate: 'Dia siguiente',
      cash_on_delivery: 0,
      drop_off: 0,
      active: 1,
    },
    {
      service_id: 35,
      carrier_name: 'dhl',
      country_code: 'MX',
      name: 'int_express',
      logo: 'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/logos/carriers/dhl.svg',
      description: 'DHL Express Worldwide',
      delivery_estimate: '2-4 dias',
      cash_on_delivery: 0,
      drop_off: 0,
      active: 1,
    },
  ],
};

/** From 03-postal-code-valid.json — the `data` field is the API response body (an array) */
const postalCodeValidResponse = [
  {
    zip_code: '06700',
    country: { name: 'Mexico', code: 'MX' },
    state: {
      name: 'Ciudad de Mexico',
      iso_code: 'MX-CMX',
      code: { '1digit': null, '2digit': 'CX', '3digit': 'CMX' },
    },
    locality: 'Ciudad de Mexico',
    additional_info: { street: null },
    suburbs: ['Roma Norte'],
    coordinates: { latitude: '19.418299', longitude: '-99.164766' },
    info: {
      stat: '09015',
      stat_8digit: '09015000',
      time_zone: 'America/Mexico_City',
      utc: '-06:00',
    },
    regions: {
      region_1: 'Ciudad de Mexico',
      region_2: 'Cuauhtemoc',
      region_3: '',
      region_4: '',
    },
  },
];

/** From 03-postal-code-invalid.json — empty array */
const postalCodeInvalidResponse: unknown[] = [];

/** From 04-rate-standard-domestic.json — the `data` field is `{ meta, data }` */
const rateApiResponse = {
  meta: 'rate',
  data: [
    {
      carrierId: 2,
      carrier: 'dhl',
      carrierDescription: 'DHL',
      serviceId: 6,
      service: 'ground',
      serviceDescription: 'DHL Economy ',
      dropOff: 0,
      branchType: null,
      zone: 3,
      deliveryEstimate: '2-4 days',
      deliveryDate: { date: '2026-03-18', dateDifference: 1, timeUnit: 'day', time: '23:59' },
      quantity: 1,
      basePrice: 310.54,
      basePriceTaxes: 0,
      extendedFare: 0,
      insurance: 0,
      additionalServices: 0,
      additionalServicesTaxes: 0,
      additionalCharges: 94.33,
      additionalChargesTaxes: 0,
      importFee: 0,
      customKeyCost: 0,
      taxes: 0,
      totalPrice: 404.87,
      currency: 'MXN',
      smsCost: 0,
      whatsappCost: 0,
      customKey: false,
      cashOnDeliveryCommission: 0,
      cashOnDeliveryAmount: 0,
      calculatedDeclaredValue: 0,
      isMps: false,
      shipmentTaxes: [],
      branches: [],
      costSummary: [
        {
          quantity: 1,
          basePrice: 310.54,
          basePriceTaxes: 0,
          extendedFare: 0,
          insurance: 0,
          additionalServices: 0,
          additionalServicesTaxes: 0,
          additionalCharges: 94.33,
          additionalChargesTaxes: 0,
          taxes: 0,
          totalPrice: 404.87,
          costAdditionalServices: [],
          costAdditionalCharges: [
            {
              id: 71,
              addToInvoice: 1,
              conceptId: 24,
              additionalService: 'fuel',
              translationTag: 'createLabel.shippingInfo.fuelSurcharge',
              amount: 1,
              commission: 44.34,
              taxes: 0,
              cost: 44.34,
              value: 0,
            },
            {
              id: 88,
              addToInvoice: 1,
              conceptId: 57,
              additionalService: 'green_tax',
              translationTag: 'additional.services.green_tax',
              amount: 1,
              commission: 49.99,
              taxes: 0,
              cost: 49.99,
              value: 0,
            },
          ],
          currency: 'MXN',
        },
      ],
      packageDetails: {
        totalWeight: 3.5,
        weightUnit: 'KG',
        details: [
          {
            appliedWeightType: 'declared',
            weightUnit: 'KG',
            weight: 3.5,
            content: 'Juego de pastillas de freno',
          },
        ],
      },
      landedCostId: null,
      classifiedHsCodes: [],
      landedCostTotal: null,
    },
    {
      carrierId: 2,
      carrier: 'dhl',
      carrierDescription: 'DHL',
      serviceId: 7,
      service: 'express',
      serviceDescription: 'Dhl Express',
      dropOff: 0,
      branchType: null,
      zone: 3,
      deliveryEstimate: 'Next day',
      deliveryDate: { date: '2026-03-18', dateDifference: 1, timeUnit: 'day', time: '23:59' },
      quantity: 1,
      basePrice: 290.05,
      basePriceTaxes: 0,
      extendedFare: 0,
      insurance: 0,
      additionalServices: 0,
      additionalServicesTaxes: 0,
      additionalCharges: 77.9,
      additionalChargesTaxes: 0,
      importFee: 0,
      customKeyCost: 0,
      taxes: 0,
      totalPrice: 367.95,
      currency: 'MXN',
      smsCost: 0,
      whatsappCost: 0,
      customKey: false,
      cashOnDeliveryCommission: 0,
      cashOnDeliveryAmount: 0,
      calculatedDeclaredValue: 0,
      isMps: false,
      shipmentTaxes: [],
      branches: [],
      costSummary: [
        {
          quantity: 1,
          basePrice: 290.05,
          basePriceTaxes: 0,
          extendedFare: 0,
          insurance: 0,
          additionalServices: 0,
          additionalServicesTaxes: 0,
          additionalCharges: 77.9,
          additionalChargesTaxes: 0,
          taxes: 0,
          totalPrice: 367.95,
          costAdditionalServices: [],
          costAdditionalCharges: [
            {
              id: 71,
              addToInvoice: 1,
              conceptId: 24,
              additionalService: 'fuel',
              translationTag: 'createLabel.shippingInfo.fuelSurcharge',
              amount: 1,
              commission: 27.91,
              taxes: 0,
              cost: 27.91,
              value: 0,
            },
            {
              id: 88,
              addToInvoice: 1,
              conceptId: 57,
              additionalService: 'green_tax',
              translationTag: 'additional.services.green_tax',
              amount: 1,
              commission: 49.99,
              taxes: 0,
              cost: 49.99,
              value: 0,
            },
          ],
          currency: 'MXN',
        },
      ],
      packageDetails: {
        totalWeight: 3.5,
        weightUnit: 'KG',
        details: [
          {
            appliedWeightType: 'declared',
            weightUnit: 'KG',
            weight: 3.5,
            content: 'Juego de pastillas de freno',
          },
        ],
      },
      landedCostId: null,
      classifiedHsCodes: [],
      landedCostTotal: null,
    },
  ],
};

/** From 05-label-created.json — entire file minus _meta */
const labelApiResponse = {
  meta: 'generate',
  data: [
    {
      carrier: 'dhl',
      service: 'ground',
      shipmentId: 168268,
      trackingNumber: '2456698904',
      folio: '',
      trackUrl: 'https://test.envia.com/rastreo?label=2456698904&cntry_code=mx',
      label:
        'https://s3.us-east-2.amazonaws.com/envia-staging/uploads/dhl/2456698904464869b9a917a378c.pdf',
      packages: [
        {
          trackingNumber: '2456698904',
          trackUrl: 'https://test.envia.com/rastreo?label=2456698904&cntry_code=mx',
          content: 'Juego de pastillas de freno',
          weight: 3.5,
          weightUnit: 'KG',
        },
      ],
      additionalFiles: [],
      totalPrice: 22.92,
      currentBalance: 911.14,
      currency: 'USD',
    },
  ],
};

/** From 06-tracking-complete.json — entire file minus _meta */
const trackingApiResponse = {
  meta: 'generaltrack',
  data: [
    {
      company: 'Refacciones Direct',
      companyId: 4648,
      carrier: 'dhl',
      carrierId: 2,
      carrierDescription: 'DHL',
      service: 'ground',
      serviceDescription: 'DHL Economy ',
      country: 'MX',
      localeId: 1,
      trackingNumber: '2456699011',
      folio: null,
      cashOnDelivery: false,
      accountShipment: 'TENDENCYS',
      trackUrl: 'https://test.envia.com/rastreo?label=2456699011',
      trackUrlSite: 'http://www.dhl.com/en/express/tracking.html?AWB=2456699011',
      status: 'Created',
      statusColor: '#28a745',
      estimatedDelivery: '2026-03-18 23:59:00',
      pickupDate: null,
      shippedAt: null,
      deliveredAt: null,
      signedBy: null,
      informationDetail: null,
      createdAt: '2026-03-17 13:19:29',
      destination: {
        name: 'Juan Perez Garcia',
        company: '-',
        email: 'test@refaccionesdirect.com',
        phone: '5512345678',
        street: 'Av. Alvaro Obregon',
        number: '123',
        district: 'Roma Norte',
        city: 'Ciudad de Mexico',
        state: 'CMX',
        country: 'MX',
        postalCode: '06700',
        branchInfo: null,
      },
      content: {
        tracking_number: '2456699011',
        status_parent_id: 1,
        parentStatusBackgroundColor: '#009FE3',
        parentStatusTextColor: '#008E96',
        status_translation_tag: 'shipments.status.1',
        class_name: 'secondary',
        status: 'Created',
        content: 'Kit de filtro de aceite',
        type: 'box',
        length: 20,
        width: 15,
        height: 15,
        weight: 1.2,
        totalWeight: 1.2,
        weightUnit: 'KG',
        lengthUnit: 'CM',
        originalRequest: true,
      },
      eventHistory: [],
      companyInfo: { name: 'Refacciones Direct', color: null, logo: null },
      additionalFolios: [],
      podFile: null,
      podEvidences: [],
      packages: [
        {
          tracking_number: '2456699011',
          status_parent_id: 1,
          parentStatusBackgroundColor: '#009FE3',
          parentStatusTextColor: '#008E96',
          status_translation_tag: 'shipments.status.1',
          class_name: 'secondary',
          status: 'Created',
          content: 'Kit de filtro de aceite',
          type: 'box',
          length: 20,
          width: 15,
          height: 15,
          weight: 1.2,
          totalWeight: 1.2,
          weightUnit: 'KG',
          lengthUnit: 'CM',
          originalRequest: true,
        },
      ],
      parentTrackingNumber: '2456699011',
    },
  ],
};

/** From 07-cancel-success.json — entire file minus _meta */
const cancelApiResponse = {
  meta: 'cancel',
  data: [
    {
      carrier: 'dhl',
      service: 'ground',
      trackingNumber: '2456699044',
      folio: null,
      ecommerce: null,
      refundedAmount: 0,
      currency: '',
      balanceReturned: 0,
      balanceReturnDate: null,
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const TEST_CONFIG = {
  apiKey: 'test-api-key-123',
  shippingUrl: 'https://api-test.envia.com',
  queriesUrl: 'https://queries-test.envia.com',
  geocodesUrl: 'https://geocodes-test.envia.com',
  retry: { maxRetries: 0, baseDelayMs: 0 }, // Disable retries in tests for speed
};

const sampleOrigin: EnviaAddress = {
  name: 'Refacciones Direct',
  company: 'Refacciones Direct SA',
  phone: '8112345678',
  phone_code: 'MX',
  email: 'envios@refaccionesdirect.com',
  street: 'Av. Lazaro Cardenas',
  number: '2400',
  district: 'Residencial San Agustin',
  city: 'San Pedro Garza Garcia',
  state: 'NL',
  country: 'MX',
  postalCode: '66260',
  reference: 'Plaza Valle Oriente',
};

const sampleDestination: EnviaAddress = {
  name: 'Juan Perez Garcia',
  company: '',
  phone: '5512345678',
  phone_code: 'MX',
  email: 'test@refaccionesdirect.com',
  street: 'Av. Alvaro Obregon',
  number: '123',
  district: 'Roma Norte',
  city: 'Ciudad de Mexico',
  state: 'CX',
  country: 'MX',
  postalCode: '06700',
  reference: 'Cerca del metro Insurgentes',
};

const samplePackages: EnviaPackage[] = [
  {
    content: 'Juego de pastillas de freno',
    amount: 1,
    type: 'box',
    weight: 3.5,
    insurance: 0,
    declaredValue: 0,
    weightUnit: 'KG',
    lengthUnit: 'CM',
    dimensions: { length: 30, width: 20, height: 15 },
  },
];

const sampleLabelOrigin: EnviaLabelAddress = {
  ...sampleOrigin,
  phone_code: '52',
  type: 'origin',
  identificationNumber: 'XAXX010101000',
};

const sampleLabelDestination: EnviaLabelAddress = {
  ...sampleDestination,
  phone_code: '52',
  type: 'destination',
  identificationNumber: '',
};

const sampleLabelPackages: EnviaLabelPackage[] = [
  {
    ...samplePackages[0]!,
    name: 'Brake Pads',
  },
];

/** Create a mock Response object that returns the given JSON body */
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Constructor ────────────────────────────────────────────────────────────

describe('EnviaClient constructor', () => {
  it('throws if apiKey is empty string', () => {
    expect(() => new EnviaClient({ ...TEST_CONFIG, apiKey: '' })).toThrow('ENVIA_API_KEY is required');
  });

  it('creates client with valid config', () => {
    const client = new EnviaClient(TEST_CONFIG);
    expect(client).toBeInstanceOf(EnviaClient);
  });
});

// ─── getQuotes ──────────────────────────────────────────────────────────────

describe('EnviaClient.getQuotes', () => {
  it('sends POST to /ship/rate/ with correct body and returns data array', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const quotes = await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl');

    // Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/rate/');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key-123');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');

    // Verify request body shape
    const body = JSON.parse(init.body as string);
    expect(body.origin).toEqual(sampleOrigin);
    expect(body.destination).toEqual(sampleDestination);
    expect(body.packages).toEqual(samplePackages);
    expect(body.shipment.carrier).toBe('dhl');
    expect(body.settings.currency).toBe('MXN');

    // Verify response
    expect(quotes).toHaveLength(2);
    expect(quotes[0]!.carrier).toBe('dhl');
    expect(quotes[0]!.service).toBe('ground');
    expect(quotes[0]!.totalPrice).toBe(404.87);
    expect(quotes[1]!.service).toBe('express');
    expect(quotes[1]!.totalPrice).toBe(367.95);
  });

  it('returns empty array when API response has no data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ meta: 'rate', data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const quotes = await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl');
    expect(quotes).toEqual([]);
  });

  it('includes carrier in shipment when provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'fedex');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.shipment.carrier).toBe('fedex');
  });
});

// ─── getQuotesAllCarriers ───────────────────────────────────────────────────

describe('EnviaClient.getQuotesAllCarriers', () => {
  it('fans out to provided carriers and merges results sorted by totalPrice', async () => {
    // DHL returns two quotes: 404.87 and 367.95
    const dhlResponse = rateApiResponse;
    // FedEx returns one quote: 350.00
    const fedexResponse = {
      meta: 'rate',
      data: [
        {
          ...rateApiResponse.data[0],
          carrier: 'fedex',
          carrierDescription: 'FedEx',
          totalPrice: 350.0,
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce(mockResponse(dhlResponse))
      .mockResolvedValueOnce(mockResponse(fedexResponse));

    const client = new EnviaClient(TEST_CONFIG);
    const quotes = await client.getQuotesAllCarriers(
      sampleOrigin,
      sampleDestination,
      samplePackages,
      ['dhl', 'fedex'],
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(quotes).toHaveLength(3);
    // Sorted ascending by totalPrice: 350.00, 367.95, 404.87
    expect(quotes[0]!.totalPrice).toBe(350.0);
    expect(quotes[0]!.carrier).toBe('fedex');
    expect(quotes[1]!.totalPrice).toBe(367.95);
    expect(quotes[2]!.totalPrice).toBe(404.87);
  });

  it('fetches carriers first when none provided', async () => {
    // First call: getCarriers
    mockFetch.mockResolvedValueOnce(mockResponse(carriersApiResponse));
    // Then one rate call per carrier (3 carriers in our fixture)
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));

    const client = new EnviaClient(TEST_CONFIG);
    const quotes = await client.getQuotesAllCarriers(sampleOrigin, sampleDestination, samplePackages);

    // 1 carrier call + 3 rate calls
    expect(mockFetch).toHaveBeenCalledTimes(4);
    // First call should be GET /carrier
    const [firstUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toContain('/carrier');
  });

  it('silently skips carriers that fail and returns remaining quotes', async () => {
    // DHL succeeds, FedEx fails with 400
    mockFetch
      .mockResolvedValueOnce(mockResponse(rateApiResponse))
      .mockResolvedValueOnce(mockResponse({ meta: 'error', error: { code: 400, message: 'Bad request' } }, 400));

    const client = new EnviaClient(TEST_CONFIG);
    const quotes = await client.getQuotesAllCarriers(
      sampleOrigin,
      sampleDestination,
      samplePackages,
      ['dhl', 'fedex'],
    );

    // Only DHL quotes should be returned
    expect(quotes).toHaveLength(2);
    expect(quotes.every((q) => q.carrier === 'dhl')).toBe(true);
  });

  it('returns empty array when all carriers fail', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'));

    const client = new EnviaClient(TEST_CONFIG);
    const quotes = await client.getQuotesAllCarriers(
      sampleOrigin,
      sampleDestination,
      samplePackages,
      ['dhl', 'fedex'],
    );

    expect(quotes).toEqual([]);
  });
});

// ─── createLabel ────────────────────────────────────────────────────────────

describe('EnviaClient.createLabel', () => {
  it('sends POST to /ship/generate/ and returns first data item', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(labelApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const label = await client.createLabel(
      sampleLabelOrigin,
      sampleLabelDestination,
      sampleLabelPackages,
      'dhl',
      'ground',
    );

    // Verify fetch URL and method
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/generate/');
    expect(init.method).toBe('POST');

    // Verify request body
    const body = JSON.parse(init.body as string);
    expect(body.shipment.carrier).toBe('dhl');
    expect(body.shipment.service).toBe('ground');
    expect(body.settings.printFormat).toBe('PDF');
    expect(body.settings.printSize).toBe('STOCK_4X6');

    // Verify response
    expect(label.carrier).toBe('dhl');
    expect(label.service).toBe('ground');
    expect(label.shipmentId).toBe(168268);
    expect(label.trackingNumber).toBe('2456698904');
    expect(label.totalPrice).toBe(22.92);
    expect(label.currency).toBe('USD');
    expect(label.label).toContain('s3.us-east-2.amazonaws.com');
    expect(label.packages).toHaveLength(1);
    expect(label.packages[0]!.trackingNumber).toBe('2456698904');
  });

  it('passes custom print options', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(labelApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.createLabel(
      sampleLabelOrigin,
      sampleLabelDestination,
      sampleLabelPackages,
      'dhl',
      'ground',
      { printFormat: 'ZPL', printSize: 'PAPER_8.5X11' },
    );

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.settings.printFormat).toBe('ZPL');
    expect(body.settings.printSize).toBe('PAPER_8.5X11');
  });
});

// ─── trackShipments ─────────────────────────────────────────────────────────

describe('EnviaClient.trackShipments', () => {
  it('sends POST to /ship/generaltrack/ with tracking numbers array', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(trackingApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.trackShipments(['2456699011']);

    // Verify fetch call
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/generaltrack/');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.trackingNumbers).toEqual(['2456699011']);

    // Verify response
    expect(items).toHaveLength(1);
    expect(items[0]!.trackingNumber).toBe('2456699011');
    expect(items[0]!.carrier).toBe('dhl');
    expect(items[0]!.status).toBe('Created');
    expect(items[0]!.trackUrl).toContain('rastreo');
    expect(items[0]!.destination.name).toBe('Juan Perez Garcia');
    expect(items[0]!.destination.postalCode).toBe('06700');
  });

  it('returns empty array when API response data is null', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ meta: 'generaltrack', data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.trackShipments(['nonexistent123']);
    expect(items).toEqual([]);
  });
});

// ─── cancelShipment ─────────────────────────────────────────────────────────

describe('EnviaClient.cancelShipment', () => {
  it('sends POST to /ship/cancel/ with carrier and trackingNumber', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(cancelApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const result = await client.cancelShipment('dhl', '2456699044');

    // Verify fetch call
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/cancel/');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.carrier).toBe('dhl');
    expect(body.trackingNumber).toBe('2456699044');

    // Verify response
    expect(result.carrier).toBe('dhl');
    expect(result.service).toBe('ground');
    expect(result.trackingNumber).toBe('2456699044');
    expect(result.refundedAmount).toBe(0);
    expect(result.balanceReturnDate).toBeNull();
  });
});

// ─── validateZipCode ────────────────────────────────────────────────────────

describe('EnviaClient.validateZipCode', () => {
  it('sends GET to /zipcode/{country}/{code} without auth header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(postalCodeValidResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.validateZipCode('06700', 'MX');

    // Verify fetch call
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://geocodes-test.envia.com/zipcode/MX/06700');
    expect(init.method).toBe('GET');
    // No Authorization header for geocodes
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();

    // Verify response
    expect(items).toHaveLength(1);
    expect(items[0]!.zip_code).toBe('06700');
    expect(items[0]!.state.name).toBe('Ciudad de Mexico');
    expect(items[0]!.suburbs).toContain('Roma Norte');
    expect(items[0]!.coordinates.latitude).toBe('19.418299');
  });

  it('returns empty array for invalid postal code', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(postalCodeInvalidResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.validateZipCode('99999', 'MX');
    expect(items).toEqual([]);
  });

  it('defaults country code to MX', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(postalCodeValidResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.validateZipCode('06700');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://geocodes-test.envia.com/zipcode/MX/06700');
  });

  it('falls back to production geocodes URL on 5xx error', async () => {
    // First call: sandbox returns 503
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Service Unavailable' }, 503));
    // Second call: production returns valid response
    mockFetch.mockResolvedValueOnce(mockResponse(postalCodeValidResponse));

    const client = new EnviaClient(TEST_CONFIG);
    const items = await client.validateZipCode('06700', 'MX');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Second call should use production geocodes URL
    const [fallbackUrl] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(fallbackUrl).toBe('https://geocodes.envia.com/zipcode/MX/06700');

    expect(items).toHaveLength(1);
    expect(items[0]!.zip_code).toBe('06700');
  });

  it('does NOT fall back on 4xx errors (e.g. 400)', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Bad Request' }, 400));
    const client = new EnviaClient(TEST_CONFIG);

    await expect(client.validateZipCode('abc', 'MX')).rejects.toThrow(ApiHttpError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

// ─── getCarriers ────────────────────────────────────────────────────────────

describe('EnviaClient.getCarriers', () => {
  it('sends GET to /carrier with country_code param and auth header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(carriersApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const carriers = await client.getCarriers('MX');

    // Verify fetch call
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://queries-test.envia.com/carrier?country_code=MX');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key-123');

    // Verify response shape
    expect(carriers).toHaveLength(3);
    expect(carriers[0]!.name).toBe('afimex');
    expect(carriers[0]!.country_code).toBe('MX');
    expect(carriers[1]!.name).toBe('dhl');
    expect(carriers[1]!.box_weight_limit).toBe(68);
    expect(carriers[2]!.name).toBe('fedex');
  });

  it('defaults country code to MX', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(carriersApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getCarriers();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('country_code=MX');
  });

  it('returns empty array when API response has no data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const carriers = await client.getCarriers('MX');
    expect(carriers).toEqual([]);
  });
});

// ─── getServices ────────────────────────────────────────────────────────────

describe('EnviaClient.getServices', () => {
  it('sends GET to /service/{carrier} with country_code param', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(servicesApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const services = await client.getServices('dhl', 'MX');

    // Verify fetch call
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://queries-test.envia.com/service/dhl?country_code=MX');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key-123');

    // Verify response
    expect(services).toHaveLength(3);
    expect(services[0]!.service_id).toBe(6);
    expect(services[0]!.carrier_name).toBe('dhl');
    expect(services[0]!.name).toBe('ground');
    expect(services[1]!.name).toBe('express');
    expect(services[2]!.name).toBe('int_express');
  });

  it('defaults country code to MX', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(servicesApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getServices('estafeta');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('country_code=MX');
    expect(url).toContain('/service/estafeta');
  });

  it('returns empty array when API response has no data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const services = await client.getServices('dhl');
    expect(services).toEqual([]);
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('throws ApiHttpError on 403 (invalid API key)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        { meta: 'error', error: { code: 403, description: 'Forbidden', message: 'Invalid API key' } },
        403,
      ),
    );
    const client = new EnviaClient(TEST_CONFIG);

    const err = await client.getCarriers('MX').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).status).toBe(403);
  });

  it('throws ApiHttpError on 400 (bad request)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        {
          meta: 'error',
          error: { code: 400, description: 'Bad Request', message: 'Missing required field' },
        },
        400,
      ),
    );
    const client = new EnviaClient(TEST_CONFIG);

    const err = await client
      .getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).status).toBe(400);
  });

  it('propagates timeout/abort errors', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);
    const client = new EnviaClient(TEST_CONFIG);

    await expect(client.getCarriers('MX')).rejects.toThrow('The operation was aborted');
  });

  it('propagates network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const client = new EnviaClient(TEST_CONFIG);

    await expect(client.trackShipments(['123'])).rejects.toThrow('Failed to fetch');
  });

  it('throws ApiHttpError on 500 for non-geocodes endpoints', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: 'Internal Server Error' }, 500),
    );
    const client = new EnviaClient(TEST_CONFIG);

    const err = await client.getCarriers('MX').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).status).toBe(500);
  });
});

// ─── Currency Configuration ──────────────────────────────────────────────────

describe('Currency configuration', () => {
  it('defaults to MXN when no currency config or override', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.settings.currency).toBe('MXN');
  });

  it('uses defaultCurrency from config when set', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    const client = new EnviaClient({ ...TEST_CONFIG, defaultCurrency: 'COP' });

    await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.settings.currency).toBe('COP');
  });

  it('per-call currency overrides config defaultCurrency', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(rateApiResponse));
    const client = new EnviaClient({ ...TEST_CONFIG, defaultCurrency: 'COP' });

    await client.getQuotes(sampleOrigin, sampleDestination, samplePackages, 'dhl', 'BRL');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.settings.currency).toBe('BRL');
  });

  it('applies currency to createLabel as well', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(labelApiResponse));
    const client = new EnviaClient({ ...TEST_CONFIG, defaultCurrency: 'USD' });

    await client.createLabel(sampleLabelOrigin, sampleLabelDestination, sampleLabelPackages, 'dhl', 'ground');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.settings.currency).toBe('USD');
  });
});

// ─── SSRF Protection ─────────────────────────────────────────────────────────

describe('SSRF hostname allowlist', () => {
  it('blocks requests to unauthorized hosts', async () => {
    const client = new EnviaClient({
      ...TEST_CONFIG,
      queriesUrl: 'https://evil.example.com',
    });

    await expect(client.getCarriers('MX')).rejects.toThrow(/Blocked.*unauthorized host/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows requests to known Envia domains', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(carriersApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const carriers = await client.getCarriers('MX');
    expect(carriers).toHaveLength(3);
  });
});

// ─── Retry Logic ─────────────────────────────────────────────────────────────

describe('Retry with exponential backoff', () => {
  it('retries on 429 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: 'Too Many Requests' }, 429))
      .mockResolvedValueOnce(mockResponse(carriersApiResponse));

    const client = new EnviaClient({
      ...TEST_CONFIG,
      retry: { maxRetries: 2, baseDelayMs: 1 },
    });

    const carriers = await client.getCarriers('MX');
    expect(carriers).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: 'Service Unavailable' }, 503))
      .mockResolvedValueOnce(mockResponse(carriersApiResponse));

    const client = new EnviaClient({
      ...TEST_CONFIG,
      retry: { maxRetries: 2, baseDelayMs: 1 },
    });

    const carriers = await client.getCarriers('MX');
    expect(carriers).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries and throws ApiHttpError', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: 'Server Error' }, 500))
      .mockResolvedValueOnce(mockResponse({ error: 'Server Error' }, 500))
      .mockResolvedValueOnce(mockResponse({ error: 'Server Error' }, 500));

    const client = new EnviaClient({
      ...TEST_CONFIG,
      retry: { maxRetries: 2, baseDelayMs: 1 },
    });

    const err = await client.getCarriers('MX').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry on 400 errors', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: 'Bad Request' }, 400),
    );

    const client = new EnviaClient({
      ...TEST_CONFIG,
      retry: { maxRetries: 2, baseDelayMs: 1 },
    });

    const err = await client.getCarriers('MX').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

// ─── getShipmentHistory ──────────────────────────────────────────────────────

describe('EnviaClient.getShipmentHistory', () => {
  const historyApiResponse = {
    data: [
      {
        trackingNumber: '2456698904',
        carrier: 'dhl',
        service: 'ground',
        status: 'Delivered',
        originCity: 'Monterrey',
        destinationCity: 'CDMX',
        totalPrice: 404.87,
        currency: 'MXN',
        label: 'https://s3.amazonaws.com/label.pdf',
        createdAt: '2026-03-10 10:00:00',
      },
    ],
  };

  it('sends GET to /guide/{MM}/{YYYY} with auth', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(historyApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.getShipmentHistory(3, 2026);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://queries-test.envia.com/guide/03/2026');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-api-key-123');

    expect(items).toHaveLength(1);
    expect(items[0]!.trackingNumber).toBe('2456698904');
    expect(items[0]!.carrier).toBe('dhl');
    expect(items[0]!.status).toBe('Delivered');
  });

  it('zero-pads single-digit months', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: [] }));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getShipmentHistory(1, 2026);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/guide/01/2026');
  });

  it('returns empty array when no shipments', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.getShipmentHistory(12, 2025);
    expect(items).toEqual([]);
  });
});

// ─── schedulePickup ──────────────────────────────────────────────────────────

describe('EnviaClient.schedulePickup', () => {
  const pickupApiResponse = {
    data: {
      confirmation: 'PU-12345',
      carrier: 'dhl',
      date: '2026-03-25',
      timeFrom: 9,
      timeTo: 17,
      status: 'scheduled',
    },
  };

  it('sends POST to /ship/pickup/ with correct body', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pickupApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const result = await client.schedulePickup({
      origin: sampleOrigin,
      carrier: 'dhl',
      trackingNumbers: ['2456698904'],
      date: '2026-03-25',
      timeFrom: 9,
      timeTo: 17,
      totalWeight: 3.5,
      totalPackages: 1,
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/pickup/');
    expect(init.method).toBe('POST');

    expect(result.confirmation).toBe('PU-12345');
    expect(result.carrier).toBe('dhl');
    expect(result.date).toBe('2026-03-25');
    expect(result.status).toBe('scheduled');
  });

  it('includes origin address fields in the request body', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(pickupApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.schedulePickup({
      origin: sampleOrigin,
      carrier: 'fedex',
      trackingNumbers: ['9876543210'],
      date: '2026-04-01',
      timeFrom: 10,
      timeTo: 14,
      totalWeight: 5,
      totalPackages: 2,
      instructions: 'Ring doorbell',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(body.origin).toEqual(
      expect.objectContaining({
        name: sampleOrigin.name,
        street: sampleOrigin.street,
        number: sampleOrigin.number,
        city: sampleOrigin.city,
        state: sampleOrigin.state,
        country: sampleOrigin.country,
        postalCode: sampleOrigin.postalCode,
        phone: sampleOrigin.phone,
        phone_code: sampleOrigin.phone_code,
        email: sampleOrigin.email,
      }),
    );
    expect(body.carrier).toBe('fedex');
    expect(body.trackingNumbers).toEqual(['9876543210']);
    expect(body.instructions).toBe('Ring doorbell');
  });
});

// ─── classifyHsCode ──────────────────────────────────────────────────────────

describe('EnviaClient.classifyHsCode', () => {
  const hsCodeApiResponse = {
    data: {
      hsCode: '8708.30',
      description: 'Brakes and servo-brakes; parts thereof',
      confidenceScore: 0.92,
      alternatives: ['8708.99', '8708.40'],
    },
  };

  it('sends POST to /utils/classify-hscode with description and options', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(hsCodeApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const result = await client.classifyHsCode('ceramic brake pads', {
      shipToCountries: ['US', 'CA'],
      includeAlternatives: true,
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/utils/classify-hscode');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.description).toBe('ceramic brake pads');
    expect(body.shipToCountries).toEqual(['US', 'CA']);

    expect(result.hsCode).toBe('8708.30');
    expect(result.confidenceScore).toBe(0.92);
    expect(result.alternatives).toHaveLength(2);
  });

  it('works with description only (no options)', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(hsCodeApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const result = await client.classifyHsCode('brake pads');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.description).toBe('brake pads');
    expect(result.hsCode).toBe('8708.30');
  });
});

// ─── generateCommercialInvoice ───────────────────────────────────────────────

describe('EnviaClient.generateCommercialInvoice', () => {
  const invoiceApiResponse = {
    data: {
      invoiceNumber: 'INV-2026-001',
      invoiceUrl: 'https://s3.amazonaws.com/invoice.pdf',
      invoiceId: 'inv-abc123',
    },
  };

  it('sends POST to /ship/commercial-invoice with full request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(invoiceApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const result = await client.generateCommercialInvoice({
      origin: sampleOrigin,
      destination: sampleDestination,
      carrier: 'dhl',
      packages: [
        {
          ...samplePackages[0]!,
          items: [
            {
              description: 'Ceramic brake pads',
              hsCode: '8708.30',
              quantity: 2,
              price: 450.0,
              countryOfManufacture: 'MX',
            },
          ],
        },
      ],
      customsSettings: {
        dutiesPaymentEntity: 'sender',
        exportReason: 'commercial',
      },
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-test.envia.com/ship/commercial-invoice');
    expect(init.method).toBe('POST');

    expect(result.invoiceNumber).toBe('INV-2026-001');
    expect(result.invoiceUrl).toContain('s3.amazonaws.com');
    expect(result.invoiceId).toBe('inv-abc123');
  });
});

// ─── lookupCity ──────────────────────────────────────────────────────────────

describe('EnviaClient.lookupCity', () => {
  const cityApiResponse = [
    {
      city: 'Monterrey',
      state: 'Nuevo Leon',
      postalCodes: ['64000', '64010', '64020'],
      regions: { region_1: 'Nuevo Leon', region_2: 'Monterrey' },
    },
  ];

  it('sends GET to /locate/{country}/{city} without auth', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(cityApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const items = await client.lookupCity('Monterrey', 'MX');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://geocodes-test.envia.com/locate/MX/Monterrey');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();

    expect(items).toHaveLength(1);
    expect(items[0]!.city).toBe('Monterrey');
    expect(items[0]!.state).toBe('Nuevo Leon');
    expect(items[0]!.postalCodes).toContain('64000');
  });

  it('defaults country code to MX', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(cityApiResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.lookupCity('Monterrey');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/locate/MX/Monterrey');
  });

  it('falls back to production geocodes on 5xx', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: 'Service Unavailable' }, 503))
      .mockResolvedValueOnce(mockResponse(cityApiResponse));

    const client = new EnviaClient(TEST_CONFIG);
    const items = await client.lookupCity('Monterrey', 'MX');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [fallbackUrl] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(fallbackUrl).toBe('https://geocodes.envia.com/locate/MX/Monterrey');
    expect(items).toHaveLength(1);
  });
});

// ─── getAvailableCarriers ────────────────────────────────────────────────────

describe('EnviaClient.getAvailableCarriers', () => {
  const availableCarriersResponse = {
    data: [
      { name: 'DHL', description: 'DHL Express', country_code: 'MX', logo: 'dhl.svg' },
      { name: 'FedEx', description: 'FedEx Mexico', country_code: 'MX', logo: 'fedex.svg' },
    ],
  };

  it('sends GET to /available-carrier/{country}/{flag} for domestic', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(availableCarriersResponse));
    const client = new EnviaClient(TEST_CONFIG);

    const carriers = await client.getAvailableCarriers('MX', false);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://queries-test.envia.com/available-carrier/MX/0');
    expect(init.method).toBe('GET');

    expect(carriers).toHaveLength(2);
    expect(carriers[0]!.name).toBe('DHL');
  });

  it('sends flag=1 for international carriers', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(availableCarriersResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getAvailableCarriers('MX', true);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/available-carrier/MX/1');
  });

  it('defaults to MX domestic', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(availableCarriersResponse));
    const client = new EnviaClient(TEST_CONFIG);

    await client.getAvailableCarriers();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/available-carrier/MX/0');
  });

  it('returns empty array when no data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: null }));
    const client = new EnviaClient(TEST_CONFIG);

    const carriers = await client.getAvailableCarriers();
    expect(carriers).toEqual([]);
  });
});

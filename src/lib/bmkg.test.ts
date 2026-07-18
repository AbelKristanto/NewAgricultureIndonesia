import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseBmkgResponse, summarizeForPrompt, getBmkgForecast } from './bmkg';

function mockEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    local_datetime: '2026-07-17 10:00:00',
    t: 32,
    hu: 49,
    weather_desc: 'Cerah',
    weather_desc_en: 'Sunny',
    ws: 5.1,
    tp: 0,
    vs_text: '> 10 km',
    ...overrides,
  };
}

function mockRawResponse() {
  return {
    lokasi: {
      desa: 'Kemayoran',
      kecamatan: 'Kemayoran',
      kotkab: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
    },
    data: [
      {
        cuaca: [
          [mockEntry(), mockEntry({ local_datetime: '2026-07-17 13:00:00', t: 34 })],
          [mockEntry({ local_datetime: '2026-07-18 10:00:00', t: 31 })],
        ],
      },
    ],
  };
}

describe('parseBmkgResponse', () => {
  it('flattens nested day/entry arrays into a single ordered list', () => {
    const forecast = parseBmkgResponse(mockRawResponse());
    expect(forecast.entries).toHaveLength(3);
    expect(forecast.entries[0].localDatetime).toBe('2026-07-17 10:00:00');
    expect(forecast.entries[1].temperatureC).toBe(34);
  });

  it('maps location fields', () => {
    const forecast = parseBmkgResponse(mockRawResponse());
    expect(forecast.location).toEqual({
      village: 'Kemayoran',
      district: 'Kemayoran',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
    });
  });

  it('maps raw entry fields to friendly names', () => {
    const forecast = parseBmkgResponse(mockRawResponse());
    const entry = forecast.entries[0];
    expect(entry).toMatchObject({
      temperatureC: 32,
      humidityPercent: 49,
      weatherDesc: 'Cerah',
      weatherDescEn: 'Sunny',
      windSpeedKmh: 5.1,
      precipitationMm: 0,
      visibility: '> 10 km',
    });
  });

  it('handles missing location fields gracefully', () => {
    const forecast = parseBmkgResponse({ lokasi: {}, data: [{ cuaca: [[mockEntry()]] }] });
    expect(forecast.location).toEqual({ village: '', district: '', city: '', province: '' });
  });
});

describe('summarizeForPrompt', () => {
  it('includes the city, province, and forecast lines', () => {
    const forecast = parseBmkgResponse(mockRawResponse());
    const summary = summarizeForPrompt(forecast);
    expect(summary).toContain('Jakarta Pusat');
    expect(summary).toContain('DKI Jakarta');
    expect(summary).toContain('Sunny');
    expect(summary).toContain('32°C');
  });

  it('caps the summary at 8 entries', () => {
    const manyEntries = {
      lokasi: mockRawResponse().lokasi,
      data: [{ cuaca: [Array.from({ length: 16 }, (_, i) => mockEntry({ local_datetime: `entry-${i}` })) ] }],
    };
    const forecast = parseBmkgResponse(manyEntries);
    const summary = summarizeForPrompt(forecast);
    const lines = summary.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(8);
  });

  it('returns a fallback message when there are no entries', () => {
    const forecast = parseBmkgResponse({ lokasi: mockRawResponse().lokasi, data: [] });
    expect(summarizeForPrompt(forecast)).toContain('No current BMKG forecast entries available');
  });
});

describe('getBmkgForecast', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and parses a valid response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => mockRawResponse(),
    } as Response);

    const forecast = await getBmkgForecast('31.71.03.1001');
    expect(forecast.location.city).toBe('Jakarta Pusat');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('adm4=31.71.03.1001'),
      expect.any(Object)
    );
  });

  it('throws when the response is not valid JSON (invalid/redirected code)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(getBmkgForecast('00.00.00.0001')).rejects.toThrow(/non-JSON/);
  });

  it('throws when the response shape is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ unexpected: true }),
    } as Response);

    await expect(getBmkgForecast('00.00.00.0002')).rejects.toThrow(/Unexpected BMKG response shape/);
  });

  it('caches results and does not re-fetch within the TTL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => mockRawResponse(),
    } as Response);

    await getBmkgForecast('31.71.03.9999');
    await getBmkgForecast('31.71.03.9999');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

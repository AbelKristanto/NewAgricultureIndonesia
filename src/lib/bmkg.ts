export interface BmkgForecastEntry {
  localDatetime: string;
  temperatureC: number;
  humidityPercent: number;
  weatherDesc: string;
  weatherDescEn: string;
  windSpeedKmh: number;
  precipitationMm: number;
  visibility: string;
}

export interface BmkgForecast {
  location: {
    village: string;
    district: string;
    city: string;
    province: string;
  };
  entries: BmkgForecastEntry[];
  fetchedAt: string;
}

interface BmkgRawEntry {
  local_datetime: string;
  t: number;
  hu: number;
  weather_desc: string;
  weather_desc_en: string;
  ws: number;
  tp: number;
  vs_text: string;
}

interface BmkgRawLocation {
  desa?: string;
  kecamatan?: string;
  kotkab?: string;
  provinsi?: string;
}

interface BmkgRawResponse {
  lokasi: BmkgRawLocation;
  data: Array<{
    cuaca: BmkgRawEntry[][];
  }>;
}

const BMKG_ENDPOINT = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const CACHE_TTL_MS = 45 * 60 * 1000; // BMKG refreshes every few hours; 45 min is a safe, simple TTL.

const cache = new Map<string, { forecast: BmkgForecast; fetchedAtMs: number }>();

export function parseBmkgResponse(raw: BmkgRawResponse): BmkgForecast {
  const entries: BmkgForecastEntry[] = raw.data
    .flatMap((day) => day.cuaca)
    .flat()
    .map((entry) => ({
      localDatetime: entry.local_datetime,
      temperatureC: entry.t,
      humidityPercent: entry.hu,
      weatherDesc: entry.weather_desc,
      weatherDescEn: entry.weather_desc_en,
      windSpeedKmh: entry.ws,
      precipitationMm: entry.tp,
      visibility: entry.vs_text,
    }));

  return {
    location: {
      village: raw.lokasi.desa || '',
      district: raw.lokasi.kecamatan || '',
      city: raw.lokasi.kotkab || '',
      province: raw.lokasi.provinsi || '',
    },
    entries,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches the live BMKG forecast for a village-level (adm4) region code.
 * Throws if the code is invalid — an invalid/unsupported adm4 (or a coarser
 * adm1-3 code) 301-redirects to the human-facing docs page instead of JSON.
 */
export async function getBmkgForecast(adm4: string): Promise<BmkgForecast> {
  const cached = cache.get(adm4);
  if (cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) {
    return cached.forecast;
  }

  const res = await fetch(`${BMKG_ENDPOINT}?adm4=${encodeURIComponent(adm4)}`, {
    headers: { Accept: 'application/json' },
  });

  let raw: BmkgRawResponse;
  try {
    raw = await res.json();
  } catch {
    throw new Error(`BMKG returned a non-JSON response for adm4=${adm4} (likely an invalid region code)`);
  }

  if (!raw?.lokasi || !Array.isArray(raw?.data)) {
    throw new Error(`Unexpected BMKG response shape for adm4=${adm4}`);
  }

  const forecast = parseBmkgResponse(raw);
  cache.set(adm4, { forecast, fetchedAtMs: Date.now() });
  return forecast;
}

/**
 * Condenses a forecast into a short block suitable for grounding an LLM prompt.
 */
export function summarizeForPrompt(forecast: BmkgForecast): string {
  const { location, entries } = forecast;
  if (entries.length === 0) {
    return `No current BMKG forecast entries available for ${location.city}, ${location.province}.`;
  }

  const lines = entries.slice(0, 8).map((e) =>
    `- ${e.localDatetime}: ${e.weatherDescEn} (${e.weatherDesc}), ${e.temperatureC}°C, humidity ${e.humidityPercent}%, rain ${e.precipitationMm}mm, wind ${e.windSpeedKmh}km/h`
  );

  return [
    `Real BMKG forecast for ${location.city}, ${location.province} (village: ${location.village}), next ~24h in 3-hour steps:`,
    ...lines,
  ].join('\n');
}

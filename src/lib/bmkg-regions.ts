export interface BmkgRegion {
  adm4: string;
  cityLabel: string;
}

/**
 * Curated province -> representative village-level (adm4) BMKG code.
 * BMKG's public API only accepts village-level codes, not province/city —
 * each entry here is a real, verified village in that province's capital
 * or a major city, used as a stand-in for province-level conditions.
 * Provinces not listed here simply don't get live BMKG data yet.
 */
export const BMKG_REGION_MAP: Partial<Record<string, BmkgRegion>> = {
  'dki-jakarta': { adm4: '31.71.03.1001', cityLabel: 'Jakarta Pusat' },
  'jawa-barat': { adm4: '32.73.19.1001', cityLabel: 'Bandung' },
  'jawa-tengah': { adm4: '33.74.01.1011', cityLabel: 'Semarang' },
  'jawa-timur': { adm4: '35.78.07.1002', cityLabel: 'Surabaya' },
  'di-yogyakarta': { adm4: '34.71.09.1002', cityLabel: 'Yogyakarta' },
  banten: { adm4: '36.73.01.1001', cityLabel: 'Serang' },
  'sumatera-utara': { adm4: '12.71.01.1002', cityLabel: 'Medan' },
  'sumatera-barat': { adm4: '13.71.03.1006', cityLabel: 'Padang' },
  bali: { adm4: '51.71.03.1005', cityLabel: 'Denpasar' },
  'sulawesi-selatan': { adm4: '73.71.04.1002', cityLabel: 'Makassar' },
};

export const INDONESIA_BOUNDS = {
  minLat: -11,
  maxLat: 6,
  minLng: 95,
  maxLng: 141,
};

export function isWithinIndonesia(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= INDONESIA_BOUNDS.minLat &&
    lat <= INDONESIA_BOUNDS.maxLat &&
    lng >= INDONESIA_BOUNDS.minLng &&
    lng <= INDONESIA_BOUNDS.maxLng
  );
}

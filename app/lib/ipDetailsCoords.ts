/** Same shape as dashboard: backend / Next `api/ip/details` + ip-api.com lat/lon */
export function coordsFromIpDetailsBody(data: unknown): { lat: number; lng: number } | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const lat = typeof o.latitude === "number" ? o.latitude : typeof o.lat === "number" ? o.lat : null;
  const lng =
    typeof o.longitude === "number" ? o.longitude : typeof o.lon === "number" ? o.lon : null;
  if (
    lat == null ||
    lng == null ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return { lat, lng };
}

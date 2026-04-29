const REVERSE_GEO_URL = "https://api.bargad.ai/api/v1/fifthservice/reverse-geo";

export function resolveBargadGeneratedApiKey(): string {
  const a = process.env.NEXT_PUBLIC_GENERATED_API_KEY?.trim();
  const b = process.env.NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY?.trim();
  return a || b || "";
}

function strVal(r: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Normalize common Bargad / Mappls-style reverse-geo JSON shapes */
export function extractAddressFromReverseGeoJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const firstArrayItem = (arr: unknown): Record<string, unknown> | null => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const x = arr[0];
    return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
  };

  const nestedData = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : null;

  let r: Record<string, unknown> | null =
    firstArrayItem(o.results) ||
    firstArrayItem(o.data) ||
    (nestedData ? firstArrayItem(nestedData.results) : null) ||
    null;

  if (!r && typeof o.result === "object" && o.result && !Array.isArray(o.result)) {
    r = o.result as Record<string, unknown>;
  }

  if (!r && (strVal(o, ["formatted_address", "formattedAddress", "address"]) || strVal(o, ["city"]))) {
    r = o;
  }

  if (!r) return null;

  const line =
    strVal(r, ["formatted_address", "formattedAddress", "formatted_address_line", "address"]) ||
    (() => {
      const parts = [
        strVal(r, ["district", "subDistrict"]),
        strVal(r, ["city", "town", "village"]),
        strVal(r, ["state", "region"]),
        strVal(r, ["pincode", "postal_code", "zip"]),
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : "";
    })();

  return line || null;
}

export async function fetchBargadReverseGeoLine(
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  if (!apiKey.trim()) return null;
  try {
    const response = await fetch(REVERSE_GEO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "generated-api-key": apiKey,
      },
      body: JSON.stringify({ lat, long: lng }),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) return null;
    return extractAddressFromReverseGeoJson(data);
  } catch {
    return null;
  }
}

export const IP_ADV_ENDPOINT = "https://api.bargad.ai/api/v1/thirdservice/ip_adv";

function firstNonEmptyTrimmed(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return "";
}

/** Bargad ip_adv header `generated-api-key` (NEXT_PUBLIC_* so it is available in the browser). */
export const resolveIpAdvApiKey = () =>
  firstNonEmptyTrimmed(
    process.env.NEXT_PUBLIC_GENERATED_API_KEY,
    process.env.NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY,
  );

const isBlacklistFieldKey = (key: string) => {
  const k = key.toLowerCase();
  return (
    k === "blacklist" ||
    k === "blocklist" ||
    k.startsWith("blacklist_") ||
    k.endsWith("_blacklist") ||
    k === "is_blacklisted" ||
    k === "was_blacklisted" ||
    k.includes("dnsbl") ||
    k.includes("spamhaus")
  );
};

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Best-effort lat/lng from ip_adv `result` (flat or nested `location` / `geo`). */
export function pickLatLngFromIpAdvResult(result: Record<string, unknown> | null): {
  lat: number;
  lng: number;
} | null {
  if (!result) return null;

  const fromObj = (o: Record<string, unknown>) => {
    const lat =
      toFiniteNumber(o.latitude) ??
      toFiniteNumber(o.lat) ??
      toFiniteNumber(o.Latitude) ??
      toFiniteNumber(o.Lat);
    const lng =
      toFiniteNumber(o.longitude) ??
      toFiniteNumber(o.lng) ??
      toFiniteNumber(o.long) ??
      toFiniteNumber(o.Longitude) ??
      toFiniteNumber(o.Lon);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  };

  const direct = fromObj(result);
  if (direct) return direct;

  for (const key of ["location", "geo", "geolocation", "coordinates"]) {
    const nested = result[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const p = fromObj(nested as Record<string, unknown>);
      if (p) return p;
    }
  }

  return null;
}

export const partitionIpAdvResult = (data: Record<string, unknown> | null) => {
  const blacklist: Record<string, unknown> = {};
  const information: Record<string, unknown> = {};
  if (!data) return { blacklist, information };
  for (const [key, value] of Object.entries(data)) {
    if (isBlacklistFieldKey(key)) blacklist[key] = value;
    else information[key] = value;
  }
  return { blacklist, information };
};

export async function fetchIpAdvForIp(ip: string, apiKey: string) {
  const trimmed = ip?.trim();
  if (!apiKey) {
    return {
      ok: false as const,
      result: null as Record<string, unknown> | null,
      rawJson: null as string | null,
      errorMessage:
        "Missing API key: add NEXT_PUBLIC_GENERATED_API_KEY (or NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY) to frontend/.env.local and restart the dev server.",
    };
  }
  if (!trimmed) {
    return {
      ok: false as const,
      result: null,
      rawJson: null,
      errorMessage: "Missing IP address",
    };
  }

  try {
    const response = await fetch(IP_ADV_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "generated-api-key": apiKey,
      },
      body: JSON.stringify({ ip: trimmed }),
    });
    const data = (await response.json()) as Record<string, unknown>;
    const rawJson = JSON.stringify(data, null, 2);
    const result =
      data?.result && typeof data.result === "object" && !Array.isArray(data.result)
        ? (data.result as Record<string, unknown>)
        : null;

    if (response.ok && result) {
      return { ok: true as const, result, rawJson, errorMessage: null as string | null };
    }

    const msg =
      typeof data?.message === "string"
        ? data.message
        : !response.ok
          ? `Request failed (${response.status})`
          : "Unexpected response shape (expected result object)";
    return { ok: false as const, result: null, rawJson, errorMessage: msg };
  } catch (e) {
    return {
      ok: false as const,
      result: null,
      rawJson: null,
      errorMessage: e instanceof Error ? e.message : "ip_adv request failed",
    };
  }
}

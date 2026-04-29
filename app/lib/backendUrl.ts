const REMOTE_FALLBACK = "https://test-app-backend-uyyi.onrender.com";
/** Dev Nest default; `npm run start:dev` in backend uses PORT=3001 so Next can use 3000. */
const LOCAL_DEV_DEFAULT = "http://localhost:3001";

function defaultBaseWhenUnset(): string {
  return process.env.NODE_ENV === "development" ? LOCAL_DEV_DEFAULT : REMOTE_FALLBACK;
}

/** Base URL for Nest API (client or server). In development, defaults to local Nest on port 3001. */
export function resolveBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!raw) {
    return defaultBaseWhenUnset();
  }

  const normalized = raw.replace(/\/+$/, "");

  try {
    const parsed = new URL(normalized);
    const isFrontendHost =
      typeof window !== "undefined" && parsed.host === window.location.host;

    if (isFrontendHost || parsed.hostname.includes("test-app-frontend-nine.vercel.app")) {
      return defaultBaseWhenUnset();
    }

    return normalized;
  } catch {
    return defaultBaseWhenUnset();
  }
}

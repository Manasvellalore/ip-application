"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/app/components/navbar";
import { ClipboardCopyButton } from "@/app/components/ClipboardCopyButton";
import MapplsIndiaMap, {
  MAPPLS_MARKER_ICON_GPS,
  MAPPLS_MARKER_ICON_IP,
  type IndiaMapMarker,
} from "@/app/components/MapplsIndiaMap";
import Script from "next/script";
import { sendSdkData } from "@/app/components/sendSDKData";
import { resolveBackendUrl } from "@/app/lib/backendUrl";
import { fetchBargadReverseGeoLine, resolveBargadGeneratedApiKey } from "@/app/lib/bargadGeo";
import { fetchIpAdvForIp, partitionIpAdvResult, resolveIpAdvApiKey } from "@/app/lib/bargadIpAdv";

export default function Dashboard() {
  const [sessionMeta, setSessionMeta] = useState({
    user: { name: "Authorized User", id: "N/A" },
    loginTime: "--",
  });
  const [ipAdvData, setIpAdvData] = useState<Record<string, unknown> | null>(null);
  const [ipAdvError, setIpAdvError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState("Requesting GPS access...");
  const [isMapScriptLoaded, setIsMapScriptLoaded] = useState(false);
  const [gpsAddressLine, setGpsAddressLine] = useState("");
  const [gpsAddressLoading, setGpsAddressLoading] = useState(false);
  const [ipAddressLine, setIpAddressLine] = useState("");
  const [ipAddressLoading, setIpAddressLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [ipCoords, setIpCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [ipData, setIpData] = useState({
    ip: "Loading...",
    isp: "Detecting...",
    asn: "---",
    location: "---",
    region: "---",
  });

  // ================= ADVANCED IP (Bargad: generated-api-key + body { ip }) =================
  const fetchAdvancedIP = async (ip: string) => {
    const trimmed = ip?.trim();

    if (!trimmed || ["N/A", "Loading...", "localhost", "127.0.0.1"].includes(trimmed)) {
      setIpAdvData(null);
      if (trimmed && ["localhost", "127.0.0.1"].includes(trimmed)) {
        setIpAdvError("Advanced IP lookup is not run for local addresses.");
      } else {
        setIpAdvError("No public IP available for advanced lookup.");
      }
      return;
    }
  
    const apiKey = resolveIpAdvApiKey();
    if (!apiKey) {
      setIpAdvError("Missing API key: set NEXT_PUBLIC_GENERATED_API_KEY or NEXT_PUBLIC_IP_ADV_GENERATED_API_KEY in frontend/.env.local, then restart `npm run dev`.");
      return;
    }

    setIpAdvError(null);

    const { ok, result, errorMessage } = await fetchIpAdvForIp(trimmed, apiKey);

    if (ok && result) {
      setIpAdvData(result);
    } else {
      setIpAdvData(null);
      setIpAdvError(errorMessage || "Advanced IP request failed");
    }
  };

  // ================= IP =================
  const fetchSecurityProfile = useCallback(async () => {
    try {
      const backendUrl = resolveBackendUrl();
      const response = await fetch(`${backendUrl}/api/ip/details`);
      const data = await response.json();
      setIpData({
        ip: data.ip || "N/A",
        isp: data.isp || "Unknown",
        asn: data.asn || "---",
        location: data.location || "---",
        region: data.region || "---",
      });
      setIpCoords({
        lat: data.latitude ?? null,
        lng: data.longitude ?? null,
      });
      void fetchAdvancedIP(data.ip || "");
    } catch (err) {
      console.error("IP Fetch Error:", err);
    }
  }, []);

  // ================= INIT =================
  useEffect(() => {
    const name = localStorage.getItem("user_name") || "Authorized User";
    const id = localStorage.getItem("user_id") || "N/A";
    const loginTime = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    queueMicrotask(() => {
      setSessionMeta({ user: { name, id }, loginTime });
    });

    const requestGpsLocation = (useHighAccuracy = true) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus("GPS location captured");
        },
        (error) => {
          if (error.code === error.TIMEOUT && useHighAccuracy) {
            setGpsStatus("Retrying GPS with balanced accuracy...");
            requestGpsLocation(false);
            return;
          }
          if (error.code === error.PERMISSION_DENIED) {
            setGpsStatus("GPS permission denied");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGpsStatus("GPS position unavailable");
          } else if (error.code === error.TIMEOUT) {
            setGpsStatus("GPS request timed out");
          } else {
            setGpsStatus("Unable to fetch GPS location");
          }
          console.warn("GPS fetch error:", error);
        },
        useHighAccuracy
          ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
          : { enableHighAccuracy: false, timeout: 20000, maximumAge: 120_000 }
      );
    };

    queueMicrotask(() => {
      void sendSdkData({ skipGeolocation: true })
        .then((savedData) => {
          const sessionId = savedData?.session?.session_id;
          if (sessionId) {
            localStorage.setItem("session_id", sessionId);
          }
        })
        .catch((err) => {
          console.error("SDK Send Error:", err);
        });

      void fetchSecurityProfile();

      if (navigator.geolocation) {
        setGpsStatus("Fetching GPS coordinates...");
        requestGpsLocation();
      } else {
        setGpsStatus("Geolocation not supported in this browser");
      }
    });
  }, [fetchSecurityProfile]);

  // ================= REVERSE GEO (GPS + IP lat/lng) =================
  useEffect(() => {
    if (gpsCoords.lat === null || gpsCoords.lng === null) {
      queueMicrotask(() => {
        setGpsAddressLine("");
        setGpsAddressLoading(false);
      });
      return;
    }
    let cancelled = false;
    const lat = gpsCoords.lat;
    const lng = gpsCoords.lng;
    queueMicrotask(() => {
      if (cancelled || lat === null || lng === null) return;
      const apiKey = resolveBargadGeneratedApiKey();
      setGpsAddressLoading(true);
      setGpsAddressLine("");
      fetchBargadReverseGeoLine(lat, lng, apiKey)
        .then((line) => {
          if (!cancelled) setGpsAddressLine(line ?? "");
        })
        .finally(() => {
          if (!cancelled) setGpsAddressLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [gpsCoords.lat, gpsCoords.lng]);

  useEffect(() => {
    if (ipCoords.lat === null || ipCoords.lng === null) {
      queueMicrotask(() => {
        setIpAddressLine("");
        setIpAddressLoading(false);
      });
      return;
    }
    let cancelled = false;
    const lat = ipCoords.lat;
    const lng = ipCoords.lng;
    queueMicrotask(() => {
      if (cancelled || lat === null || lng === null) return;
      const apiKey = resolveBargadGeneratedApiKey();
      setIpAddressLoading(true);
      setIpAddressLine("");
      fetchBargadReverseGeoLine(lat, lng, apiKey)
        .then((line) => {
          if (!cancelled) setIpAddressLine(line ?? "");
        })
        .finally(() => {
          if (!cancelled) setIpAddressLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [ipCoords.lat, ipCoords.lng]);

  const dashboardMarkers = useMemo((): IndiaMapMarker[] => {
    const out: IndiaMapMarker[] = [];
    if (gpsCoords.lat !== null && gpsCoords.lng !== null) {
      out.push({
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        label: "GPS",
        icon: MAPPLS_MARKER_ICON_GPS,
      });
    }
    if (ipCoords.lat !== null && ipCoords.lng !== null) {
      out.push({
        lat: ipCoords.lat,
        lng: ipCoords.lng,
        label: "IP",
        icon: MAPPLS_MARKER_ICON_IP,
      });
    }
    return out;
  }, [gpsCoords.lat, gpsCoords.lng, ipCoords.lat, ipCoords.lng]);

  const dashboardPolylinePath = useMemo(() => {
    if (
      gpsCoords.lat === null ||
      gpsCoords.lng === null ||
      ipCoords.lat === null ||
      ipCoords.lng === null
    ) {
      return null;
    }
    return [
      { lat: gpsCoords.lat, lng: gpsCoords.lng },
      { lat: ipCoords.lat, lng: ipCoords.lng },
    ];
  }, [gpsCoords.lat, gpsCoords.lng, ipCoords.lat, ipCoords.lng]);

  // ================= DERIVED =================
  const ipAdvPartitions = useMemo(
    () => partitionIpAdvResult(ipAdvData && typeof ipAdvData === "object" ? ipAdvData : null),
    [ipAdvData]
  );
  const ipAdvBlacklistJson = useMemo(
    () => JSON.stringify(ipAdvPartitions.blacklist, null, 2),
    [ipAdvPartitions]
  );
  const ipAdvInformationJson = useMemo(
    () => JSON.stringify(ipAdvPartitions.information, null, 2),
    [ipAdvPartitions]
  );
  const ipAdvHasResult = ipAdvData !== null && typeof ipAdvData === "object";

  const mismatchDistance = useMemo(
    () =>
      gpsCoords.lat !== null &&
      gpsCoords.lng !== null &&
      ipCoords.lat !== null &&
      ipCoords.lng !== null
        ? (() => {
            const R = 6371;
            const dLat = ((ipCoords.lat! - gpsCoords.lat!) * Math.PI) / 180;
            const dLon = ((ipCoords.lng! - gpsCoords.lng!) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((gpsCoords.lat! * Math.PI) / 180) *
                Math.cos((ipCoords.lat! * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          })()
        : null,
    [gpsCoords.lat, gpsCoords.lng, ipCoords.lat, ipCoords.lng]
  );

  const driftLabel =
    mismatchDistance != null ? `${mismatchDistance.toFixed(2)} km apart` : null;

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Script
        src={`https://apis.mappls.com/advancedmaps/api/${process.env.NEXT_PUBLIC_MAP_KEY}/map_sdk?v=3.0`}
        strategy="lazyOnload"
        onLoad={() => setIsMapScriptLoaded(true)}
      />

      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 bg-[#000000] p-6">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">
            Welcome,{" "}
            <span suppressHydrationWarning className="text-green-400">
              {sessionMeta.user.name}
            </span>
          </h1>
          <p className="text-sm text-gray-400">
            Session: <span suppressHydrationWarning>{sessionMeta.loginTime}</span>
          </p>
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* IP CARD */}
          <div className="p-4 bg-white/5 rounded-xl">
            <h3 className="text-green-400 text-xs mb-3">IP Details</h3>
            <p className="text-xs">{ipData.ip}</p>
            <p className="text-xs">{ipData.isp}</p>
            <p className="text-xs">
              Lat/Lng:{" "}
              {ipCoords.lat !== null && ipCoords.lng !== null
                ? `${ipCoords.lat.toFixed(6)}, ${ipCoords.lng.toFixed(6)}`
                : "---"}
            </p>
          </div>

          {/* LOCATION CARD */}
          <div className="p-4 bg-white/5 rounded-xl">
            <h3 className="text-green-400 text-xs mb-3">Location</h3>
            <p className="text-xs text-gray-300 mb-2">{gpsStatus}</p>
            <p className="text-xs">
              GPS:{" "}
              {gpsCoords.lat !== null && gpsCoords.lng !== null
                ? `${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}`
                : "---"}
            </p>
          </div>

          {/* REVERSE GEO: IP vs GPS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:col-span-3">
            <div className="rounded-xl border border-sky-500/20 bg-white/5 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                IP Address
              </h3>
              <p className="text-xs leading-relaxed text-gray-200">
                {ipCoords.lat === null || ipCoords.lng === null
                  ? "Waiting for IP coordinates…"
                  : ipAddressLoading
                    ? "Resolving address…"
                    : ipAddressLine
                      ? ipAddressLine
                      : "Could not resolve address (check NEXT_PUBLIC_GENERATED_API_KEY and API response)."}
              </p>
              {ipCoords.lat !== null && ipCoords.lng !== null && (
                <p className="mt-2 text-[10px] text-gray-500">
                  {ipCoords.lat.toFixed(5)}, {ipCoords.lng.toFixed(5)}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-white/5 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                GPS location address
              </h3>
              <p className="text-xs leading-relaxed text-gray-200">
                {gpsCoords.lat === null || gpsCoords.lng === null
                  ? "Waiting for GPS…"
                  : gpsAddressLoading
                    ? "Resolving address…"
                    : gpsAddressLine
                      ? gpsAddressLine
                      : "Could not resolve address (check NEXT_PUBLIC_GENERATED_API_KEY and API response)."}
              </p>
              {gpsCoords.lat !== null && gpsCoords.lng !== null && (
                <p className="mt-2 text-[10px] text-gray-500">
                  {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>

          {/* MAP CARD */}
          <div className="p-4 bg-white/5 rounded-xl md:col-span-2">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <h3 className="text-green-400 text-xs shrink-0">India Map</h3>
              {driftLabel ? (
                <span className="inline-flex w-fit shrink-0 rounded-full border border-[#24aa4d]/70 bg-[#1a6b32]/95 px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-950/50 ring-2 ring-[#24aa4d]/40 sm:mt-0 sm:max-w-[min(100%,16rem)] sm:text-right">
                  Distance: {driftLabel}
                </span>
              ) : null}
            </div>

            <MapplsIndiaMap
              containerId="mappls-dashboard-map"
              mapScriptReady={isMapScriptLoaded}
              markers={dashboardMarkers}
              polylinePath={dashboardPolylinePath}
            />
          </div>

          <div className="p-4 bg-white/5 rounded-xl md:col-span-3">
            {ipAdvError && (
              <p
                className={`text-sm mb-3 ${
                  ipAdvError.startsWith("Advanced IP lookup is not run") ||
                  ipAdvError.startsWith("No public IP available")
                    ? "text-gray-400"
                    : "text-red-400"
                }`}
              >
                {ipAdvError}
              </p>
            )}
            {!ipAdvHasResult && !ipAdvError ? (
              <p className="text-gray-400 text-sm">Loading advanced IP data…</p>
            ) : ipAdvHasResult ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-400/90">
                    Blacklist
                  </h4>
                  <div className="relative">
                    <ClipboardCopyButton
                      text={ipAdvBlacklistJson}
                      className="absolute right-3 top-3 z-10 rounded-md border border-amber-500/40 bg-black/80 p-1.5 text-amber-400/90 transition-colors hover:bg-amber-500/10"
                    />
                    <pre className="max-h-[min(55vh,420px)] overflow-auto rounded-lg border border-amber-500/25 bg-black/60 px-4 pb-4 pt-10 pr-12 text-left font-mono text-[13px] leading-relaxed text-gray-200 shadow-inner [tab-size:2]">
                      {ipAdvBlacklistJson}
                    </pre>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-400/90">
                    Information
                  </h4>
                  <div className="relative">
                    <ClipboardCopyButton
                      text={ipAdvInformationJson}
                      className="absolute right-3 top-3 z-10 rounded-md border border-sky-500/40 bg-black/80 p-1.5 text-sky-400/90 transition-colors hover:bg-sky-500/10"
                    />
                    <pre className="max-h-[min(55vh,420px)] overflow-auto rounded-lg border border-sky-500/25 bg-black/60 px-4 pb-4 pt-10 pr-12 text-left font-mono text-[13px] leading-relaxed text-gray-200 shadow-inner [tab-size:2]">
                      {ipAdvInformationJson}
                    </pre>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        </div>
      </main>
    </div>
  );
}
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import BargadShellHeader from "@/app/components/BargadShellHeader";
import MapplsIndiaMap, {
  MAPPLS_MARKER_ICON_IP,
  type IndiaMapMarker,
} from "@/app/components/MapplsIndiaMap";
import {
  fetchIpAdvForIp,
  partitionIpAdvResult,
  pickLatLngFromIpAdvResult,
  resolveIpAdvApiKey,
} from "@/app/lib/bargadIpAdv";
import { coordsFromIpDetailsBody } from "@/app/lib/ipDetailsCoords";
import { fetchBargadReverseGeoLine, resolveBargadGeneratedApiKey } from "@/app/lib/bargadGeo";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function IpCheckContent() {
  const searchParams = useSearchParams();
  const ipParam = searchParams.get("ip")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partitions, setPartitions] = useState<{
    blacklist: Record<string, unknown>;
    information: Record<string, unknown>;
  } | null>(null);
  const [ipMapCoords, setIpMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ipMapAddressLine, setIpMapAddressLine] = useState("");
  const [ipMapAddressLoading, setIpMapAddressLoading] = useState(false);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);

  const mapKey = process.env.NEXT_PUBLIC_MAP_KEY?.trim();

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;

      if (!ipParam) {
        setLoading(false);
        setError("No IP provided. Go back and enter an IP address.");
        setPartitions(null);
        setIpMapCoords(null);
        setIpMapAddressLine("");
        setIpMapAddressLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPartitions(null);
      setIpMapCoords(null);
      setIpMapAddressLine("");
      setIpMapAddressLoading(false);

      void (async () => {
        const apiKey = resolveIpAdvApiKey();

        const [adv, detailsRes] = await Promise.all([
          fetchIpAdvForIp(ipParam, apiKey),
          fetch(`/api/ip/details?ip=${encodeURIComponent(ipParam)}`, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (cancelled) return;

        const detailsJson: unknown = await detailsRes.json().catch(() => null);
        const fromDetails = detailsRes.ok ? coordsFromIpDetailsBody(detailsJson) : null;

        if (adv.ok && adv.result) {
          setPartitions(partitionIpAdvResult(adv.result));
          setError(null);
        } else {
          setPartitions(null);
          setError(adv.errorMessage || "ip_adv lookup failed");
        }

        const fromAdv = adv.ok && adv.result ? pickLatLngFromIpAdvResult(adv.result) : null;
        setIpMapCoords(fromDetails ?? fromAdv ?? null);

        setLoading(false);
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [ipParam]);

  useEffect(() => {
    if (!ipMapCoords) {
      queueMicrotask(() => {
        setIpMapAddressLine("");
        setIpMapAddressLoading(false);
      });
      return;
    }
    let cancelled = false;
    const { lat, lng } = ipMapCoords;
    queueMicrotask(() => {
      if (cancelled) return;
      const apiKey = resolveBargadGeneratedApiKey();
      setIpMapAddressLoading(true);
      setIpMapAddressLine("");
      void fetchBargadReverseGeoLine(lat, lng, apiKey)
        .then((line) => {
          if (!cancelled) setIpMapAddressLine(line ?? "");
        })
        .finally(() => {
          if (!cancelled) setIpMapAddressLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [ipMapCoords?.lat, ipMapCoords?.lng]);

  const blacklistJson = partitions ? JSON.stringify(partitions.blacklist, null, 2) : "";
  const informationJson = partitions ? JSON.stringify(partitions.information, null, 2) : "";

  const ipMapMarkers = useMemo((): IndiaMapMarker[] => {
    if (!ipMapCoords) return [];
    const addr =
      ipMapAddressLoading && !ipMapAddressLine
        ? "Resolving address…"
        : ipMapAddressLine ||
          "Could not resolve address (check NEXT_PUBLIC_GENERATED_API_KEY).";
    const coords = `${ipMapCoords.lat.toFixed(6)}, ${ipMapCoords.lng.toFixed(6)}`;
    const popupHtml = [
      `<b>IP</b><br/>${escapeHtml(ipParam)}`,
      `<br/><br/><b>Coordinates</b><br/>${escapeHtml(coords)}`,
      `<br/><br/><b>Address</b><br/>${escapeHtml(addr)}`,
    ].join("");
    return [
      {
        lat: ipMapCoords.lat,
        lng: ipMapCoords.lng,
        label: "IP",
        icon: MAPPLS_MARKER_ICON_IP,
        popupHtml,
      },
    ];
  }, [ipMapCoords, ipParam, ipMapAddressLine, ipMapAddressLoading]);

  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-white">
      <BargadShellHeader />

      {mapKey ? (
        <Script
          src={`https://apis.mappls.com/advancedmaps/api/${mapKey}/map_sdk?v=3.0`}
          strategy="lazyOnload"
          onLoad={() => setMapScriptLoaded(true)}
        />
      ) : null}

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#24aa4d]">IP lookup</p>
            <h1 className="mt-1 font-mono text-lg text-white sm:text-xl">{ipParam || "—"}</h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-[#24aa4d]/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#5edd7c] hover:bg-[#24aa4d]/10"
          >
            Back
          </Link>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && error && !partitions && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>
        )}

        {!loading && partitions && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-400/90">
                Blacklist
              </h2>
              <pre className="max-h-[min(55vh,420px)] overflow-auto rounded-lg border border-amber-500/25 bg-black/60 p-4 text-left font-mono text-[13px] leading-relaxed text-gray-200 shadow-inner [tab-size:2]">
                {blacklistJson}
              </pre>
            </div>
            <div className="min-w-0">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-400/90">
                Information
              </h2>
              <pre className="max-h-[min(55vh,420px)] overflow-auto rounded-lg border border-sky-500/25 bg-black/60 p-4 text-left font-mono text-[13px] leading-relaxed text-gray-200 shadow-inner [tab-size:2]">
                {informationJson}
              </pre>
            </div>
          </div>
        )}

        {!loading && ipParam && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-400">
              IP location (India map)
            </h2>
            {!mapKey ? (
              <p className="text-xs text-gray-500">
                Set NEXT_PUBLIC_MAP_KEY to show the map (same as dashboard).
              </p>
            ) : ipMapCoords ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs leading-relaxed text-gray-200">
                  <p>
                    <span className="text-gray-500">Coordinates: </span>
                    {ipMapCoords.lat.toFixed(6)}, {ipMapCoords.lng.toFixed(6)}
                  </p>
                  <p className="mt-1">
                    <span className="text-gray-500">Address: </span>
                    {ipMapAddressLoading && !ipMapAddressLine
                      ? "Resolving address…"
                      : ipMapAddressLine ||
                        "Could not resolve address (check NEXT_PUBLIC_GENERATED_API_KEY)."}
                  </p>
                </div>
                <MapplsIndiaMap
                  key={`${ipParam}-${ipMapCoords.lat}-${ipMapCoords.lng}`}
                  containerId="mappls-ip-check-map"
                  mapScriptReady={mapScriptLoaded}
                  markers={ipMapMarkers}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No coordinates returned for this IP from ip details or ip_adv.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IpCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[#000000] text-white">
          <BargadShellHeader />
          <p className="p-8 text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <IpCheckContent />
    </Suspense>
  );
}

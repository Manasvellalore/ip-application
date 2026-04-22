"use client";

import { useEffect, useRef } from "react";

/** Mappls-hosted pin sprites (see Marker `icon` in Mappls Web JS v3 docs) */
export const MAPPLS_MARKER_ICON_GPS = "https://apis.mappls.com/map_v3/2.png";
export const MAPPLS_MARKER_ICON_IP = "https://apis.mappls.com/map_v3/1.png";
export const MAPPLS_PIN_WIDTH = 32;
export const MAPPLS_PIN_HEIGHT = 42;
export const MAPPLS_PIN_OFFSET: [number, number] = [
  MAPPLS_PIN_WIDTH / 2,
  MAPPLS_PIN_HEIGHT,
];

export type IndiaMapMarker = {
  lat: number;
  lng: number;
  label: string;
  icon: string;
  /** If omitted, popup is `<b>${label}</b>` (dashboard default). */
  popupHtml?: string;
};

type MapplsPolylineInstance = { remove?: () => void; setMap?: (map: unknown) => void };

function getMapplsPolylineCtor():
  | (new (options: Record<string, unknown>) => MapplsPolylineInstance)
  | null {
  const m = typeof window !== "undefined" ? window.mappls : undefined;
  if (!m) return null;
  const Poly = (m as { Polyline?: unknown; polyline?: unknown }).Polyline;
  const poly = (m as { Polyline?: unknown; polyline?: unknown }).polyline;
  if (typeof Poly === "function") return Poly as new (o: Record<string, unknown>) => MapplsPolylineInstance;
  if (typeof poly === "function") return poly as new (o: Record<string, unknown>) => MapplsPolylineInstance;
  return null;
}

declare global {
  interface Window {
    mappls?: {
      Map: new (container: string | HTMLElement, options: Record<string, unknown>) => {
        addListener?: (event: string, callback: () => void) => void;
        fitBounds?: (bounds: [number, number][], options?: Record<string, unknown>) => void;
        remove?: () => void;
      };
      Marker: new (options: Record<string, unknown>) => {
        addTo?: (map: unknown) => void;
        remove?: () => void;
        setMap?: (map: unknown) => void;
      };
      Polyline: new (options: Record<string, unknown>) => {
        remove?: () => void;
        setMap?: (map: unknown) => void;
      };
      polyline?: new (options: Record<string, unknown>) => {
        remove?: () => void;
        setMap?: (map: unknown) => void;
      };
    };
  }
}

type Props = {
  /** Must be unique per map on the page (e.g. `mappls-dashboard-map`). */
  containerId: string;
  mapScriptReady: boolean;
  markers: IndiaMapMarker[];
  /** When length ≥ 2, draws a line between points in order (e.g. GPS → IP). */
  polylinePath?: { lat: number; lng: number }[] | null;
  className?: string;
};

/**
 * Same Mappls Web JS v3 behaviour as the dashboard: one map instance, markers refreshed on prop changes,
 * optional polyline, `fitBounds` when multiple markers.
 */
export default function MapplsIndiaMap({
  containerId,
  mapScriptReady,
  markers,
  polylinePath,
  className = "h-80 w-full rounded-xl border border-white/10",
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInitialized = useRef(false);
  const mapLayoutGeneration = useRef(0);
  const mapRef = useRef<{
    addListener?: (event: string, callback: () => void) => void;
    fitBounds?: (bounds: [number, number][], options?: Record<string, unknown>) => void;
    remove?: () => void;
  } | null>(null);
  const markerRefs = useRef<Array<{ remove?: () => void; setMap?: (map: unknown) => void }>>([]);
  const polylineRef = useRef<MapplsPolylineInstance | null>(null);

  useEffect(() => {
    if (!mapScriptReady || !mapContainerRef.current || !window.mappls) return;

    const markerList = markers.filter(
      (m) =>
        typeof m.lat === "number" &&
        typeof m.lng === "number" &&
        Number.isFinite(m.lat) &&
        Number.isFinite(m.lng)
    );
    if (markerList.length === 0) return;

    const layoutGen = ++mapLayoutGeneration.current;

    const centerLat = markerList.reduce((s, m) => s + m.lat, 0) / markerList.length;
    const centerLng = markerList.reduce((s, m) => s + m.lng, 0) / markerList.length;

    if (!mapInitialized.current) {
      mapInitialized.current = true;
      mapRef.current = new window.mappls.Map(containerId, {
        center: [centerLng, centerLat],
        zoom: 10,
      });
    }

    const path =
      polylinePath && polylinePath.length >= 2
        ? polylinePath.filter(
            (p) =>
              typeof p.lat === "number" &&
              typeof p.lng === "number" &&
              Number.isFinite(p.lat) &&
              Number.isFinite(p.lng)
          )
        : null;
    const drawPolyline = path != null && path.length >= 2;

    const placeMarkers = () => {
      if (!mapRef.current || !window.mappls) return;

      markerRefs.current.forEach((m) => {
        m.remove?.();
        m.setMap?.(null);
      });
      markerRefs.current = [];

      if (polylineRef.current) {
        polylineRef.current.remove?.();
        polylineRef.current.setMap?.(null);
      }

      markerList.forEach((m) => {
        const popupHtml = m.popupHtml ?? `<b>${m.label}</b>`;
        const marker = new window.mappls!.Marker({
          map: mapRef.current,
          position: { lat: m.lat, lng: m.lng },
          icon: m.icon,
          width: MAPPLS_PIN_WIDTH,
          height: MAPPLS_PIN_HEIGHT,
          offset: MAPPLS_PIN_OFFSET,
          popupHtml,
          clusters: false,
        });
        markerRefs.current.push(marker);
      });

      if (markerList.length > 1) {
        mapRef.current?.fitBounds?.(
          markerList.map((m) => [m.lng, m.lat] as [number, number]),
          { padding: 100 }
        );
      }

      if (drawPolyline && path) {
        const PolyCtor = getMapplsPolylineCtor();
        if (PolyCtor) {
          requestAnimationFrame(() => {
            if (layoutGen !== mapLayoutGeneration.current || !mapRef.current) return;
            try {
              polylineRef.current = new PolyCtor({
                map: mapRef.current,
                paths: path,
                strokeColor: "#3b82f6",
                strokeOpacity: 1,
                strokeWeight: 5,
                lineCap: "round",
                zIndex: 20,
              });
            } catch {
              if (layoutGen !== mapLayoutGeneration.current || !mapRef.current) return;
              try {
                polylineRef.current = new PolyCtor({
                  map: mapRef.current,
                  path: path,
                  strokeColor: "#3b82f6",
                  strokeOpacity: 1,
                  strokeWeight: 5,
                  lineCap: "round",
                  zIndex: 20,
                });
              } catch {
                /* ignore polyline errors */
              }
            }
          });
        }
      }
    };

    mapRef.current?.addListener?.("load", placeMarkers);
    const fallback = setTimeout(placeMarkers, 650);

    return () => clearTimeout(fallback);
  }, [mapScriptReady, containerId, markers, polylinePath]);

  return (
    <div className="relative">
      <div id={containerId} ref={mapContainerRef} className={className} />
    </div>
  );
}

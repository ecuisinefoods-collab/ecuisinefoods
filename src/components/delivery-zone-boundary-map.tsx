"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Search, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { addMapBaseLayer, loadLeaflet } from "@/lib/leaflet-loader";

declare global { interface Window { L?: any } }
export type BoundaryPoint = [number, number]; // [longitude, latitude]
type PreviewZone = { id: string; state: string; city: string; area_name: string; coverage_geojson: { type: "Polygon"; coordinates: number[][][] } | null };
type Props = {
  state: string;
  city: string;
  value: BoundaryPoint[];
  onChange: (points: BoundaryPoint[]) => void;
  zones?: PreviewZone[];
};

const CENTERS: Record<string, [number, number]> = {
  Abia: [5.4527, 7.5248], Adamawa: [9.3265, 12.3984], "Akwa Ibom": [5.0377, 7.9128], Anambra: [6.2104, 7.0699],
  Bauchi: [10.3103, 9.8439], Bayelsa: [4.9267, 6.2676], Benue: [7.3369, 8.7404], Borno: [11.8311, 13.151],
  "Cross River": [5.9631, 8.3300], Delta: [5.5325, 5.8987], Ebonyi: [6.2649, 8.0137], Edo: [6.335, 5.6037], Ekiti: [7.719, 5.311],
  Enugu: [6.5244, 7.5105], Gombe: [10.2897, 11.1673], Imo: [5.572, 7.0588], Jigawa: [12.228, 9.5616], Kaduna: [10.5105, 7.4165],
  Kano: [12.0022, 8.5919], Katsina: [12.9908, 7.6018], Kebbi: [12.4539, 4.1975], Kogi: [7.8, 6.74],
  Kwara: [8.4799, 4.5418], Lagos: [6.5244, 3.3792], Nasarawa: [8.5378, 8.3078], Niger: [9.6139, 6.5569],
  Ogun: [7.1475, 3.3619], Ondo: [7.25, 5.2], Osun: [7.5629, 4.5200], Oyo: [7.3775, 3.947],
  Plateau: [9.8965, 8.8583], Rivers: [4.8156, 7.0498], Sokoto: [13.0059, 5.2476], Taraba: [8.8937, 11.3596],
  Yobe: [11.748, 11.966], Zamfara: [12.1704, 6.6641], "Federal Capital Territory": [9.0765, 7.3986],
};
const DEFAULT_CENTER: [number, number] = [9.082, 8.6753];

export function DeliveryZoneBoundaryMap({ state, city, value, onChange, zones = [] }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const draftLayer = useRef<any>(null);
  const zoneLayers = useRef<any[]>([]);
  const pointsRef = useRef<BoundaryPoint[]>(value);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const redrawDraft = useCallback(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;
    if (draftLayer.current) draftLayer.current.remove();
    draftLayer.current = null;
    if (pointsRef.current.length >= 3) {
      draftLayer.current = L.polygon(pointsRef.current.map(([lng, lat]) => [lat, lng]), {
        color: "#087f5b", weight: 3, fillColor: "#36a56c", fillOpacity: 0.22,
      }).addTo(map);
    } else if (pointsRef.current.length >= 2) {
      draftLayer.current = L.polyline(pointsRef.current.map(([lng, lat]) => [lat, lng]), {
        color: "#087f5b", weight: 3, dashArray: "7 7",
      }).addTo(map);
    }
  }, []);

  useEffect(() => { pointsRef.current = value; redrawDraft(); }, [value, redrawDraft]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const handleResize = () => mapRef.current?.invalidateSize();

    async function initialize() {
      setReady(false);
      setMapError("");
      try {
        const L = await loadLeaflet();
        if (cancelled || !element.current || mapRef.current) return;
        const map = L.map(element.current, { scrollWheelZoom: false, zoomControl: true }).setView(CENTERS[state] || DEFAULT_CENTER, 12);
        mapRef.current = map;
        addMapBaseLayer(L, map, message => setMapError(message));
        map.on("click", (event: any) => {
          const next: BoundaryPoint[] = [...pointsRef.current, [Number(event.latlng.lng.toFixed(6)), Number(event.latlng.lat.toFixed(6))]];
          pointsRef.current = next;
          onChangeRef.current(next);
        });
        map.whenReady(() => {
          if (cancelled) return;
          setReady(true);
          window.requestAnimationFrame(() => map.invalidateSize(true));
          redrawDraft();
        });
        if ("ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(() => {
            if (mapRef.current === map) map.invalidateSize();
          });
          resizeObserver.observe(element.current);
        }
        window.addEventListener("resize", handleResize);
      } catch (error) {
        if (!cancelled) setMapError(error instanceof Error ? error.message : "The map could not be loaded. Please try again.");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      mapRef.current?.remove();
      mapRef.current = null;
      draftLayer.current = null;
      zoneLayers.current = [];
    };
  }, [redrawDraft, retryCount]);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;
    zoneLayers.current.forEach(layer => layer.remove());
    zoneLayers.current = [];
    for (const zone of zones) {
      const ring = zone.coverage_geojson?.coordinates?.[0];
      if (!ring || ring.length < 4) continue;
      const layer = L.polygon(ring.map(([lng, lat]) => [lat, lng]), {
        color: "#8b9b8b", weight: 1.5, fillColor: "#aab8a5", fillOpacity: 0.08, dashArray: "4 5",
      }).addTo(map);
      layer.bindTooltip(zone.state + " · " + zone.city + " · " + zone.area_name);
      zoneLayers.current.push(layer);
    }
  }, [zones, ready]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(CENTERS[state] || DEFAULT_CENTER, 12);
  }, [state]);

  async function findPlace(event: FormEvent) {
    event.preventDefault();
    const term = query.trim() || [city, state, "Nigeria"].filter(Boolean).join(", ");
    if (!term || !mapRef.current) return;
    setSearching(true);
    setMapError("");
    try {
      const params = new URLSearchParams({ q: term + ", Nigeria", format: "jsonv2", limit: "1", countrycodes: "ng" });
      const response = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Place search is temporarily unavailable.");
      const results = await response.json();
      if (!results?.length) throw new Error("We couldn't find that place. Try a nearby town or landmark.");
      mapRef.current.setView([Number(results[0].lat), Number(results[0].lon)], 15);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Could not search for that place.");
    } finally {
      setSearching(false);
    }
  }

  function updatePoints(next: BoundaryPoint[]) {
    pointsRef.current = next;
    onChange(next);
  }

  return <section className="rounded-2xl border border-[#dfe8da] bg-[#fbfdf9] p-4 sm:col-span-2">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-black text-[#244b34]">Draw the delivery coverage on the map</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71816f]">Search for the town, zoom in, then click around the edges of the area you deliver to. Add at least 3 boundary points. The green shape is the area customers will be charged for.</p>
      </div>
      <span className="rounded-full bg-[#eaf5e7] px-3 py-1.5 text-[10px] font-black text-[#376b42]">{value.length} boundary points</span>
    </div>
    <form onSubmit={findPlace} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={"Find a town or landmark in " + (city || state || "Nigeria")} className="min-w-0 flex-1 rounded-xl border border-[#dfe5dc] bg-white px-3 py-2.5 text-sm"/>
      <button type="submit" disabled={searching || !ready} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e0d2] bg-white px-4 py-2.5 text-xs font-bold text-[#365d3e] disabled:opacity-50"><Search size={14}/>{searching ? "Searching…" : "Find on map"}</button>
      <button type="button" onClick={() => mapRef.current?.setView(CENTERS[state] || DEFAULT_CENTER, 12)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e0d2] bg-white px-3 py-2.5 text-xs font-bold text-[#365d3e]"><LocateFixed size={14}/> State view</button>
    </form>
    <div ref={element} className="z-0 mt-3 h-[360px] w-full overflow-hidden rounded-xl bg-[#eaf0e7]" aria-label="Interactive map for drawing delivery coverage"/>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => updatePoints(pointsRef.current.slice(0, -1))} disabled={!value.length} className="inline-flex items-center gap-2 rounded-lg border border-[#dce5d8] bg-white px-3 py-2 text-xs font-bold text-[#526b56] disabled:opacity-40"><Minus size={13}/> Undo last point</button>
      <button type="button" onClick={() => updatePoints([])} disabled={!value.length} className="inline-flex items-center gap-2 rounded-lg border border-[#ead9d4] bg-white px-3 py-2 text-xs font-bold text-[#9b5144] disabled:opacity-40"><Trash2 size={13}/> Clear boundary</button>
      <span className="text-[11px] text-[#7c897b]">Tip: click in a loop around the delivery area. The polygon closes automatically when saved.</span>
    </div>
    {mapError && <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><span>{mapError}</span><button type="button" onClick={() => { setMapError(""); setRetryCount(count => count + 1); }} className="rounded-lg border border-red-200 bg-white px-3 py-2 font-bold text-red-700">Try loading again</button></div>}
    {!ready && !mapError && <p className="mt-2 text-xs text-[#899487]">Loading map…</p>}
    <p className="mt-2 text-[11px] text-[#899487]">Map data © OpenStreetMap contributors · Carto fallback tiles when needed.</p>
  </section>;
}

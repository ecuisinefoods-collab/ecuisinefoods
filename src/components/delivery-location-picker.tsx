"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, RotateCcw } from "lucide-react";

declare global { interface Window { L?: any } }

type Props = {
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  zones?: { id:string; state:string; city:string; area_name:string; coverage_geojson:{type:"Polygon";coordinates:number[][][]}|null }[];
};

const CENTERS: Record<string, [number, number]> = {
  Plateau: [9.8965, 8.8583],
  Bauchi: [10.3103, 9.8439],
  Rivers: [4.8156, 7.0498],
  Lagos: [6.5244, 3.3792],
  "Federal Capital Territory": [9.0765, 7.3986],
  default: [9.082, 8.6753],
};

export function DeliveryLocationPicker({ state, city, latitude, longitude, onChange, zones = [] }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const marker = useRef<any>(null);
  const zoneLayers = useRef<any[]>([]);
  const onChangeRef = useRef(onChange);
  const [mapError, setMapError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    const initialize = () => {
      if (cancelled || !mapElement.current || !window.L || mapInstance.current) return;
      const L = window.L;
      const center = CENTERS[state] || CENTERS.default;
      const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(center, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (event: any) => {
        const lat = Number(event.latlng.lat.toFixed(6));
        const lng = Number(event.latlng.lng.toFixed(6));
        if (marker.current) marker.current.setLatLng([lat, lng]);
        else marker.current = L.marker([lat, lng]).addTo(map);
        onChangeRef.current(lat, lng);
      });
      mapInstance.current = map;
      if (latitude !== null && longitude !== null) {
        marker.current = L.marker([latitude, longitude]).addTo(map);
        map.setView([latitude, longitude], 16);
      }
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 100);
    };

    if (!document.querySelector('link[data-ecuisine-leaflet="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.ecuisineLeaflet = "true";
      document.head.appendChild(link);
    }

    if (window.L) initialize();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-ecuisine-leaflet="true"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.dataset.ecuisineLeaflet = "true";
        document.body.appendChild(script);
      }
      const handleLoad = () => initialize();
      const handleError = () => setMapError("The map could not load. Check your connection and try again.");
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      if (window.L) initialize();
      return () => {
        cancelled = true;
        script?.removeEventListener("load", handleLoad);
        script?.removeEventListener("error", handleError);
        mapInstance.current?.remove();
        mapInstance.current = null;
        marker.current = null;
        zoneLayers.current = [];
      };
    }
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      marker.current = null;
      zoneLayers.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    zoneLayers.current.forEach(layer => layer.remove());
    zoneLayers.current = [];
    for (const zone of zones) {
      const ring = zone.coverage_geojson?.coordinates?.[0];
      if (!ring || ring.length < 4) continue;
      const layer = window.L.polygon(ring.map(([lng, lat]: number[]) => [lat, lng]), {
        color: "#2b8a5b", weight: 2, fillColor: "#48a76c", fillOpacity: 0.08,
      }).addTo(mapInstance.current);
      layer.bindTooltip(zone.city + " · " + zone.area_name + " delivery area");
      zoneLayers.current.push(layer);
    }
  }, [zones, ready]);

  useEffect(() => {
    if (!mapInstance.current) return;
    if (latitude !== null && longitude !== null) {
      const L = window.L;
      if (marker.current) marker.current.setLatLng([latitude, longitude]);
      else marker.current = L.marker([latitude, longitude]).addTo(mapInstance.current);
      mapInstance.current.setView([latitude, longitude], 16);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapInstance.current || latitude !== null) return;
    mapInstance.current.setView(CENTERS[state] || CENTERS.default, 12);
  }, [state, city, latitude]);

  return (
    <div className="sm:col-span-2 rounded-2xl border border-[#dfe8da] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#284a34]"><MapPin size={16}/> Pin your delivery location</p>
          <p className="mt-1 text-xs text-[#7c897b]">Tap the map to place the pin at your home or delivery address. You can move it by tapping again.</p>
        </div>
        <button type="button" onClick={() => { if (mapInstance.current) mapInstance.current.setView(CENTERS[state] || CENTERS.default, 12); }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-[#45644a]"><RotateCcw size={13}/> Re-centre</button>
      </div>
      <div ref={mapElement} className="mt-3 z-0 h-64 w-full overflow-hidden rounded-xl bg-[#edf2e9]" aria-label="Interactive delivery location map" />
      {mapError && <p role="alert" className="mt-2 text-xs text-red-700">{mapError}</p>}
      {!ready && !mapError && <p className="mt-2 text-xs text-[#899487]">Loading map…</p>}
      {latitude !== null && longitude !== null
        ? <p className="mt-2 rounded-lg bg-[#eff8f0] p-2 text-xs font-semibold text-[#315b43]">Pin selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
        : <p className="mt-2 text-xs font-semibold text-[#a15b32]">A map pin is required for home delivery.</p>}
    </div>
  );
}

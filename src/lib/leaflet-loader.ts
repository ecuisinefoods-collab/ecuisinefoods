"use client";

declare global {
  interface Window { L?: any }
}

let leafletPromise: Promise<any> | null = null;

/** Loads Leaflet with CDN fallbacks. Leaflet CSS is bundled locally in globals.css. */
export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps can only load in a browser."));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const sources = [
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js",
    ];
    let index = 0;

    const tryNext = () => {
      if (window.L) {
        resolve(window.L);
        return;
      }
      if (index >= sources.length) {
        reject(new Error("The map engine could not be loaded from the available map providers. Please refresh and try again."));
        return;
      }

      const script = document.createElement("script");
      script.src = sources[index++];
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        if (window.L) resolve(window.L);
        else tryNext();
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  }).catch(error => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
}


/** Adds OpenStreetMap tiles with a Carto fallback if the primary tile server fails. */
export function addMapBaseLayer(L: any, map: any, onFailure?: (message: string) => void) {
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const primary = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution,
    crossOrigin: true,
  });

  let failedTiles = 0;
  let fallbackActive = false;
  primary.on("tileerror", () => {
    failedTiles += 1;
    if (failedTiles < 2 || fallbackActive) return;
    fallbackActive = true;
    primary.remove();
    const fallback = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: attribution + ' &copy; <a href="https://carto.com/attributions">CARTO</a>',
      crossOrigin: true,
    });
    fallback.on("tileerror", () => onFailure?.("Map tiles are not responding from either map provider. Check your internet connection and try again."));
    fallback.addTo(map);
  });

  primary.addTo(map);
  return primary;
}

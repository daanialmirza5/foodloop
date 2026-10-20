"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * OpenStreetMap via Leaflet. For unauthorised viewers we show a ~1 km circle
 * around a rounded coordinate instead of the exact pickup point.
 */
export function LocationMap({ lat, lng, approximate, label }: { lat: number; lng: number; approximate: boolean; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], approximate ? 13 : 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      if (approximate) L.circle([lat, lng], { radius: 900, color: "#22603f", fillColor: "#6cab3f", fillOpacity: 0.2 }).addTo(map).bindTooltip("Approximate area");
      else L.circleMarker([lat, lng], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#22603f", fillOpacity: 1 }).addTo(map).bindTooltip(label);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, approximate, label]);
  return <div ref={el} className="h-56 w-full overflow-hidden rounded-xl bg-sand" aria-label={approximate ? "Map of approximate area" : `Map of ${label}`} role="img" />;
}

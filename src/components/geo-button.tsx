"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

/** Fills hidden lat/lng inputs from the browser (with permission) and selects distance sorting. */
export function GeoButton({ formId }: { formId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => {
          if (!navigator.geolocation) return setMsg("Location is not available in this browser.");
          setMsg("Locating…");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const form = document.getElementById(formId) as HTMLFormElement | null;
              if (!form) return;
              (form.elements.namedItem("lat") as HTMLInputElement).value = pos.coords.latitude.toFixed(4);
              (form.elements.namedItem("lng") as HTMLInputElement).value = pos.coords.longitude.toFixed(4);
              (form.elements.namedItem("sort") as HTMLSelectElement).value = "distance";
              form.requestSubmit();
            },
            () => setMsg("Location permission denied — distance sorting needs your location."),
            { timeout: 10000 },
          );
        }}
      >
        <LocateFixed className="size-3.5" /> Sort by distance from me
      </button>
      {msg && <p className="mt-1 text-xs text-muted">{msg}</p>}
    </div>
  );
}

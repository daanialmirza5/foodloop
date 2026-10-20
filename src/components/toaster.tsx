"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

type Toast = { id: number; message: string; error?: boolean };

/** Fire a toast from any client component. Lives in the root layout, so it survives re-renders that unmount the form. */
export function toast(message: string, error = false) {
  window.dispatchEvent(new CustomEvent("foodloop:toast", { detail: { message, error } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, error } = (e as CustomEvent<{ message: string; error?: boolean }>).detail;
      const id = Date.now() + Math.random();
      setItems((t) => [...t.slice(-2), { id, message, error }]);
      setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 6500);
    };
    window.addEventListener("foodloop:toast", on);
    return () => window.removeEventListener("foodloop:toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} role={t.error ? "alert" : "status"} className={cn("pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm text-white shadow-[var(--shadow-lift)]", t.error ? "bg-red-700" : "bg-forest-800")}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

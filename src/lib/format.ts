// Client-safe formatting helpers.
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const IST = "Asia/Kolkata";

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
}

export function formatKg(kg: number | null | undefined) {
  const v = Number(kg ?? 0);
  return `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;
}

export function formatInr(paise: number | null | undefined) {
  const v = Number(paise ?? 0) / 100;
  return v.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export function timeUntil(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 36e5);
  const m = Math.floor((abs % 36e5) / 6e4);
  const text = h >= 48 ? `${Math.floor(h / 24)} days` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Urgency for a collection deadline. */
export function urgencyOf(deadlineIso: string, now = Date.now()): "critical" | "high" | "normal" | "passed" {
  const hours = (new Date(deadlineIso).getTime() - now) / 36e5;
  if (hours <= 0) return "passed";
  if (hours <= 2) return "critical";
  if (hours <= 6) return "high";
  return "normal";
}

/** Convert an ISO timestamp to the value expected by <input type="datetime-local"> in IST. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 36e5);
  return d.toISOString().slice(0, 16);
}

import { all, get, update } from "../db";
import type { EventStatus } from "../constants";
import { nowIso } from "../utils";
import { recordHistory } from "./audit";

/**
 * Derive an event's collection status from its linked food listings.
 * Registration alone never makes an event "ready" — only an approved
 * food listing does.
 */
export function syncEventStatus(eventId: string, actorId: string | null) {
  const ev = get<{ id: string; status: EventStatus }>("SELECT id, status FROM events WHERE id = ?", eventId);
  if (!ev || ev.status === "cancelled" || ev.status === "completed") return;
  const statuses = all<{ status: string }>("SELECT status FROM food_listings WHERE event_id = ?", eventId).map((r) => r.status);
  const has = (...s: string[]) => statuses.some((x) => s.includes(x));
  const active = has("pending_review", "available", "request_received", "accepted", "pickup_scheduled", "collected");

  let next: EventStatus = ev.status;
  if (has("pickup_scheduled", "collected")) next = "collection_arranged";
  else if (has("available", "request_received", "accepted")) next = "ready_for_collection";
  else if (has("delivered") && !active) next = "completed";
  else if (ev.status === "ready_for_collection" || ev.status === "collection_arranged") next = "awaiting_food";

  if (next !== ev.status) {
    update("events", eventId, { status: next, updated_at: nowIso() });
    recordHistory("event", eventId, ev.status, next, actorId, "Updated from linked food donation");
  }
}

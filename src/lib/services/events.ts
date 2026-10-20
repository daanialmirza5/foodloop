import { all, get, insert, tx, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { isAdmin, requireActor, requirePermission, type Actor } from "../permissions";
import { newId, nowIso } from "../utils";
import { assertEventTransition } from "../workflow";
import type { EventStatus } from "../constants";
import type { EventInput, partnerSchema } from "../validation";
import type { z } from "zod";
import { audit, recordHistory } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import { cancelListing, type ListingWithDonor } from "./listings";

export type EventRow = EventInput & {
  id: string;
  organizer_user_id: string;
  status: EventStatus;
  status_reason: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
};

export function getEvent(id: string) {
  return get<EventRow & { preferred_recipient_name: string | null }>(
    `SELECT e.*, o.name AS preferred_recipient_name FROM events e LEFT JOIN organizations o ON o.id = e.preferred_recipient_org_id WHERE e.id = ?`,
    id,
  );
}

function assertOwner(actor: Actor, ev: EventRow) {
  if (ev.organizer_user_id !== actor.id && !isAdmin(actor)) throw forbidden("You can only manage events you registered.");
}

function setEventStatus(ev: EventRow, to: EventStatus, actorId: string, note?: string) {
  assertEventTransition(ev.status, to);
  update("events", ev.id, { status: to, status_reason: note ?? null, updated_at: nowIso() });
  recordHistory("event", ev.id, ev.status, to, actorId, note);
  ev.status = to;
}

function validatePreferred(id?: string) {
  if (!id) return;
  const org = get<{ verification_status: string }>("SELECT verification_status FROM organizations WHERE id = ? AND kind = 'recipient'", id);
  if (!org || org.verification_status !== "verified") throw invalid("Preferred recipient must be a verified organisation.", { preferred_recipient_org_id: "Not a verified organisation." });
}

/** Register an upcoming event. This records an INTENTION only — no food is listed. */
export function createEvent(actorIn: Actor | null, input: EventInput, submit: boolean) {
  const actor = requirePermission(actorIn, "event.create");
  validatePreferred(input.preferred_recipient_org_id);
  const id = newId("evt");
  const ts = nowIso();
  tx(() => {
    insert("events", { id, organizer_user_id: actor.id, ...input, status: "registered", is_demo: actor.is_demo, created_at: ts, updated_at: ts });
    recordHistory("event", id, null, "registered", actor.id, "Event registered");
    audit(actor.id, "event.create", "event", id);
    if (submit) setEventStatus(getEvent(id)!, "awaiting_confirmation", actor.id, "Organiser submitted event details");
  });
  notify([actor.id], "event.registered", `Event registered: ${input.name}`, submit ? "A FoodLoop coordinator will confirm collection arrangements." : "Saved. Submit it when details are final.", `/dashboard/events/${id}`);
  if (submit) notifyAdmins("event.registered", `New event awaiting confirmation: ${input.name}`, `${input.event_date} · ${input.venue_name}, ${input.city}`, `/admin/events`);
  return getEvent(id)!;
}

export function submitEvent(actorIn: Actor | null, id: string) {
  const actor = requireActor(actorIn);
  const ev = getEvent(id);
  if (!ev) throw notFound("Event");
  assertOwner(actor, ev);
  setEventStatus(ev, "awaiting_confirmation", actor.id, "Organiser submitted event details");
  notifyAdmins("event.registered", `New event awaiting confirmation: ${ev.name}`, `${ev.event_date} · ${ev.venue_name}`, `/admin/events`);
}

export function updateEvent(actorIn: Actor | null, id: string, input: EventInput) {
  const actor = requireActor(actorIn);
  const ev = getEvent(id);
  if (!ev) throw notFound("Event");
  assertOwner(actor, ev);
  if (!["registered", "awaiting_confirmation", "awaiting_food"].includes(ev.status)) throw invalid("This event can no longer be edited.");
  validatePreferred(input.preferred_recipient_org_id);
  update("events", id, { ...input, updated_at: nowIso() });
  audit(actor.id, "event.update", "event", id);
}

/** Coordinator confirms the event and the collection plan. */
export function confirmEvent(actorIn: Actor | null, id: string, note: string) {
  const actor = requirePermission(actorIn, "event.coordinate");
  const ev = getEvent(id);
  if (!ev) throw notFound("Event");
  setEventStatus(ev, "awaiting_food", actor.id, note || "Coordinator confirmed collection plan");
  audit(actor.id, "event.confirm", "event", id, note);
  notify([ev.organizer_user_id], "event.confirmed", `Collection plan confirmed for ${ev.name}`, "After the event, use “Donate Leftover Food Now” to register the actual surplus.", `/dashboard/events/${id}`);
}

export function cancelEvent(actorIn: Actor | null, id: string, reason: string) {
  const actor = requireActor(actorIn);
  const ev = getEvent(id);
  if (!ev) throw notFound("Event");
  assertOwner(actor, ev);
  if (!reason || reason.trim().length < 3) throw invalid("Please give a reason for cancelling.");
  const activeListings = all<{ id: string }>(
    "SELECT id FROM food_listings WHERE event_id = ? AND status IN ('draft','pending_review','available','request_received','accepted','pickup_scheduled')",
    id,
  );
  const inTransit = get("SELECT 1 FROM food_listings WHERE event_id = ? AND status = 'collected'", id);
  if (inTransit) throw invalid("Food from this event is already in transit. Complete or report the delivery before cancelling.");
  tx(() => {
    for (const l of activeListings) cancelListing(actor, l.id, `Event cancelled: ${reason}`);
    setEventStatus(ev, "cancelled", actor.id, reason);
    audit(actor.id, "event.cancel", "event", id, reason);
  });
  notifyAdmins("event.cancelled", `Event cancelled: ${ev.name}`, reason, `/admin/events`);
}

/** Organiser closes an event that produced no suitable surplus. */
export function closeEventNoSurplus(actorIn: Actor | null, id: string) {
  const actor = requireActor(actorIn);
  const ev = getEvent(id);
  if (!ev) throw notFound("Event");
  assertOwner(actor, ev);
  const active = get("SELECT 1 FROM food_listings WHERE event_id = ? AND status NOT IN ('delivered','rejected','cancelled','expired')", id);
  if (active) throw invalid("This event still has food donations in progress.");
  setEventStatus(ev, "completed", actor.id, "Closed by organiser — no further surplus");
}

export type EventListRow = EventRow & {
  organizer_display: string;
  listings_count: number;
  offered_kg: number;
  delivered_kg: number;
};

const EVENT_LIST_SELECT = `SELECT e.*, u.name AS organizer_display,
   (SELECT COUNT(*) FROM food_listings l WHERE l.event_id = e.id AND l.status <> 'draft') AS listings_count,
   (SELECT COALESCE(SUM(l.quantity_kg),0) FROM food_listings l WHERE l.event_id = e.id AND l.status NOT IN ('draft')) AS offered_kg,
   (SELECT COALESCE(SUM(d.qty_received_kg),0) FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id WHERE l.event_id = e.id) AS delivered_kg
   FROM events e JOIN users u ON u.id = e.organizer_user_id`;

export function listEvents(filter: { organizerId?: string; status?: string; from?: string; to?: string; upcoming?: boolean } = {}) {
  const where: string[] = ["1=1"];
  const p: unknown[] = [];
  if (filter.organizerId) (where.push("e.organizer_user_id = ?"), p.push(filter.organizerId));
  if (filter.status) (where.push("e.status = ?"), p.push(filter.status));
  if (filter.from) (where.push("e.event_date >= ?"), p.push(filter.from));
  if (filter.to) (where.push("e.event_date <= ?"), p.push(filter.to));
  if (filter.upcoming) (where.push("e.event_date >= ?"), p.push(new Date().toISOString().slice(0, 10)));
  return all<EventListRow>(`${EVENT_LIST_SELECT} WHERE ${where.join(" AND ")} ORDER BY e.event_date DESC, e.created_at DESC`, ...p);
}

export function eventListings(eventId: string) {
  return all<ListingWithDonor & { recipient_name: string | null; delivered_kg: number | null; collected_kg: number | null }>(
    `SELECT l.*, u.name AS donor_name, NULL AS donor_org_name, e.name AS event_name, e.event_type AS event_type,
            (SELECT o.name FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id WHERE r.listing_id = l.id AND r.status IN ('accepted','completed')) AS recipient_name,
            (SELECT d.qty_received_kg FROM delivery_confirmations d WHERE d.listing_id = l.id) AS delivered_kg,
            (SELECT c.qty_collected_kg FROM collections c WHERE c.listing_id = l.id AND c.picked_up_at IS NOT NULL ORDER BY c.created_at DESC LIMIT 1) AS collected_kg
       FROM food_listings l JOIN users u ON u.id = l.donor_user_id JOIN events e ON e.id = l.event_id
      WHERE l.event_id = ? ORDER BY l.created_at DESC`,
    eventId,
  );
}

export function eventIncidents(eventId: string) {
  return all<{ id: string; kind: string; severity: string; status: string; description: string; created_at: string }>(
    `SELECT i.* FROM incidents i LEFT JOIN food_listings l ON l.id = i.listing_id WHERE i.event_id = ? OR l.event_id = ? ORDER BY i.created_at DESC`,
    eventId,
    eventId,
  );
}

// ---------- Wedding planner / venue partnership applications ----------

export function createPartnerApplication(actor: Actor | null, input: z.infer<typeof partnerSchema>) {
  const id = newId("ptn");
  insert("partner_applications", { id, user_id: actor?.id ?? null, ...input, status: "pending", is_demo: actor?.is_demo ?? 0, created_at: nowIso() });
  audit(actor?.id ?? null, "partner.apply", "partner_application", id);
  notifyAdmins("partner.application", `Partnership interest: ${input.business_name}`, `${input.partner_type} · ${input.city}`, "/admin/partners");
  return id;
}

export function reviewPartner(actorIn: Actor | null, id: string, status: "under_review" | "agreement_signed" | "declined", note: string) {
  const actor = requirePermission(actorIn, "event.coordinate");
  if (!note || note.trim().length < 5) throw invalid("A note is required (e.g. agreement reference or reason).");
  const row = get<{ id: string; status: string; user_id: string | null; business_name: string }>("SELECT * FROM partner_applications WHERE id = ?", id);
  if (!row) throw notFound("Application");
  update("partner_applications", id, { status, review_note: note });
  recordHistory("partner_application", id, row.status, status, actor.id, note);
  audit(actor.id, "partner.review", "partner_application", id, note, { status });
  if (row.user_id) notify([row.user_id], "partner.update", `Partnership application: ${status.replace(/_/g, " ")}`, note, "/events");
}

export function listPartners() {
  return all<{ id: string; business_name: string; partner_type: string; contact_person: string; phone: string; email: string; city: string; events_per_month: number | null; recurring_interest: number; message: string | null; status: string; review_note: string | null; is_demo: number; created_at: string }>(
    "SELECT * FROM partner_applications ORDER BY created_at DESC",
  );
}

export function publicPartners() {
  // Only partners with a signed agreement are ever shown publicly.
  return all<{ business_name: string; partner_type: string; city: string; is_demo: number }>(
    "SELECT business_name, partner_type, city, is_demo FROM partner_applications WHERE status = 'agreement_signed' ORDER BY business_name",
  );
}

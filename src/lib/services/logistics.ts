import { all, get, insert, run, tx, update } from "../db";
import { conflict, forbidden, invalid, notFound } from "../errors";
import { isAdmin, requireActor, requirePermission, type Actor } from "../permissions";
import { PICKUP_CHECKS } from "../safety";
import { newId, nowIso } from "../utils";
import { evaluateMatch } from "../matching";
import { audit, recordHistory } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import { expireStale, getListing, inflightKgForOrg, setListingStatus, type ListingWithDonor } from "./listings";
import { getOrg, getOrgForUser } from "./organizations";
import { syncEventStatus } from "./event-sync";

export type RequestRow = {
  id: string;
  listing_id: string;
  recipient_org_id: string;
  requested_by: string;
  quantity_kg: number;
  transport_mode: "volunteer" | "recipient" | "donor";
  message: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
};

export type CollectionRow = {
  id: string;
  listing_id: string;
  request_id: string;
  transport_mode: "volunteer" | "recipient" | "donor";
  volunteer_user_id: string | null;
  transport_partner: string | null;
  status: "available" | "assigned" | "in_transit" | "completed" | "cancelled" | "failed";
  scheduled_pickup_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  qty_collected_kg: number | null;
  qty_delivered_kg: number | null;
  pickup_checks_json: string | null;
  notes: string | null;
  failure_reason: string | null;
  volunteer_minutes: number | null;
  created_at: string;
  updated_at: string;
};

function liveListing(id: string) {
  expireStale();
  const l = getListing(id);
  if (!l) throw notFound("Food listing");
  return l;
}

function assertNotHeld(l: ListingWithDonor) {
  if (l.safety_hold) throw invalid("Distribution of this donation is on hold pending a food-safety review.");
}

function deadlinePassed(l: { collection_deadline: string }) {
  return new Date(l.collection_deadline).getTime() <= Date.now();
}

function orgMatch(l: ListingWithDonor, orgId: string) {
  const org = getOrg(orgId)!;
  return evaluateMatch(l, org, inflightKgForOrg(org.id));
}

// ---------------------------------------------------------------- requests

export function createRequest(actorIn: Actor | null, input: { listing_id: string; transport_mode: "volunteer" | "recipient" | "donor"; message?: string }) {
  const actor = requirePermission(actorIn, "request.create");
  const org = getOrgForUser(actor.id, "recipient");
  if (!org) throw invalid("Register your organisation before requesting food.");
  if (org.verification_status !== "verified") throw forbidden("Only verified organisations can request food. Your organisation is " + org.verification_status + ".");
  const l = liveListing(input.listing_id);
  assertNotHeld(l);
  if (l.status === "expired") throw invalid("This donation has expired.");
  if (!["available", "request_received"].includes(l.status)) throw invalid("This donation is no longer open for requests.");
  if (deadlinePassed(l)) throw invalid("The collection deadline has passed.");
  if (input.transport_mode === "recipient" && !org.has_transport) throw invalid("Your profile says you have no transport. Choose volunteer collection instead.");
  if (input.transport_mode === "donor" && !get("SELECT 1 FROM events WHERE id = ? AND transport_available = 1", l.event_id ?? "")) {
    // donors may deliver only where they said transport is available (events) or for their own listings when arranged by phone
    if (l.source === "event_surplus") throw invalid("The organiser has not offered transport for this event.");
  }
  const match = evaluateMatch(l, org, inflightKgForOrg(org.id));
  if (!match.eligible) throw invalid(`Your organisation cannot safely receive this donation: ${match.blockers.join(" ")}`);
  if (get("SELECT 1 FROM donation_requests WHERE listing_id = ? AND recipient_org_id = ? AND status IN ('pending','accepted')", l.id, org.id))
    throw conflict("You already have an open request for this donation.");

  const id = newId("req");
  const ts = nowIso();
  tx(() => {
    insert("donation_requests", {
      id,
      listing_id: l.id,
      recipient_org_id: org.id,
      requested_by: actor.id,
      quantity_kg: l.quantity_kg,
      transport_mode: input.transport_mode,
      message: input.message ?? null,
      status: "pending",
      created_at: ts,
      updated_at: ts,
    });
    recordHistory("request", id, null, "pending", actor.id, input.message);
    if (l.status === "available") setListingStatus(l, "request_received", actor.id, `Request from ${org.name}`);
    audit(actor.id, "request.create", "request", id);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
  });
  notify([l.donor_user_id], "request.new", `${org.name} requested "${l.title}"`, input.message || `${l.quantity_kg} kg · ${match.reasons.join(" ")}`, `/dashboard/listings/${l.id}`);
  return id;
}

export function getRequest(id: string) {
  return get<RequestRow & { org_name: string; org_owner: string }>(
    `SELECT r.*, o.name AS org_name, o.owner_user_id AS org_owner FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id WHERE r.id = ?`,
    id,
  );
}

export function withdrawRequest(actorIn: Actor | null, id: string) {
  const actor = requireActor(actorIn);
  const r = getRequest(id);
  if (!r) throw notFound("Request");
  if (r.org_owner !== actor.id) throw forbidden();
  if (r.status !== "pending") throw invalid("Only pending requests can be withdrawn.");
  tx(() => {
    update("donation_requests", id, { status: "withdrawn", updated_at: nowIso() });
    recordHistory("request", id, "pending", "withdrawn", actor.id);
    reopenIfNoPending(r.listing_id, actor.id);
  });
}

function reopenIfNoPending(listingId: string, actorId: string) {
  const l = getListing(listingId)!;
  const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM donation_requests WHERE listing_id = ? AND status = 'pending'", listingId)?.n ?? 0;
  if (pending === 0 && l.status === "request_received") setListingStatus(l, "available", actorId, "No pending requests");
}

/** Donor (or coordinator) accepts / declines a request. Acceptance re-checks capacity and safety. */
export function decideRequest(actorIn: Actor | null, id: string, decision: "accept" | "reject", reason?: string) {
  const actor = requireActor(actorIn);
  const r = getRequest(id);
  if (!r) throw notFound("Request");
  const l = liveListing(r.listing_id);
  if (l.donor_user_id !== actor.id && !isAdmin(actor)) throw forbidden("Only the donor or a coordinator can decide on requests.");
  if (r.status !== "pending") throw invalid("This request has already been decided.");
  if (decision === "reject") {
    if (!reason || reason.trim().length < 3) throw invalid("Please give a short reason for declining.");
    tx(() => {
      update("donation_requests", id, { status: "rejected", decided_by: actor.id, decided_at: nowIso(), decision_reason: reason, updated_at: nowIso() });
      recordHistory("request", id, "pending", "rejected", actor.id, reason);
      reopenIfNoPending(l.id, actor.id);
      audit(actor.id, "request.reject", "request", id, reason);
    });
    notify([r.requested_by], "request.rejected", `Request for "${l.title}" was declined`, reason, `/dashboard/requests`);
    return;
  }
  assertNotHeld(l);
  if (l.status !== "request_received") throw invalid(`Cannot accept: donation is ${l.status.replace(/_/g, " ")}.`);
  if (deadlinePassed(l)) throw invalid("Cannot accept: the collection deadline has passed.");
  const match = orgMatch(l, r.recipient_org_id);
  if (!match.eligible) throw invalid(`Cannot accept: ${match.blockers.join(" ")}`);

  const collectionId = newId("col");
  const others = tx(() => {
    update("donation_requests", id, { status: "accepted", decided_by: actor.id, decided_at: nowIso(), decision_reason: reason ?? null, updated_at: nowIso() });
    recordHistory("request", id, "pending", "accepted", actor.id, reason);
    const rest = all<{ id: string; requested_by: string }>("SELECT id, requested_by FROM donation_requests WHERE listing_id = ? AND status = 'pending' AND id <> ?", l.id, id);
    for (const o of rest) {
      update("donation_requests", o.id, { status: "rejected", decided_by: actor.id, decided_at: nowIso(), decision_reason: "Matched with another organisation", updated_at: nowIso() });
      recordHistory("request", o.id, "pending", "rejected", actor.id, "Matched with another organisation");
    }
    setListingStatus(l, "accepted", actor.id, `Accepted request from ${r.org_name}`);
    insert("collections", {
      id: collectionId,
      listing_id: l.id,
      request_id: id,
      transport_mode: r.transport_mode,
      volunteer_user_id: null,
      status: r.transport_mode === "volunteer" ? "available" : "assigned",
      created_by: actor.id,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    recordHistory("collection", collectionId, null, r.transport_mode === "volunteer" ? "available" : "assigned", actor.id, "Collection created");
    audit(actor.id, "request.accept", "request", id, reason);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    return rest;
  });
  notify([r.requested_by], "request.accepted", `Your request for "${l.title}" was accepted`, r.transport_mode === "volunteer" ? "A volunteer will be assigned for collection." : "Please schedule the pickup.", `/dashboard/requests`);
  notify(others.map((o) => o.requested_by), "request.rejected", `"${l.title}" was matched with another organisation`, undefined, `/dashboard/requests`);
  if (r.transport_mode === "volunteer") {
    const vols = all<{ id: string }>("SELECT id FROM users WHERE role = 'volunteer' AND status = 'active'").map((v) => v.id);
    notify(vols, l.is_urgent ? "collection.urgent" : "collection.available", `${l.is_urgent ? "URGENT " : ""}collection task: ${l.title}`, `${l.quantity_kg} kg in ${l.city} · deadline ${new Date(l.collection_deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, `/dashboard/tasks`);
    notifyAdmins("collection.available", `Collection needs a volunteer: ${l.code}`, undefined, `/admin/logistics`);
  }
  return collectionId;
}

// ------------------------------------------------------------- collections

export function getCollection(id: string) {
  return get<CollectionRow>("SELECT * FROM collections WHERE id = ?", id);
}

function collectionContext(id: string) {
  const c = getCollection(id);
  if (!c) throw notFound("Collection");
  const l = getListing(c.listing_id)!;
  const r = getRequest(c.request_id)!;
  return { c, l, r };
}

/** Who may operate a collection (record pickup / handover). */
function canOperate(actor: Actor, c: CollectionRow, l: ListingWithDonor, r: RequestRow & { org_owner: string }) {
  if (isAdmin(actor)) return true;
  if (c.transport_mode === "volunteer") return c.volunteer_user_id === actor.id;
  if (c.transport_mode === "recipient") return r.org_owner === actor.id;
  return l.donor_user_id === actor.id;
}

function setCollectionStatus(c: CollectionRow, to: CollectionRow["status"], actorId: string | null, note?: string | null, extra: Record<string, unknown> = {}) {
  update("collections", c.id, { status: to, updated_at: nowIso(), ...extra });
  recordHistory("collection", c.id, c.status, to, actorId, note);
  c.status = to;
}

/** Volunteer claims an open task. Atomic: two volunteers can never both get it. */
export function claimCollection(actorIn: Actor | null, id: string, etaIso?: string) {
  const actor = requirePermission(actorIn, "collection.claim");
  expireStale();
  const { c, l, r } = collectionContext(id);
  assertNotHeld(l);
  if (deadlinePassed(l)) throw invalid("The collection deadline has passed.");
  if (etaIso && new Date(etaIso) > new Date(l.collection_deadline)) throw invalid("Your pickup time must be before the collection deadline.");
  tx(() => {
    const res = run("UPDATE collections SET status = 'assigned', volunteer_user_id = ?, scheduled_pickup_at = ?, updated_at = ? WHERE id = ? AND status = 'available'", actor.id, etaIso ?? l.pickup_window_start, nowIso(), id);
    if (Number(res.changes) !== 1) throw conflict("This task has already been taken by another volunteer.");
    recordHistory("collection", id, "available", "assigned", actor.id, "Claimed by volunteer");
    setListingStatus(l, "pickup_scheduled", actor.id, `Volunteer ${actor.name} assigned`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "collection.claim", "collection", id);
  });
  notify([l.donor_user_id, r.requested_by], "collection.assigned", `Volunteer assigned for "${l.title}"`, `${actor.name} will collect the food.`, `/dashboard/listings/${l.id}`);
  void c;
}

/** Coordinator assigns (or re-assigns) a volunteer and/or transport partner. */
export function assignVolunteer(actorIn: Actor | null, id: string, volunteerId: string, etaIso?: string, transportPartner?: string) {
  const actor = requirePermission(actorIn, "collection.assign");
  const { c, l, r } = collectionContext(id);
  assertNotHeld(l);
  if (c.transport_mode !== "volunteer") throw invalid("This collection is handled by the " + c.transport_mode + ".");
  if (!["available", "assigned"].includes(c.status)) throw invalid("Volunteers can only be assigned before pickup.");
  if (deadlinePassed(l)) throw invalid("The collection deadline has passed.");
  const vol = get<{ id: string; role: string; status: string; name: string }>("SELECT id, role, status, name FROM users WHERE id = ?", volunteerId);
  if (!vol || vol.role !== "volunteer" || vol.status !== "active") throw invalid("Choose an active volunteer.");
  const previous = c.volunteer_user_id;
  tx(() => {
    setCollectionStatus(c, "assigned", actor.id, `Assigned to ${vol.name}`, { volunteer_user_id: vol.id, scheduled_pickup_at: etaIso ?? c.scheduled_pickup_at ?? l.pickup_window_start, transport_partner: transportPartner ?? null });
    if (l.status === "accepted") setListingStatus(l, "pickup_scheduled", actor.id, `Volunteer ${vol.name} assigned`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "collection.assign", "collection", id, null, { volunteer: vol.id, previous });
  });
  notify([vol.id], "collection.assigned", `You have been assigned: ${l.title}`, `Pickup by ${new Date(l.collection_deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, `/dashboard/assignments`);
  if (previous && previous !== vol.id) notify([previous], "collection.reassigned", `Assignment ${l.code} was reassigned`, undefined, `/dashboard/assignments`);
  notify([l.donor_user_id, r.requested_by], "collection.assigned", `Volunteer assigned for "${l.title}"`, vol.name, `/dashboard/listings/${l.id}`);
}

/** For recipient/donor transport: schedule the pickup time. */
export function schedulePickup(actorIn: Actor | null, id: string, whenIso: string) {
  const actor = requireActor(actorIn);
  const { c, l, r } = collectionContext(id);
  if (!canOperate(actor, c, l, r) && l.donor_user_id !== actor.id) throw forbidden();
  if (c.status !== "assigned") throw invalid("Pickup can only be scheduled for an assigned collection.");
  if (new Date(whenIso) > new Date(l.collection_deadline)) throw invalid("Pickup time must be before the collection deadline.");
  tx(() => {
    update("collections", id, { scheduled_pickup_at: whenIso, updated_at: nowIso() });
    if (l.status === "accepted") setListingStatus(l, "pickup_scheduled", actor.id, `Pickup scheduled for ${whenIso}`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
  });
  notify([l.donor_user_id, r.requested_by], "collection.scheduled", `Pickup scheduled for "${l.title}"`, new Date(whenIso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), `/dashboard/listings/${l.id}`);
}

export function releaseCollection(actorIn: Actor | null, id: string, reason: string) {
  const actor = requireActor(actorIn);
  const { c, l } = collectionContext(id);
  if (c.volunteer_user_id !== actor.id && !isAdmin(actor)) throw forbidden();
  if (c.status !== "assigned") throw invalid("Only assigned tasks can be released.");
  tx(() => {
    setCollectionStatus(c, "available", actor.id, reason || "Released by volunteer", { volunteer_user_id: null });
    if (l.status === "pickup_scheduled") setListingStatus(l, "accepted", actor.id, "Volunteer released the task");
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
  });
  notifyAdmins("collection.released", `Volunteer released ${l.code}`, reason, `/admin/logistics`);
}

/** Record pickup. All pickup safety checks must be confirmed, otherwise the food is blocked. */
export function recordPickup(actorIn: Actor | null, id: string, qtyKg: number, checks: Record<string, boolean>, notes?: string) {
  const actor = requireActor(actorIn);
  const { c, l, r } = collectionContext(id);
  if (!canOperate(actor, c, l, r)) throw forbidden("Only the assigned party can record this pickup.");
  if (c.status !== "assigned") throw invalid("Pickup can only be recorded for an assigned collection.");
  assertNotHeld(l);
  if (l.status !== "pickup_scheduled" && l.status !== "accepted") throw invalid(`Donation is ${l.status.replace(/_/g, " ")}.`);
  if (deadlinePassed(l)) throw invalid("The collection deadline has passed — record this as a missed pickup instead.");
  if (!(qtyKg > 0)) throw invalid("Enter the quantity collected.");
  if (qtyKg > l.quantity_kg * 1.1) throw invalid(`Collected quantity cannot exceed the listed ${l.quantity_kg} kg.`);
  const failed = PICKUP_CHECKS.filter((k) => !checks[k.key]);
  if (failed.length) {
    // Food failed the pickup check: block distribution, never move it.
    tx(() => {
      insert("safety_screenings", { id: newId("scr"), listing_id: l.id, stage: "pickup", result: "fail", checks_json: JSON.stringify(PICKUP_CHECKS.map((k) => ({ key: k.key, label: k.label, result: checks[k.key] ? "pass" : "fail", detail: "" }))), notes: notes ?? null, screened_by: actor.id, created_at: nowIso() });
      setCollectionStatus(c, "failed", actor.id, "Failed pickup safety check", { failure_reason: `Pickup safety check failed: ${failed.map((f) => f.label).join("; ")}` });
      update("donation_requests", r.id, { status: "cancelled", decision_reason: "Food failed pickup safety check", updated_at: nowIso() });
      recordHistory("request", r.id, r.status, "cancelled", actor.id, "Food failed pickup safety check");
      setListingStatus(l, "rejected", actor.id, `Rejected at pickup: ${failed.map((f) => f.label).join("; ")}`);
      insert("incidents", { id: newId("inc"), listing_id: l.id, collection_id: c.id, event_id: l.event_id, reported_by: actor.id, kind: "food_safety", severity: "high", description: `Pickup safety check failed: ${failed.map((f) => f.label).join("; ")}. ${notes ?? ""}`.trim(), status: "open", is_demo: actor.is_demo, created_at: nowIso() });
      if (l.event_id) syncEventStatus(l.event_id, actor.id);
      audit(actor.id, "collection.pickup_failed_safety", "collection", id);
    });
    notify([l.donor_user_id, r.requested_by], "listing.rejected", `"${l.title}" failed the pickup safety check`, "The food was not collected or distributed.", `/dashboard/listings/${l.id}`);
    notifyAdmins("incident.new", `Safety incident at pickup: ${l.code}`, undefined, "/admin/incidents");
    return { rejected: true };
  }
  tx(() => {
    insert("safety_screenings", { id: newId("scr"), listing_id: l.id, stage: "pickup", result: "pass", checks_json: JSON.stringify(PICKUP_CHECKS.map((k) => ({ key: k.key, label: k.label, result: "pass", detail: "" }))), notes: notes ?? null, screened_by: actor.id, created_at: nowIso() });
    setCollectionStatus(c, "in_transit", actor.id, `Collected ${qtyKg} kg`, { picked_up_at: nowIso(), qty_collected_kg: qtyKg, pickup_checks_json: JSON.stringify(checks), notes: notes ?? null });
    if (l.status === "accepted") setListingStatus(l, "pickup_scheduled", actor.id, "Pickup started");
    setListingStatus(l, "collected", actor.id, `Collected ${qtyKg} kg`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "collection.pickup", "collection", id, null, { qtyKg });
  });
  notify([l.donor_user_id, r.requested_by], "collection.completed", `"${l.title}" has been collected`, `${qtyKg} kg on the way to ${r.org_name}.`, `/dashboard/listings/${l.id}`);
  return { rejected: false };
}

/** Courier hands food over at the recipient. Recipient acknowledgement still required. */
export function recordHandover(actorIn: Actor | null, id: string, qtyKg: number, minutes?: number, notes?: string) {
  const actor = requireActor(actorIn);
  const { c, l, r } = collectionContext(id);
  if (!canOperate(actor, c, l, r)) throw forbidden();
  if (c.status !== "in_transit") throw invalid("Handover can only be recorded after pickup.");
  if (!(qtyKg > 0) || qtyKg > (c.qty_collected_kg ?? 0)) throw invalid(`Delivered quantity must be between 0 and the ${c.qty_collected_kg} kg collected.`);
  tx(() => {
    setCollectionStatus(c, "completed", actor.id, `Handed over ${qtyKg} kg`, { delivered_at: nowIso(), qty_delivered_kg: qtyKg, volunteer_minutes: minutes ?? null, notes: notes ?? c.notes });
    audit(actor.id, "collection.handover", "collection", id, null, { qtyKg });
  });
  notify([r.requested_by], "delivery.awaiting_ack", `Please confirm receipt of "${l.title}"`, `${qtyKg} kg handed over. Confirm the quantity you received.`, `/dashboard/deliveries`);
}

/**
 * Recipient acknowledgement — the ONLY record that counts toward "delivered" impact.
 * UNIQUE(listing_id) on delivery_confirmations prevents double counting.
 */
export function confirmDelivery(actorIn: Actor | null, listingId: string, qtyKg: number, conditionOk: boolean, notes?: string) {
  const actor = requireActor(actorIn);
  const l = getListing(listingId);
  if (!l) throw notFound("Listing");
  const r = get<RequestRow & { org_owner: string; org_name: string }>(
    `SELECT r.*, o.owner_user_id AS org_owner, o.name AS org_name FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id WHERE r.listing_id = ? AND r.status = 'accepted'`,
    listingId,
  );
  if (!r) throw invalid("There is no accepted request for this donation.");
  if (r.org_owner !== actor.id && !isAdmin(actor)) throw forbidden("Only the receiving organisation can confirm delivery.");
  if (l.status === "delivered") throw conflict("Delivery has already been confirmed.");
  if (l.status !== "collected") throw invalid("Delivery can only be confirmed after the food has been collected.");
  assertNotHeld(l);
  const c = get<CollectionRow>("SELECT * FROM collections WHERE listing_id = ? AND status IN ('in_transit','completed') ORDER BY created_at DESC LIMIT 1", listingId);
  if (!c) throw invalid("No collection record found for this donation.");
  const maxKg = c.qty_delivered_kg ?? c.qty_collected_kg ?? l.quantity_kg;
  if (conditionOk && (!(qtyKg > 0) || qtyKg > maxKg)) throw invalid(`Received quantity must be between 0 and ${maxKg} kg.`);

  if (!conditionOk) {
    tx(() => {
      if (c.status === "in_transit") setCollectionStatus(c, "completed", actor.id, "Delivered but refused by recipient", { delivered_at: nowIso() });
      update("donation_requests", r.id, { status: "cancelled", decision_reason: "Recipient refused food on arrival", updated_at: nowIso() });
      recordHistory("request", r.id, "accepted", "cancelled", actor.id, "Refused on arrival");
      setListingStatus(l, "rejected", actor.id, `Refused on arrival by ${r.org_name}: ${notes ?? "condition unsafe"}`);
      insert("safety_screenings", { id: newId("scr"), listing_id: l.id, stage: "delivery", result: "fail", checks_json: "[]", notes: notes ?? null, screened_by: actor.id, created_at: nowIso() });
      insert("incidents", { id: newId("inc"), listing_id: l.id, collection_id: c.id, event_id: l.event_id, reported_by: actor.id, kind: "food_safety", severity: "high", description: `Recipient refused food on arrival. ${notes ?? ""}`.trim(), status: "open", is_demo: actor.is_demo, created_at: nowIso() });
      if (l.event_id) syncEventStatus(l.event_id, actor.id);
      audit(actor.id, "delivery.refused", "listing", l.id, notes);
    });
    notify([l.donor_user_id, c.volunteer_user_id], "listing.rejected", `"${l.title}" was refused on arrival`, notes, `/dashboard/listings/${l.id}`);
    notifyAdmins("incident.new", `Food refused on arrival: ${l.code}`, notes, "/admin/incidents");
    return;
  }

  tx(() => {
    if (c.status === "in_transit") setCollectionStatus(c, "completed", actor.id, "Delivered", { delivered_at: nowIso(), qty_delivered_kg: qtyKg });
    insert("delivery_confirmations", {
      id: newId("dlv"),
      listing_id: l.id,
      collection_id: c.id,
      recipient_org_id: r.recipient_org_id,
      confirmed_by: actor.id,
      qty_received_kg: qtyKg,
      condition_ok: 1,
      notes: notes ?? null,
      confirmed_at: nowIso(),
    });
    insert("safety_screenings", { id: newId("scr"), listing_id: l.id, stage: "delivery", result: "pass", checks_json: "[]", notes: notes ?? "Received in acceptable condition", screened_by: actor.id, created_at: nowIso() });
    update("donation_requests", r.id, { status: "completed", updated_at: nowIso() });
    recordHistory("request", r.id, "accepted", "completed", actor.id);
    setListingStatus(l, "delivered", actor.id, `${r.org_name} confirmed receipt of ${qtyKg} kg`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "delivery.confirm", "listing", l.id, null, { qtyKg });
  });
  notify([l.donor_user_id, c.volunteer_user_id], "delivery.confirmed", `Delivered: "${l.title}"`, `${r.org_name} confirmed receiving ${qtyKg} kg. Thank you!`, `/dashboard/listings/${l.id}`);
}

/** Missed / failed pickup. The coordinator can then arrange another collection or close the request. */
export function failCollection(actorIn: Actor | null, id: string, reason: string) {
  const actor = requireActor(actorIn);
  const { c, l, r } = collectionContext(id);
  if (!canOperate(actor, c, l, r) && !isAdmin(actor) && l.donor_user_id !== actor.id) throw forbidden();
  if (!["available", "assigned"].includes(c.status)) throw invalid("Only collections that have not been picked up can be marked as missed.");
  if (!reason || reason.trim().length < 3) throw invalid("Please describe what happened.");
  tx(() => {
    setCollectionStatus(c, "failed", actor.id, reason, { failure_reason: reason });
    if (l.status === "pickup_scheduled") setListingStatus(l, "accepted", actor.id, "Pickup missed — awaiting a new collection arrangement");
    insert("incidents", { id: newId("inc"), listing_id: l.id, collection_id: c.id, event_id: l.event_id, reported_by: actor.id, kind: "missed_pickup", severity: "medium", description: reason, status: "open", is_demo: actor.is_demo, created_at: nowIso() });
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "collection.fail", "collection", id, reason);
  });
  notify([l.donor_user_id, r.requested_by], "collection.failed", `Pickup missed for "${l.title}"`, reason, `/dashboard/listings/${l.id}`);
  notifyAdmins("collection.failed", `Missed pickup: ${l.code}`, reason, `/admin/logistics`);
}

/** Coordinator re-opens a new collection after a failure. */
export function rearrangeCollection(actorIn: Actor | null, listingId: string, mode: "volunteer" | "recipient" | "donor" = "volunteer") {
  const actor = requirePermission(actorIn, "collection.assign");
  const l = liveListing(listingId);
  if (l.status !== "accepted") throw invalid("A new collection can only be arranged for an accepted donation awaiting pickup.");
  if (deadlinePassed(l)) throw invalid("The collection deadline has passed.");
  const r = get<RequestRow>("SELECT * FROM donation_requests WHERE listing_id = ? AND status = 'accepted'", listingId);
  if (!r) throw invalid("No accepted request.");
  if (get("SELECT 1 FROM collections WHERE listing_id = ? AND status IN ('available','assigned','in_transit')", listingId)) throw conflict("An active collection already exists.");
  const id = newId("col");
  tx(() => {
    insert("collections", { id, listing_id: l.id, request_id: r.id, transport_mode: mode, status: mode === "volunteer" ? "available" : "assigned", created_by: actor.id, created_at: nowIso(), updated_at: nowIso() });
    recordHistory("collection", id, null, mode === "volunteer" ? "available" : "assigned", actor.id, "Re-arranged after a failed collection");
    audit(actor.id, "collection.rearrange", "listing", listingId);
  });
  return id;
}

/** Coordinator closes an accepted request that cannot be fulfilled; food returns to the pool if still safe. */
export function closeAcceptedRequest(actorIn: Actor | null, listingId: string, reason: string) {
  const actor = requirePermission(actorIn, "collection.assign");
  const l = liveListing(listingId);
  if (!["accepted", "pickup_scheduled"].includes(l.status)) throw invalid("Only accepted donations awaiting pickup can be re-opened.");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required.");
  const r = get<RequestRow>("SELECT * FROM donation_requests WHERE listing_id = ? AND status = 'accepted'", listingId);
  tx(() => {
    for (const c of all<CollectionRow>("SELECT * FROM collections WHERE listing_id = ? AND status IN ('available','assigned')", listingId)) setCollectionStatus(c, "cancelled", actor.id, reason);
    if (r) {
      update("donation_requests", r.id, { status: "cancelled", decision_reason: reason, updated_at: nowIso() });
      recordHistory("request", r.id, "accepted", "cancelled", actor.id, reason);
    }
    if (l.status === "pickup_scheduled") setListingStatus(l, "accepted", actor.id, reason);
    const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM donation_requests WHERE listing_id = ? AND status = 'pending'", listingId)?.n ?? 0;
    setListingStatus(l, pending ? "request_received" : "available", actor.id, `Request closed: ${reason}`);
    if (l.event_id) syncEventStatus(l.event_id, actor.id);
    audit(actor.id, "request.close", "listing", listingId, reason);
  });
  if (r) notify([r.requested_by], "request.cancelled", `Request for "${l.title}" was closed by a coordinator`, reason, "/dashboard/requests");
}

// ----------------------------------------------------------------- queries

export function requestsForListing(listingId: string) {
  return all<RequestRow & { org_name: string; org_city: string | null; org_capacity: number; org_type: string; org_verification: string }>(
    `SELECT r.*, o.name AS org_name, o.city AS org_city, o.capacity_kg_per_day AS org_capacity, o.org_type, o.verification_status AS org_verification
       FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id WHERE r.listing_id = ? ORDER BY r.created_at DESC`,
    listingId,
  );
}

export function requestsForOrg(orgId: string) {
  expireStale();
  return all<RequestRow & { title: string; code: string; listing_status: string; collection_deadline: string; city: string | null; is_urgent: number; source: string; is_demo: number }>(
    `SELECT r.*, l.title, l.code, l.status AS listing_status, l.collection_deadline, l.city, l.is_urgent, l.source, l.is_demo
       FROM donation_requests r JOIN food_listings l ON l.id = r.listing_id WHERE r.recipient_org_id = ? ORDER BY r.created_at DESC`,
    orgId,
  );
}

export function incomingRequestsForDonor(userId: string) {
  expireStale();
  return all<RequestRow & { title: string; code: string; listing_status: string; org_name: string; org_city: string | null; collection_deadline: string; listing_id: string }>(
    `SELECT r.*, l.title, l.code, l.status AS listing_status, o.name AS org_name, o.city AS org_city, l.collection_deadline
       FROM donation_requests r JOIN food_listings l ON l.id = r.listing_id JOIN organizations o ON o.id = r.recipient_org_id
      WHERE l.donor_user_id = ? ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC`,
    userId,
  );
}

export type CollectionView = CollectionRow & {
  title: string;
  code: string;
  listing_status: string;
  quantity_kg: number;
  collection_deadline: string;
  pickup_window_start: string;
  pickup_window_end: string;
  city: string | null;
  is_urgent: number;
  source: string;
  event_id: string | null;
  donor_user_id: string;
  org_name: string;
  org_address: string | null;
  org_owner: string;
  volunteer_name: string | null;
  is_demo: number;
  pickup_address: string;
  contact_name: string;
  contact_phone: string;
};

const COLLECTION_SELECT = `SELECT c.*, l.title, l.code, l.status AS listing_status, l.quantity_kg, l.collection_deadline, l.pickup_window_start, l.pickup_window_end,
   l.city, l.is_urgent, l.source, l.event_id, l.donor_user_id, l.is_demo, l.pickup_address, l.contact_name, l.contact_phone,
   o.name AS org_name, o.address AS org_address, o.owner_user_id AS org_owner, v.name AS volunteer_name
   FROM collections c JOIN food_listings l ON l.id = c.listing_id JOIN donation_requests r ON r.id = c.request_id
   JOIN organizations o ON o.id = r.recipient_org_id LEFT JOIN users v ON v.id = c.volunteer_user_id`;

export function listCollections(filter: { status?: string; volunteerId?: string; donorId?: string; orgOwnerId?: string; urgent?: boolean; eventOnly?: boolean } = {}) {
  expireStale();
  const where = ["1=1"];
  const p: unknown[] = [];
  if (filter.status) (where.push("c.status = ?"), p.push(filter.status));
  if (filter.volunteerId) (where.push("c.volunteer_user_id = ?"), p.push(filter.volunteerId));
  if (filter.donorId) (where.push("l.donor_user_id = ?"), p.push(filter.donorId));
  if (filter.orgOwnerId) (where.push("o.owner_user_id = ?"), p.push(filter.orgOwnerId));
  if (filter.urgent) where.push("l.is_urgent = 1");
  if (filter.eventOnly) where.push("l.source = 'event_surplus'");
  return all<CollectionView>(`${COLLECTION_SELECT} WHERE ${where.join(" AND ")} ORDER BY CASE c.status WHEN 'available' THEN 0 WHEN 'assigned' THEN 1 WHEN 'in_transit' THEN 2 ELSE 3 END, l.collection_deadline ASC`, ...p);
}

/** Open tasks for volunteers. Exact addresses are hidden until claimed. */
export function openTasks() {
  return listCollections({ status: "available" }).map((t) => ({ ...t, pickup_address: `${t.city ?? ""} (shared once you accept)`, contact_name: "", contact_phone: "" }));
}

export function collectionsForListing(listingId: string) {
  return all<CollectionView>(`${COLLECTION_SELECT} WHERE c.listing_id = ? ORDER BY c.created_at DESC`, listingId);
}

export function deliveryFor(listingId: string) {
  return get<{ qty_received_kg: number; confirmed_at: string; notes: string | null; condition_ok: number }>("SELECT * FROM delivery_confirmations WHERE listing_id = ?", listingId);
}

export function availableVolunteers() {
  return all<{ id: string; name: string; city: string | null; service_areas: string | null; availability: string | null; vehicle_type: string | null; active_count: number }>(
    `SELECT u.id, u.name, u.city, p.service_areas, p.availability, p.vehicle_type,
            (SELECT COUNT(*) FROM collections c WHERE c.volunteer_user_id = u.id AND c.status IN ('assigned','in_transit')) AS active_count
       FROM users u LEFT JOIN volunteer_profiles p ON p.user_id = u.id WHERE u.role = 'volunteer' AND u.status = 'active' ORDER BY u.name`,
  );
}

export function volunteerStats(userId: string) {
  return get<{ completed: number; active: number; minutes: number; kg: number }>(
    `SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status IN ('assigned','in_transit') THEN 1 ELSE 0 END) AS active,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN volunteer_minutes END), 0) AS minutes,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN qty_delivered_kg END), 0) AS kg
       FROM collections WHERE volunteer_user_id = ?`,
    userId,
  ) ?? { completed: 0, active: 0, minutes: 0, kg: 0 };
}

export function saveVolunteerProfile(actorIn: Actor | null, input: { service_areas: string; availability: string; vehicle_type?: string; food_safety_trained: boolean }) {
  const actor = requireActor(actorIn);
  if (actor.role !== "volunteer") throw forbidden();
  run(
    `INSERT INTO volunteer_profiles(user_id, service_areas, availability, vehicle_type, food_safety_trained, updated_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET service_areas = excluded.service_areas, availability = excluded.availability, vehicle_type = excluded.vehicle_type, food_safety_trained = excluded.food_safety_trained, updated_at = excluded.updated_at`,
    actor.id,
    input.service_areas,
    input.availability,
    input.vehicle_type ?? null,
    input.food_safety_trained,
    nowIso(),
  );
}

export function getVolunteerProfile(userId: string) {
  return get<{ service_areas: string | null; availability: string | null; vehicle_type: string | null; food_safety_trained: number }>("SELECT * FROM volunteer_profiles WHERE user_id = ?", userId);
}

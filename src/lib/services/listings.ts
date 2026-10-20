import { all, get, getSetting, insert, run, tx, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { isAdmin, requireActor, requirePermission, type Actor } from "../permissions";
import { DEFAULT_SAFETY_RULES, screenFood, type SafetyRules, type ScreeningOutcome } from "../safety";
import { haversineKm, newId, nowIso } from "../utils";
import { assertListingTransition, DONOR_CANCELLABLE, DONOR_EDITABLE, EXPIRABLE } from "../workflow";
import type { ListingInput } from "../validation";
import type { ListingStatus } from "../constants";
import { audit, recordHistory } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import { evaluateMatch, type MatchResult } from "../matching";
import { syncEventStatus } from "./event-sync";

export type ListingRow = {
  id: string;
  code: string;
  donor_user_id: string;
  donor_org_id: string | null;
  event_id: string | null;
  source: string;
  is_urgent: number;
  title: string;
  category: string;
  description: string | null;
  quantity: number;
  unit: string;
  quantity_kg: number;
  prepared_at: string | null;
  expiry_at: string | null;
  storage_condition: string;
  storage_temp_c: number | null;
  storage_history: string | null;
  packaging_condition: string;
  allergens: string;
  food_type: string;
  handling_info: string | null;
  not_served_confirmed: number;
  hygiene_confirmed: number;
  pickup_address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  pickup_window_start: string;
  pickup_window_end: string;
  collection_deadline: string;
  contact_name: string;
  contact_phone: string;
  photo_path: string | null;
  instructions: string | null;
  safety_concerns: string | null;
  intended_recipient_org_id: string | null;
  status: ListingStatus;
  status_reason: string | null;
  approved_at: string | null;
  approved_kg: number | null;
  safety_hold: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export type ListingWithDonor = ListingRow & { donor_name: string; donor_org_name: string | null; event_name: string | null; event_type: string | null };

const LISTING_SELECT = `SELECT l.*, u.name AS donor_name, o.name AS donor_org_name, e.name AS event_name, e.event_type AS event_type
  FROM food_listings l JOIN users u ON u.id = l.donor_user_id
  LEFT JOIN organizations o ON o.id = l.donor_org_id
  LEFT JOIN events e ON e.id = l.event_id`;

export function safetyRules(): SafetyRules {
  try {
    return { ...DEFAULT_SAFETY_RULES, ...JSON.parse(getSetting("safety_rules", "{}")) };
  } catch {
    return DEFAULT_SAFETY_RULES;
  }
}

function nextCode() {
  const year = new Date().getFullYear();
  const n = (get<{ n: number }>("SELECT COUNT(*) AS n FROM food_listings")?.n ?? 0) + 1;
  let code = `FL-${year}-${String(n).padStart(4, "0")}`;
  while (get("SELECT 1 FROM food_listings WHERE code = ?", code)) code = `FL-${year}-${String(n + Math.floor(Math.random() * 9000)).padStart(4, "0")}`;
  return code;
}

export function getListing(id: string) {
  return get<ListingWithDonor>(`${LISTING_SELECT} WHERE l.id = ?`, id);
}

function setStatus(listing: ListingRow, to: ListingStatus, actorId: string | null, note?: string | null, extra: Record<string, unknown> = {}) {
  assertListingTransition(listing.status, to);
  update("food_listings", listing.id, { status: to, status_reason: note ?? null, updated_at: nowIso(), ...extra });
  recordHistory("listing", listing.id, listing.status, to, actorId, note);
  listing.status = to;
}
export { setStatus as setListingStatus };

function recordScreening(listingId: string, stage: string, outcome: Pick<ScreeningOutcome, "result" | "checks">, by: string | null, notes?: string | null) {
  insert("safety_screenings", {
    id: newId("scr"),
    listing_id: listingId,
    stage,
    result: outcome.result,
    checks_json: JSON.stringify(outcome.checks),
    notes: notes ?? null,
    screened_by: by,
    created_at: nowIso(),
  });
}

function assertEventOwnership(actor: Actor, eventId: string) {
  const ev = get<{ id: string; organizer_user_id: string; status: string; name: string }>("SELECT id, organizer_user_id, status, name FROM events WHERE id = ?", eventId);
  if (!ev) throw invalid("Selected event was not found.", { event_id: "Event not found." });
  if (ev.organizer_user_id !== actor.id && !isAdmin(actor)) throw forbidden("You can only donate food from events you registered.");
  if (ev.status === "cancelled" || ev.status === "completed") throw invalid(`This event is ${ev.status}; leftover food cannot be added to it.`);
  return ev;
}

/** Runs automated screening and moves the listing to pending_review (or rejected). Never to available. */
function screenAndSubmit(listing: ListingRow, actorId: string) {
  const outcome = screenFood(listing, safetyRules());
  recordScreening(listing.id, "automated", outcome, null);
  if (outcome.result === "fail") {
    setStatus(listing, "rejected", actorId, `Automated safety screening failed: ${outcome.failures.join(" ")}`);
  } else {
    setStatus(listing, "pending_review", actorId, outcome.result === "needs_review" ? "Flagged for coordinator review" : "Passed automated pre-screening; awaiting coordinator review");
  }
  return outcome;
}

export function createListing(actorIn: Actor | null, input: ListingInput, opts: { photo_path?: string | null } = {}) {
  const actor = requirePermission(actorIn, "listing.create");
  let source = input.source;
  if (input.event_id) {
    assertEventOwnership(actor, input.event_id);
    source = "event_surplus";
  }
  if (source === "event_surplus" && !input.event_id) throw invalid("Event surplus must be linked to a registered event.", { event_id: "Select an event." });
  if (input.intended_recipient_org_id) {
    const org = get<{ verification_status: string }>("SELECT verification_status FROM organizations WHERE id = ? AND kind = 'recipient'", input.intended_recipient_org_id);
    if (!org || org.verification_status !== "verified") throw invalid("Intended recipient must be a verified organisation.");
  }
  const donorOrg = get<{ id: string }>("SELECT id FROM organizations WHERE owner_user_id = ? AND kind = 'donor'", actor.id);
  const id = newId("lst");
  const ts = nowIso();
  let outcome: ScreeningOutcome | null = null;
  tx(() => {
    const { save_as_draft, ...fields } = input;
    insert("food_listings", {
      id,
      code: nextCode(),
      donor_user_id: actor.id,
      donor_org_id: donorOrg?.id ?? null,
      ...fields,
      source,
      event_id: input.event_id ?? null,
      photo_path: opts.photo_path ?? null,
      status: "draft",
      is_demo: actor.is_demo,
      created_at: ts,
      updated_at: ts,
    });
    recordHistory("listing", id, null, "draft", actor.id, "Listing created");
    const listing = getListing(id)!;
    if (!save_as_draft) outcome = screenAndSubmit(listing, actor.id);
    audit(actor.id, "listing.create", "listing", id, null, { source, urgent: input.is_urgent });
    if (input.event_id) syncEventStatus(input.event_id, actor.id);
  });
  const listing = getListing(id)!;
  if (listing.status === "pending_review") {
    notifyAdmins(
      input.is_urgent ? "listing.urgent" : "listing.new",
      input.is_urgent ? `URGENT: ${listing.title} needs review` : `New food listing awaiting review`,
      `${listing.quantity_kg} kg · ${listing.city ?? ""} · deadline ${new Date(listing.collection_deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      `/admin/listings/${id}`,
    );
  }
  if (listing.status === "rejected") notify([actor.id], "listing.rejected", "Donation did not pass safety screening", listing.status_reason ?? undefined, `/dashboard/listings/${id}`);
  return { listing, screening: outcome as ScreeningOutcome | null };
}

export function submitDraft(actorIn: Actor | null, id: string) {
  const actor = requireActor(actorIn);
  const listing = getListing(id);
  if (!listing) throw notFound("Listing");
  if (listing.donor_user_id !== actor.id && !isAdmin(actor)) throw forbidden();
  if (listing.status !== "draft") throw invalid("Only drafts can be submitted.");
  const outcome = tx(() => screenAndSubmit(listing, actor.id));
  if (getListing(id)!.status === "pending_review") notifyAdmins("listing.new", "New food listing awaiting review", listing.title, `/admin/listings/${id}`);
  return outcome;
}

export function updateListing(actorIn: Actor | null, id: string, input: ListingInput, opts: { photo_path?: string | null } = {}) {
  const actor = requireActor(actorIn);
  const listing = getListing(id);
  if (!listing) throw notFound("Listing");
  if (listing.donor_user_id !== actor.id && !isAdmin(actor)) throw forbidden("You can only edit your own donations.");
  if (!DONOR_EDITABLE.includes(listing.status)) throw invalid(`A donation that is "${listing.status.replace(/_/g, " ")}" can no longer be edited.`);
  const open = get<{ n: number }>("SELECT COUNT(*) AS n FROM donation_requests WHERE listing_id = ? AND status IN ('pending','accepted')", id)?.n ?? 0;
  if (open > 0) throw invalid("This donation already has requests and cannot be edited. Cancel it instead if details changed.");
  const { save_as_draft, event_id: _ignored, source: _s, ...fields } = input;
  return tx(() => {
    update("food_listings", id, { ...fields, ...(opts.photo_path ? { photo_path: opts.photo_path } : {}), approved_at: null, approved_kg: null, updated_at: nowIso() });
    audit(actor.id, "listing.update", "listing", id);
    const fresh = getListing(id)!;
    if (save_as_draft && fresh.status === "draft") return null;
    // Any edit to a submitted listing sends it back through screening and review.
    if (fresh.status !== "draft") {
      update("food_listings", id, { status: "draft" });
      recordHistory("listing", id, fresh.status, "draft", actor.id, "Edited — re-screening required");
      fresh.status = "draft";
    }
    const outcome = screenAndSubmit(fresh, actor.id);
    if (fresh.event_id) syncEventStatus(fresh.event_id, actor.id);
    return outcome;
  });
}

/**
 * Manual coordinator review: the ONLY path to "available".
 * Requires the coordinator to confirm the manual checklist.
 */
export function reviewListing(actorIn: Actor | null, id: string, decision: "approve" | "reject", notes: string, checklistConfirmed: boolean) {
  const actor = requirePermission(actorIn, "listing.moderate");
  const listing = getListing(id);
  if (!listing) throw notFound("Listing");
  if (listing.status !== "pending_review") throw invalid("Only listings pending review can be approved or rejected here.");
  if (decision === "reject" && (!notes || notes.trim().length < 5)) throw invalid("A reason is required to reject a listing.");
  if (decision === "approve") {
    if (!checklistConfirmed) throw invalid("Confirm the manual safety checklist before approving.");
    if (new Date(listing.collection_deadline) <= new Date()) throw invalid("The collection deadline has passed; this listing cannot be approved.");
    const lastAuto = get<{ result: string }>("SELECT result FROM safety_screenings WHERE listing_id = ? AND stage = 'automated' ORDER BY created_at DESC, rowid DESC LIMIT 1", id);
    if (!lastAuto || lastAuto.result === "fail") throw invalid("This listing has not passed automated screening.");
  }
  tx(() => {
    recordScreening(id, "manual", { result: decision === "approve" ? "pass" : "fail", checks: [] }, actor.id, notes || (decision === "approve" ? "Manual checklist confirmed" : null));
    if (decision === "approve") setStatus(listing, "available", actor.id, notes || "Approved after coordinator review", { approved_at: nowIso(), approved_kg: listing.quantity_kg });
    else setStatus(listing, "rejected", actor.id, notes);
    audit(actor.id, decision === "approve" ? "listing.approve" : "listing.reject", "listing", id, notes);
    if (listing.event_id) syncEventStatus(listing.event_id, actor.id);
  });
  notify([listing.donor_user_id], decision === "approve" ? "listing.approved" : "listing.rejected", decision === "approve" ? `"${listing.title}" is now visible to verified NGOs` : `"${listing.title}" was not approved`, notes || undefined, `/dashboard/listings/${id}`);
  if (decision === "approve") return announceToRecipients(id);
  return null;
}

/** Alert eligible recipient organisations (in-app). Returns matches so callers can show "no recipient available". */
export function announceToRecipients(id: string) {
  const listing = getListing(id)!;
  const matches = matchesForListing(listing);
  const eligible = matches.filter((m) => m.eligible);
  const owners = eligible.map((m) => get<{ owner_user_id: string }>("SELECT owner_user_id FROM organizations WHERE id = ?", m.org.id)?.owner_user_id);
  notify(owners, listing.is_urgent ? "listing.urgent" : "listing.new", listing.is_urgent ? `Urgent food rescue near you: ${listing.title}` : `New food available: ${listing.title}`, `${listing.quantity_kg} kg in ${listing.city}`, `/discover/${id}`);
  if (eligible.length === 0) {
    const msg = "No verified recipient can currently receive this donation safely (capacity, distance, diet or storage). Coordinators have been alerted. This donation has NOT been rescued yet.";
    notify([listing.donor_user_id], "listing.no_match", "No eligible recipient found yet", msg, `/dashboard/listings/${id}`);
    notifyAdmins("listing.no_match", `No eligible recipient for ${listing.code}`, msg, `/admin/listings/${id}`);
  }
  return { matches, eligibleCount: eligible.length };
}

export function inflightKgForOrg(orgId: string) {
  return (
    get<{ kg: number }>(
      `SELECT COALESCE(SUM(r.quantity_kg), 0) AS kg FROM donation_requests r JOIN food_listings l ON l.id = r.listing_id
        WHERE r.recipient_org_id = ? AND r.status = 'accepted' AND l.status IN ('accepted','pickup_scheduled','collected')`,
      orgId,
    )?.kg ?? 0
  );
}

export function matchesForListing(listing: ListingRow): MatchResult[] {
  const orgs = all<Parameters<typeof evaluateMatch>[1]>(
    `SELECT o.* FROM organizations o JOIN users u ON u.id = o.owner_user_id
      WHERE o.kind = 'recipient' AND o.verification_status = 'verified' AND u.status = 'active'`,
  );
  return orgs
    .map((o) => evaluateMatch(listing, o, inflightKgForOrg(o.id)))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

function closeOpenWork(listing: ListingRow, actorId: string | null, reason: string) {
  const reqs = all<{ id: string; status: string; requested_by: string }>("SELECT id, status, requested_by FROM donation_requests WHERE listing_id = ? AND status IN ('pending','accepted')", listing.id);
  for (const r of reqs) {
    update("donation_requests", r.id, { status: "cancelled", decision_reason: reason, updated_at: nowIso() });
    recordHistory("request", r.id, r.status, "cancelled", actorId, reason);
  }
  const cols = all<{ id: string; status: string; volunteer_user_id: string | null }>("SELECT id, status, volunteer_user_id FROM collections WHERE listing_id = ? AND status IN ('available','assigned','in_transit')", listing.id);
  for (const c of cols) {
    update("collections", c.id, { status: "cancelled", failure_reason: reason, updated_at: nowIso() });
    recordHistory("collection", c.id, c.status, "cancelled", actorId, reason);
  }
  return { requesters: reqs.map((r) => r.requested_by), volunteers: cols.map((c) => c.volunteer_user_id) };
}

export function cancelListing(actorIn: Actor | null, id: string, reason: string) {
  const actor = requireActor(actorIn);
  const listing = getListing(id);
  if (!listing) throw notFound("Listing");
  if (listing.donor_user_id !== actor.id && !isAdmin(actor)) throw forbidden("You can only cancel your own donations.");
  if (!DONOR_CANCELLABLE.includes(listing.status)) throw invalid(`A donation that is "${listing.status.replace(/_/g, " ")}" cannot be cancelled.`);
  if (!reason || reason.trim().length < 3) throw invalid("Please give a reason for cancelling.");
  const affected = tx(() => {
    const a = closeOpenWork(listing, actor.id, `Donation cancelled: ${reason}`);
    setStatus(listing, "cancelled", actor.id, reason);
    audit(actor.id, "listing.cancel", "listing", id, reason);
    if (listing.event_id) syncEventStatus(listing.event_id, actor.id);
    return a;
  });
  notify([...affected.requesters, ...affected.volunteers], "listing.cancelled", `Donation ${listing.code} was cancelled`, reason, `/dashboard`);
}

/** Admin blocks unsafe food at any point before delivery is confirmed. */
export function rejectUnsafe(actorIn: Actor | null, id: string, reason: string) {
  const actor = requirePermission(actorIn, "listing.moderate");
  const listing = getListing(id);
  if (!listing) throw notFound("Listing");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required.");
  const affected = tx(() => {
    const a = closeOpenWork(listing, actor.id, `Rejected for safety: ${reason}`);
    setStatus(listing, "rejected", actor.id, reason, { safety_hold: 0 });
    recordScreening(id, "manual", { result: "fail", checks: [] }, actor.id, reason);
    audit(actor.id, "listing.reject_unsafe", "listing", id, reason);
    if (listing.event_id) syncEventStatus(listing.event_id, actor.id);
    return a;
  });
  notify([listing.donor_user_id, ...affected.requesters, ...affected.volunteers], "listing.rejected", `Donation ${listing.code} was rejected for safety`, reason, `/dashboard`);
}

/** Expire open listings whose collection deadline has passed. Safe to call often. */
export function expireStale(now = new Date()) {
  const stale = all<ListingRow>(
    `SELECT * FROM food_listings WHERE collection_deadline < ? AND status IN (${EXPIRABLE.map(() => "?").join(",")})`,
    now.toISOString(),
    ...EXPIRABLE,
  );
  for (const listing of stale) {
    tx(() => {
      // An assigned pickup that never happened is a missed pickup, not a cancellation.
      const missed = all<{ id: string; volunteer_user_id: string | null }>("SELECT id, volunteer_user_id FROM collections WHERE listing_id = ? AND status = 'assigned'", listing.id);
      for (const c of missed) {
        run("UPDATE collections SET status = 'failed', failure_reason = 'Deadline passed before pickup', updated_at = ? WHERE id = ?", nowIso(), c.id);
        recordHistory("collection", c.id, "assigned", "failed", null, "Deadline passed before pickup");
      }
      const a = closeOpenWork(listing, null, "Collection deadline passed");
      a.volunteers.push(...missed.map((m) => m.volunteer_user_id));
      setStatus(listing, "expired", null, "Collection deadline passed before the food was collected");
      if (listing.event_id) syncEventStatus(listing.event_id, null);
      notify([listing.donor_user_id, ...a.requesters, ...a.volunteers], "listing.expired", `Donation ${listing.code} expired`, "The collection deadline passed before pickup.", `/dashboard/listings/${listing.id}`);
    });
  }
  return stale.length;
}

/** Who may see the exact pickup address & contact details. */
export function canSeePrivateDetails(actor: Actor | null, listing: ListingRow) {
  if (!actor) return false;
  if (isAdmin(actor) || listing.donor_user_id === actor.id) return true;
  const req = get<{ owner_user_id: string }>(
    `SELECT o.owner_user_id FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id
      WHERE r.listing_id = ? AND r.status IN ('accepted','completed')`,
    listing.id,
  );
  if (req?.owner_user_id === actor.id) return true;
  const col = get("SELECT 1 FROM collections WHERE listing_id = ? AND volunteer_user_id = ? AND status IN ('assigned','in_transit','completed')", listing.id, actor.id);
  return !!col;
}

/** Strip private fields for viewers who are not authorised to see them. */
export function redactListing<T extends ListingRow>(listing: T, actor: Actor | null): T & { private_visible: boolean } {
  const visible = canSeePrivateDetails(actor, listing);
  if (visible) return { ...listing, private_visible: true };
  return {
    ...listing,
    pickup_address: `${listing.city ?? "Location"} (exact address shared after a request is accepted)`,
    contact_name: "Shared after acceptance",
    contact_phone: "",
    lat: listing.lat != null ? Math.round(listing.lat * 100) / 100 : null, // ~1 km precision
    lng: listing.lng != null ? Math.round(listing.lng * 100) / 100 : null,
    private_visible: false,
  };
}

export type SearchFilters = {
  q?: string;
  category?: string;
  city?: string;
  source?: string;
  minKg?: number;
  maxKg?: number;
  withinHours?: number;
  sort?: "newest" | "deadline" | "distance";
  lat?: number;
  lng?: number;
  status?: "open" | "all";
  page?: number;
  pageSize?: number;
};

export function searchListings(f: SearchFilters) {
  expireStale();
  const where: string[] = [];
  const p: unknown[] = [];
  // pending, rejected and draft listings are never shown publicly
  if (f.status === "all") where.push("l.status NOT IN ('draft','pending_review','rejected')");
  else where.push("l.status IN ('available','request_received')", "l.safety_hold = 0");
  if (f.q) {
    where.push("(l.title LIKE ? OR l.description LIKE ? OR l.city LIKE ?)");
    p.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.category) (where.push("l.category = ?"), p.push(f.category));
  if (f.city) (where.push("l.city = ? COLLATE NOCASE"), p.push(f.city));
  if (f.source) (where.push("l.source = ?"), p.push(f.source));
  if (f.minKg) (where.push("l.quantity_kg >= ?"), p.push(f.minKg));
  if (f.maxKg) (where.push("l.quantity_kg <= ?"), p.push(f.maxKg));
  if (f.withinHours) (where.push("l.collection_deadline <= ?"), p.push(new Date(Date.now() + f.withinHours * 36e5).toISOString()));
  const order = f.sort === "deadline" ? "l.collection_deadline ASC" : "l.created_at DESC";
  let rows = all<ListingWithDonor>(`${LISTING_SELECT} WHERE ${where.join(" AND ")} ORDER BY l.is_urgent DESC, ${order}`, ...p);
  let distances: Record<string, number> = {};
  if (f.sort === "distance" && f.lat != null && f.lng != null) {
    distances = Object.fromEntries(rows.filter((r) => r.lat != null && r.lng != null).map((r) => [r.id, haversineKm(f.lat!, f.lng!, r.lat!, r.lng!)]));
    rows = [...rows].sort((a, b) => (distances[a.id] ?? 1e9) - (distances[b.id] ?? 1e9));
  }
  const pageSize = f.pageSize ?? 12;
  const page = Math.max(1, f.page ?? 1);
  return { total: rows.length, page, pageSize, rows: rows.slice((page - 1) * pageSize, page * pageSize), distances };
}

export function listingsForDonor(userId: string, filter: { status?: string; source?: string } = {}) {
  expireStale();
  const where = ["l.donor_user_id = ?"];
  const p: unknown[] = [userId];
  if (filter.status) (where.push("l.status = ?"), p.push(filter.status));
  if (filter.source) (where.push("l.source = ?"), p.push(filter.source));
  return all<ListingWithDonor & { request_count: number }>(
    `SELECT l.*, u.name AS donor_name, o.name AS donor_org_name, e.name AS event_name, e.event_type AS event_type,
            (SELECT COUNT(*) FROM donation_requests r WHERE r.listing_id = l.id AND r.status = 'pending') AS request_count
       FROM food_listings l JOIN users u ON u.id = l.donor_user_id
       LEFT JOIN organizations o ON o.id = l.donor_org_id LEFT JOIN events e ON e.id = l.event_id
      WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC`,
    ...p,
  );
}

export function listAllListings(filter: { status?: string; source?: string; urgent?: boolean; q?: string } = {}) {
  expireStale();
  const where: string[] = ["1=1"];
  const p: unknown[] = [];
  if (filter.status) (where.push("l.status = ?"), p.push(filter.status));
  if (filter.source) (where.push("l.source = ?"), p.push(filter.source));
  if (filter.urgent) where.push("l.is_urgent = 1");
  if (filter.q) (where.push("(l.title LIKE ? OR l.code LIKE ?)"), p.push(`%${filter.q}%`, `%${filter.q}%`));
  return all<ListingWithDonor>(`${LISTING_SELECT} WHERE ${where.join(" AND ")} ORDER BY CASE l.status WHEN 'pending_review' THEN 0 ELSE 1 END, l.is_urgent DESC, l.created_at DESC`, ...p);
}

export function screeningsFor(listingId: string) {
  return all<{ id: string; stage: string; result: string; checks_json: string; notes: string | null; created_at: string; screener: string | null }>(
    `SELECT s.*, u.name AS screener FROM safety_screenings s LEFT JOIN users u ON u.id = s.screened_by WHERE s.listing_id = ? ORDER BY s.created_at ASC, s.rowid ASC`,
    listingId,
  );
}

export function distinctCities() {
  return all<{ city: string }>("SELECT DISTINCT city FROM food_listings WHERE city IS NOT NULL ORDER BY city").map((r) => r.city);
}

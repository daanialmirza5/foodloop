import { all, get, insert, tx, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { isAdmin, requirePermission, type Actor } from "../permissions";
import { newId, nowIso } from "../utils";
import { audit, recordHistory } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import { getListing, rejectUnsafe } from "./listings";

export type IncidentRow = {
  id: string;
  listing_id: string | null;
  collection_id: string | null;
  event_id: string | null;
  reported_by: string;
  kind: string;
  severity: "low" | "medium" | "high";
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolution: string | null;
  resolved_at: string | null;
  is_demo: number;
  created_at: string;
};

function isInvolved(actor: Actor, listingId: string) {
  const l = getListing(listingId);
  if (!l) return false;
  if (l.donor_user_id === actor.id) return true;
  if (get("SELECT 1 FROM donation_requests r JOIN organizations o ON o.id = r.recipient_org_id WHERE r.listing_id = ? AND o.owner_user_id = ?", listingId, actor.id)) return true;
  return !!get("SELECT 1 FROM collections WHERE listing_id = ? AND volunteer_user_id = ?", listingId, actor.id);
}

/**
 * Anyone involved in a donation can report a problem. A HIGH-severity food-safety
 * report puts the listing on hold — it cannot be requested, collected or confirmed
 * until an administrator reviews it.
 */
export function reportIncident(actorIn: Actor | null, input: { listing_id?: string; collection_id?: string; event_id?: string; kind: string; severity: "low" | "medium" | "high"; description: string }) {
  const actor = requirePermission(actorIn, "incident.report");
  if (input.listing_id && !isAdmin(actor) && !isInvolved(actor, input.listing_id)) throw forbidden("You can only report incidents for donations you are involved in.");
  if (input.event_id && !input.listing_id) {
    const ev = get<{ organizer_user_id: string }>("SELECT organizer_user_id FROM events WHERE id = ?", input.event_id);
    if (!ev) throw notFound("Event");
    if (ev.organizer_user_id !== actor.id && !isAdmin(actor)) throw forbidden();
  }
  const id = newId("inc");
  let held = false;
  tx(() => {
    insert("incidents", {
      id,
      listing_id: input.listing_id ?? null,
      collection_id: input.collection_id ?? null,
      event_id: input.event_id ?? (input.listing_id ? getListing(input.listing_id)?.event_id : null) ?? null,
      reported_by: actor.id,
      kind: input.kind,
      severity: input.severity,
      description: input.description,
      status: "open",
      is_demo: actor.is_demo,
      created_at: nowIso(),
    });
    recordHistory("incident", id, null, "open", actor.id);
    if (input.listing_id && input.kind === "food_safety" && input.severity === "high") {
      const l = getListing(input.listing_id);
      if (l && !["delivered", "rejected", "cancelled", "expired"].includes(l.status)) {
        update("food_listings", l.id, { safety_hold: 1, updated_at: nowIso() });
        recordHistory("listing", l.id, l.status, l.status, actor.id, "Safety hold: distribution blocked pending review");
        held = true;
      }
    }
    audit(actor.id, "incident.report", "incident", id, null, { kind: input.kind, severity: input.severity, held });
  });
  notifyAdmins("incident.new", `${input.severity.toUpperCase()} incident reported: ${input.kind.replace(/_/g, " ")}`, input.description.slice(0, 140), "/admin/incidents");
  return { id, held };
}

export function reviewIncident(
  actorIn: Actor | null,
  id: string,
  status: "investigating" | "resolved" | "dismissed",
  resolution: string,
  listingAction: "none" | "release_hold" | "reject_listing" = "none",
) {
  const actor = requirePermission(actorIn, "incident.manage");
  const inc = get<IncidentRow>("SELECT * FROM incidents WHERE id = ?", id);
  if (!inc) throw notFound("Incident");
  if (!resolution || resolution.trim().length < 5) throw invalid("Record what was found / decided (at least 5 characters).");
  tx(() => {
    update("incidents", id, { status, resolution, resolved_by: status === "investigating" ? null : actor.id, resolved_at: status === "investigating" ? null : nowIso() });
    recordHistory("incident", id, inc.status, status, actor.id, resolution);
    if (inc.listing_id && listingAction === "release_hold") {
      update("food_listings", inc.listing_id, { safety_hold: 0, updated_at: nowIso() });
      recordHistory("listing", inc.listing_id, null, getListing(inc.listing_id)!.status, actor.id, `Safety hold released: ${resolution}`);
    }
    if (inc.listing_id && listingAction === "reject_listing") rejectUnsafe(actor, inc.listing_id, resolution);
    audit(actor.id, "incident.review", "incident", id, resolution, { status, listingAction });
  });
  notify([inc.reported_by], "incident.update", `Incident ${status}`, resolution, "/dashboard/incidents");
}

export function listIncidents(filter: { reporterId?: string; status?: string } = {}) {
  const where = ["1=1"];
  const p: unknown[] = [];
  if (filter.reporterId) (where.push("i.reported_by = ?"), p.push(filter.reporterId));
  if (filter.status) (where.push("i.status = ?"), p.push(filter.status));
  return all<IncidentRow & { reporter_name: string; listing_code: string | null; listing_title: string | null; listing_status: string | null; safety_hold: number | null; event_name: string | null }>(
    `SELECT i.*, u.name AS reporter_name, l.code AS listing_code, l.title AS listing_title, l.status AS listing_status, l.safety_hold, e.name AS event_name
       FROM incidents i JOIN users u ON u.id = i.reported_by LEFT JOIN food_listings l ON l.id = i.listing_id LEFT JOIN events e ON e.id = i.event_id
      WHERE ${where.join(" AND ")} ORDER BY CASE i.status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 ELSE 2 END, i.created_at DESC`,
    ...p,
  );
}

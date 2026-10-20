import { all, get, insert, tx, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { isAdmin, requireActor, requirePermission, type Actor } from "../permissions";
import { newId, nowIso } from "../utils";
import { audit, recordHistory } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import type { z } from "zod";
import type { donorOrgSchema, orgSchema } from "../validation";

export type OrgRow = {
  id: string;
  owner_user_id: string;
  kind: "donor" | "recipient";
  name: string;
  org_type: string;
  contact_person: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  service_area: string | null;
  service_radius_km: number;
  lat: number | null;
  lng: number | null;
  capacity_kg_per_day: number;
  beneficiary_capacity: number | null;
  operating_hours: string | null;
  food_preference: string;
  has_cold_storage: number;
  has_transport: number;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  verification_note: string | null;
  is_demo: number;
  created_at: string;
};

export function getOrg(id: string) {
  return get<OrgRow>("SELECT * FROM organizations WHERE id = ?", id);
}

export function getOrgForUser(userId: string, kind?: "donor" | "recipient") {
  return kind
    ? get<OrgRow>("SELECT * FROM organizations WHERE owner_user_id = ? AND kind = ?", userId, kind)
    : get<OrgRow>("SELECT * FROM organizations WHERE owner_user_id = ? ORDER BY created_at LIMIT 1", userId);
}

/** NGO creates or updates its organisation profile. New profiles start as Pending Verification. */
export function saveRecipientOrg(actorIn: Actor | null, input: z.infer<typeof orgSchema>) {
  const actor = requireActor(actorIn);
  if (actor.role !== "ngo") throw forbidden("Only NGO / recipient accounts can register a recipient organisation.");
  const existing = getOrgForUser(actor.id, "recipient");
  const ts = nowIso();
  if (existing) {
    update("organizations", existing.id, { ...input, has_cold_storage: input.has_cold_storage, has_transport: input.has_transport, updated_at: ts });
    audit(actor.id, "org.update", "organization", existing.id);
    return getOrg(existing.id)!;
  }
  const id = newId("org");
  insert("organizations", { id, owner_user_id: actor.id, kind: "recipient", ...input, verification_status: "pending", is_demo: actor.is_demo, created_at: ts, updated_at: ts });
  recordHistory("organization", id, null, "pending", actor.id, "Organisation registered");
  audit(actor.id, "org.create", "organization", id);
  notifyAdmins("org.registered", "New recipient organisation awaiting verification", input.name, "/admin/organizations");
  return getOrg(id)!;
}

export function saveDonorOrg(actorIn: Actor | null, input: z.infer<typeof donorOrgSchema>) {
  const actor = requireActor(actorIn);
  if (actor.role !== "donor") throw forbidden("Only donor accounts can add a donor organisation.");
  const existing = getOrgForUser(actor.id, "donor");
  const ts = nowIso();
  if (existing) {
    update("organizations", existing.id, { ...input, updated_at: ts });
    return getOrg(existing.id)!;
  }
  const id = newId("org");
  // Donor businesses are listed but not "verified" automatically.
  insert("organizations", { id, owner_user_id: actor.id, kind: "donor", ...input, verification_status: "pending", is_demo: actor.is_demo, created_at: ts, updated_at: ts });
  audit(actor.id, "org.create", "organization", id);
  return getOrg(id)!;
}

export function submitVerification(actorIn: Actor | null, input: { registration_number?: string; notes?: string; document_path?: string | null; document_name?: string | null }) {
  const actor = requireActor(actorIn);
  const org = getOrgForUser(actor.id);
  if (!org) throw invalid("Create your organisation profile first.");
  if (org.verification_status === "verified") throw invalid("Your organisation is already verified.");
  if (org.verification_status === "suspended") throw forbidden("Suspended organisations cannot resubmit. Contact the FoodLoop team.");
  const pending = get("SELECT id FROM verification_requests WHERE org_id = ? AND status = 'pending'", org.id);
  if (pending) throw invalid("A verification request is already under review.");
  const id = newId("ver");
  tx(() => {
    insert("verification_requests", {
      id,
      org_id: org.id,
      submitted_by: actor.id,
      registration_number: input.registration_number || null,
      document_name: input.document_name || null,
      document_path: input.document_path || null,
      notes: input.notes || null,
      status: "pending",
      created_at: nowIso(),
    });
    if (org.verification_status === "rejected") {
      update("organizations", org.id, { verification_status: "pending", updated_at: nowIso() });
      recordHistory("organization", org.id, "rejected", "pending", actor.id, "Resubmitted for verification");
    }
    audit(actor.id, "org.verification_submitted", "organization", org.id);
  });
  notifyAdmins("org.verification", "Verification documents submitted", org.name, "/admin/organizations");
  return id;
}

/** Only administrators can verify organisations. A reason is mandatory. */
export function reviewVerification(actorIn: Actor | null, orgId: string, decision: "verified" | "rejected", reason: string) {
  const actor = requirePermission(actorIn, "org.verify");
  if (!reason || reason.trim().length < 5) throw invalid("Please record a reason for this decision (at least 5 characters).");
  const org = getOrg(orgId);
  if (!org) throw notFound("Organisation");
  if (org.verification_status === decision) throw invalid(`Organisation is already ${decision}.`);
  tx(() => {
    update("organizations", org.id, { verification_status: decision, verification_note: reason, updated_at: nowIso() });
    const ts = nowIso();
    const pending = get<{ id: string }>("SELECT id FROM verification_requests WHERE org_id = ? AND status = 'pending'", org.id);
    if (pending) update("verification_requests", pending.id, { status: decision === "verified" ? "approved" : "rejected", reviewed_by: actor.id, reviewed_at: ts, decision_reason: reason });
    recordHistory("organization", org.id, org.verification_status, decision, actor.id, reason);
    audit(actor.id, decision === "verified" ? "org.verify" : "org.reject", "organization", org.id, reason);
  });
  notify(
    [org.owner_user_id],
    "org.verification",
    decision === "verified" ? "Your organisation is verified" : "Verification was not approved",
    reason,
    "/dashboard/organization",
  );
}

export function setOrgSuspension(actorIn: Actor | null, orgId: string, suspend: boolean, reason: string) {
  const actor = requirePermission(actorIn, "org.verify");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required.");
  const org = getOrg(orgId);
  if (!org) throw notFound("Organisation");
  const to = suspend ? "suspended" : "verified";
  update("organizations", org.id, { verification_status: to, verification_note: reason, updated_at: nowIso() });
  recordHistory("organization", org.id, org.verification_status, to, actor.id, reason);
  audit(actor.id, suspend ? "org.suspend" : "org.reinstate", "organization", org.id, reason);
  notify([org.owner_user_id], "org.verification", suspend ? "Your organisation has been suspended" : "Your organisation has been reinstated", reason, "/dashboard/organization");
}

export function listOrganizations(filter: { kind?: string; status?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.kind) (where.push("o.kind = ?"), params.push(filter.kind));
  if (filter.status) (where.push("o.verification_status = ?"), params.push(filter.status));
  return all<OrgRow & { owner_name: string; owner_email: string; pending_request_id: string | null; registration_number: string | null; document_path: string | null; document_name: string | null; ver_notes: string | null }>(
    `SELECT o.*, u.name AS owner_name, u.email AS owner_email,
            v.id AS pending_request_id, v.registration_number, v.document_path, v.document_name, v.notes AS ver_notes
       FROM organizations o JOIN users u ON u.id = o.owner_user_id
       LEFT JOIN verification_requests v ON v.org_id = o.id AND v.status = 'pending'
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY CASE o.verification_status WHEN 'pending' THEN 0 ELSE 1 END, o.created_at DESC`,
    ...params,
  );
}

/** Public directory of verified recipient organisations (no private contact data). */
export function publicDirectory(city?: string) {
  return all<{ id: string; name: string; org_type: string; city: string | null; service_area: string | null; operating_hours: string | null; food_preference: string; is_demo: number }>(
    `SELECT id, name, org_type, city, service_area, operating_hours, food_preference, is_demo FROM organizations
      WHERE kind = 'recipient' AND verification_status = 'verified' ${city ? "AND city = ? COLLATE NOCASE" : ""} ORDER BY name`,
    ...(city ? [city] : []),
  );
}

export function verificationHistory(orgId: string) {
  return all<{ id: string; status: string; registration_number: string | null; document_name: string | null; decision_reason: string | null; created_at: string; reviewed_at: string | null }>(
    "SELECT * FROM verification_requests WHERE org_id = ? ORDER BY created_at DESC",
    orgId,
  );
}

/** Who may download a protected verification document: the org owner or an admin. */
export function canAccessDocument(actor: Actor | null, docPath: string) {
  if (!actor) return false;
  const row = get<{ owner_user_id: string }>(
    "SELECT o.owner_user_id FROM verification_requests v JOIN organizations o ON o.id = v.org_id WHERE v.document_path = ?",
    docPath,
  );
  if (!row) return false;
  return isAdmin(actor) || row.owner_user_id === actor.id;
}

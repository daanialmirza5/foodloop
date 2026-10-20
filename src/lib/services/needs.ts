import { all, get, insert, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { requirePermission, requireActor, type Actor } from "../permissions";
import { newId, nowIso } from "../utils";
import { getOrgForUser } from "./organizations";
import { audit } from "./audit";

export type NeedRow = { id: string; org_id: string; title: string; category: string; quantity_kg: number; needed_by: string | null; food_type: string; notes: string | null; status: string; is_demo: number; created_at: string; org_name: string; org_city: string | null };

export function createNeed(actorIn: Actor | null, input: { title: string; category: string; quantity_kg: number; needed_by?: string; food_type: string; notes?: string }) {
  const actor = requirePermission(actorIn, "need.create");
  const org = getOrgForUser(actor.id, "recipient");
  if (!org) throw invalid("Register your organisation first.");
  if (org.verification_status !== "verified") throw forbidden("Only verified organisations can publish food requirements.");
  const id = newId("ned");
  insert("food_needs", { id, org_id: org.id, created_by: actor.id, ...input, status: "open", is_demo: actor.is_demo, created_at: nowIso() });
  audit(actor.id, "need.create", "food_need", id);
  return id;
}

export function closeNeed(actorIn: Actor | null, id: string, status: "fulfilled" | "closed") {
  const actor = requireActor(actorIn);
  const need = get<{ org_id: string }>("SELECT org_id FROM food_needs WHERE id = ?", id);
  if (!need) throw notFound("Requirement");
  const org = getOrgForUser(actor.id, "recipient");
  if (!org || org.id !== need.org_id) throw forbidden();
  update("food_needs", id, { status });
}

export function listNeeds(filter: { orgId?: string; openOnly?: boolean } = {}) {
  const w = ["o.verification_status = 'verified'"];
  const p: unknown[] = [];
  if (filter.orgId) (w.push("n.org_id = ?"), p.push(filter.orgId));
  if (filter.openOnly) w.push("n.status = 'open'");
  return all<NeedRow>(`SELECT n.*, o.name AS org_name, o.city AS org_city FROM food_needs n JOIN organizations o ON o.id = n.org_id WHERE ${w.join(" AND ")} ORDER BY n.created_at DESC`, ...p);
}

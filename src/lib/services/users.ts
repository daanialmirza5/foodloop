import { all, get, run, update } from "../db";
import { forbidden, invalid, notFound } from "../errors";
import { requireActor, requirePermission, type Actor } from "../permissions";
import { nowIso } from "../utils";
import { audit, recordHistory } from "./audit";
import { notify } from "./notifications";
import { registerUser } from "../auth";

export function listUsers(filter: { role?: string; q?: string } = {}) {
  const where = ["1=1"];
  const p: unknown[] = [];
  if (filter.role) (where.push("role = ?"), p.push(filter.role));
  if (filter.q) (where.push("(name LIKE ? OR email LIKE ?)"), p.push(`%${filter.q}%`, `%${filter.q}%`));
  return all<{ id: string; name: string; email: string; role: string; status: string; status_reason: string | null; city: string | null; is_demo: number; created_at: string }>(
    `SELECT id, name, email, role, status, status_reason, city, is_demo, created_at FROM users WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    ...p,
  );
}

export function setUserStatus(actorIn: Actor | null, userId: string, status: "active" | "suspended", reason: string) {
  const actor = requirePermission(actorIn, "user.manage");
  if (userId === actor.id) throw forbidden("You cannot change your own account status.");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required.");
  const u = get<{ id: string; status: string }>("SELECT id, status FROM users WHERE id = ?", userId);
  if (!u) throw notFound("User");
  update("users", userId, { status, status_reason: reason, updated_at: nowIso() });
  if (status === "suspended") run("DELETE FROM sessions WHERE user_id = ?", userId);
  recordHistory("user", userId, u.status, status, actor.id, reason);
  audit(actor.id, status === "suspended" ? "user.suspend" : "user.reinstate", "user", userId, reason);
  if (status === "active") notify([userId], "account", "Your account has been reinstated", reason);
}

/** Only an existing administrator may create another administrator. */
export function createAdminByAdmin(actorIn: Actor | null, input: { name: string; email: string; password: string }, reason: string) {
  const actor = requirePermission(actorIn, "user.manage");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required.");
  const u = registerUser({ ...input, role: "admin" }, { allowAdmin: true });
  audit(actor.id, "user.create_admin", "user", u.id, reason);
  return u;
}

export function updateProfile(actorIn: Actor | null, input: { name: string; phone?: string; city?: string }) {
  const actor = requireActor(actorIn);
  if (!input.name || input.name.trim().length < 2) throw invalid("Name is required.");
  update("users", actor.id, { name: input.name.trim(), phone: input.phone || null, city: input.city || null, updated_at: nowIso() });
}

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get, insert, run, update } from "./db";
import { AppError, invalid } from "./errors";
import type { Actor } from "./permissions";
import { PUBLIC_ROLES, type Role } from "./constants";
import { newId, nowIso } from "./utils";
import { audit } from "./services/audit";

const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function validatePasswordStrength(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  return null;
}

export type UserRow = Actor & { password_hash: string; phone: string | null; city: string | null; created_at: string };

export function getUserById(id: string) {
  return get<UserRow>("SELECT * FROM users WHERE id = ?", id);
}

export function getUserByEmail(email: string) {
  return get<UserRow>("SELECT * FROM users WHERE email = ? COLLATE NOCASE", email.trim());
}

/**
 * Public registration. `role` must be a public role: an administrator can only be
 * created by scripts/create-admin.ts or by an existing administrator.
 */
export function registerUser(input: { email: string; password: string; name: string; role: string; phone?: string; city?: string }, opts: { allowAdmin?: boolean; isDemo?: boolean } = {}) {
  const role = input.role as Role;
  if (role === "admin" && !opts.allowAdmin) throw new AppError("forbidden", "Administrator accounts cannot be created through public registration.");
  if (role !== "admin" && !(PUBLIC_ROLES as readonly string[]).includes(role)) throw invalid("Please choose a valid role.");
  const pwErr = validatePasswordStrength(input.password);
  if (pwErr) throw invalid(pwErr, { password: pwErr });
  if (getUserByEmail(input.email)) throw invalid("An account with this email already exists.", { email: "Email already registered." });
  const id = newId("usr");
  const ts = nowIso();
  insert("users", {
    id,
    email: input.email.trim().toLowerCase(),
    password_hash: hashPassword(input.password),
    name: input.name.trim(),
    phone: input.phone || null,
    city: input.city || null,
    role,
    status: "active",
    is_demo: opts.isDemo ? 1 : 0,
    created_at: ts,
    updated_at: ts,
  });
  if (role === "volunteer") insert("volunteer_profiles", { user_id: id, updated_at: ts });
  audit(id, "user.register", "user", id, null, { role });
  return getUserById(id)!;
}

export function authenticate(email: string, password: string) {
  const user = getUserByEmail(email);
  // Always run a hash comparison to keep timing similar for unknown emails.
  const ok = user ? verifyPassword(password, user.password_hash) : (verifyPassword(password, hashPassword("x")), false);
  if (!user || !ok) throw new AppError("unauthenticated", "Incorrect email or password.");
  if (user.status === "suspended") throw new AppError("forbidden", "This account is suspended. Contact the FoodLoop team.");
  return user;
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  insert("sessions", { id: sha256(token), user_id: userId, created_at: nowIso(), expires_at: expires.toISOString() });
  return { token, expires };
}

export function getActorFromToken(token: string | undefined | null): Actor | null {
  if (!token) return null;
  const row = get<Actor & { expires_at: string }>(
    `SELECT u.id, u.role, u.name, u.email, u.status, u.is_demo, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    sha256(token),
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE id = ?", sha256(token));
    return null;
  }
  const { expires_at: _e, ...actor } = row;
  return actor;
}

export function destroySession(token: string | undefined | null) {
  if (token) run("DELETE FROM sessions WHERE id = ?", sha256(token));
}

/** Creates a single-use reset token valid for 30 minutes. Returns the raw token. */
export function createPasswordReset(email: string): string | null {
  const user = getUserByEmail(email);
  if (!user) return null;
  const token = randomBytes(24).toString("base64url");
  insert("password_resets", { id: sha256(token), user_id: user.id, expires_at: new Date(Date.now() + 30 * 6e4).toISOString() });
  return token;
}

export function resetPassword(token: string, newPassword: string) {
  const row = get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    "SELECT * FROM password_resets WHERE id = ?",
    sha256(token),
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) throw invalid("This reset link is invalid or has expired.");
  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) throw invalid(pwErr, { password: pwErr });
  update("users", row.user_id, { password_hash: hashPassword(newPassword), updated_at: nowIso() });
  update("password_resets", row.id, { used_at: nowIso() });
  run("DELETE FROM sessions WHERE user_id = ?", row.user_id);
  audit(row.user_id, "user.password_reset", "user", row.user_id);
}

import type { Role } from "./constants";
import { AppError, forbidden } from "./errors";

export type Actor = {
  id: string;
  role: Role;
  name: string;
  email: string;
  status: "active" | "suspended";
  is_demo: number;
};

/**
 * Role → permission matrix. Every service function checks these on the server;
 * hiding buttons in the UI is only a convenience.
 */
export const PERMISSIONS = {
  "listing.create": ["donor", "admin"],
  "event.create": ["donor", "admin"],
  "request.create": ["ngo"],
  "need.create": ["ngo"],
  "collection.claim": ["volunteer"],
  "collection.assign": ["admin"],
  "listing.moderate": ["admin"],
  "org.verify": ["admin"],
  "user.manage": ["admin"],
  "incident.manage": ["admin"],
  "payment.admin": ["admin"],
  "event.coordinate": ["admin"],
  "audit.view": ["admin"],
  "incident.report": ["donor", "ngo", "volunteer", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(actor: Pick<Actor, "role" | "status"> | null | undefined, permission: Permission) {
  if (!actor || actor.status !== "active") return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(actor.role);
}

export function requireActor(actor: Actor | null | undefined): Actor {
  if (!actor) throw new AppError("unauthenticated", "Please sign in to continue.");
  if (actor.status !== "active") throw forbidden("Your account is suspended. Contact the FoodLoop team.");
  return actor;
}

export function requirePermission(actor: Actor | null | undefined, permission: Permission): Actor {
  const a = requireActor(actor);
  if (!can(a, permission)) throw forbidden();
  return a;
}

export const isAdmin = (actor: Actor | null | undefined) => !!actor && actor.role === "admin" && actor.status === "active";

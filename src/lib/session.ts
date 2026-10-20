import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getActorFromToken } from "./auth";
import type { Role } from "./constants";
import type { Actor } from "./permissions";

export const SESSION_COOKIE = "foodloop_session";

export const getActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  return getActorFromToken(jar.get(SESSION_COOKIE)?.value);
});

/** For pages: redirect to sign-in (or a permission page) instead of throwing. */
export async function requireUser(roles?: Role[], next = "/dashboard"): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}&reason=signin`);
  if (actor.status !== "active") redirect("/login?reason=suspended");
  if (roles && !roles.includes(actor.role)) redirect(`/forbidden?need=${roles.join(",")}`);
  return actor;
}

export async function setSessionCookie(token: string, expires: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

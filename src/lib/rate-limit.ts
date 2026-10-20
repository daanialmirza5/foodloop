import { AppError } from "./errors";

/** Simple in-memory fixed-window limiter (per process). Adequate for a single-node deployment. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new AppError("rate_limited", `Too many attempts. Please wait ${Math.ceil((b.resetAt - now) / 1000)} seconds and try again.`);
  }
}

export function resetRateLimits() {
  buckets.clear();
}

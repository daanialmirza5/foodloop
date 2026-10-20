import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "../errors";
import type { ActionState } from "../action-state";

/**
 * Wrap a server action body: converts AppErrors to friendly messages, logs
 * unexpected errors without leaking internals, and revalidates the UI.
 */
export async function runAction(fn: () => Promise<string | ActionState | void> | string | ActionState | void): Promise<ActionState> {
  try {
    const res = await fn();
    revalidatePath("/", "layout");
    if (typeof res === "string") return { ok: true, message: res, stamp: Date.now() };
    if (res) return { ...res, stamp: Date.now() };
    return { ok: true, message: "Saved.", stamp: Date.now() };
  } catch (err) {
    // let Next.js redirect()/notFound() propagate
    unstable_rethrow(err);
    if (err instanceof AppError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors, stamp: Date.now() };
    }
    console.error("[foodloop] unexpected action error", err);
    return { ok: false, error: "Something went wrong. Please try again.", stamp: Date.now() };
  }
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function num(fd: FormData, key: string) {
  const v = Number(str(fd, key));
  return Number.isFinite(v) ? v : NaN;
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

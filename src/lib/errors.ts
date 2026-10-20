export type ErrorCode = "unauthenticated" | "forbidden" | "not_found" | "invalid" | "conflict" | "rate_limited";

/** Errors thrown by the service layer. Messages are safe to show to users. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export const forbidden = (msg = "You do not have permission to do that.") => new AppError("forbidden", msg);
export const notFound = (what = "Record") => new AppError("not_found", `${what} not found.`);
export const invalid = (msg: string, fieldErrors?: Record<string, string>) => new AppError("invalid", msg, fieldErrors);
export const conflict = (msg: string) => new AppError("conflict", msg);

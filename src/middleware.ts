import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast edge check: bounce visitors without a session cookie away from private areas.
 * This is only a convenience — every page and server action re-checks the session
 * and role on the server against the database.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("foodloop_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}&reason=signin`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };

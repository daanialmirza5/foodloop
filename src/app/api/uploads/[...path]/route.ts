import fs from "node:fs";
import { NextResponse } from "next/server";
import { resolveUpload } from "@/lib/uploads";
import { getActor } from "@/lib/session";
import { canAccessDocument } from "@/lib/services/organizations";

/** Food photos are public; verification documents only for their owner and administrators. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  const file = resolveUpload(rel);
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (rel.startsWith("documents/")) {
    const actor = await getActor();
    if (!canAccessDocument(actor, rel)) return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(fs.readFileSync(file.file), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": rel.startsWith("documents/") ? "private, no-store" : "public, max-age=86400",
      "Content-Disposition": rel.startsWith("documents/") ? "attachment" : "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

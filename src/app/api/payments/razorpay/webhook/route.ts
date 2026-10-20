import { NextResponse, type NextRequest } from "next/server";
import { handleRazorpayWebhook } from "@/lib/services/payments";
import { audit } from "@/lib/services/audit";

/** Razorpay webhook: signature-verified, idempotent (replays are ignored). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  try {
    const res = handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature") ?? "", req.headers.get("x-razorpay-event-id"));
    return NextResponse.json({ ok: true, ...res });
  } catch {
    audit(null, "payment.webhook_rejected", "webhook", null);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

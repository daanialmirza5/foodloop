import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getActor } from "@/lib/session";
import { canViewDonation, getDonation, verifyRazorpayPayment } from "@/lib/services/payments";

/**
 * Called by the browser after Razorpay Checkout. The browser's word is NOT trusted:
 * the server verifies the HMAC signature and re-fetches the payment from Razorpay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { donation_id: string; t?: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
    const d = getDonation(body.donation_id);
    if (!d || !canViewDonation(await getActor(), d, body.t)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const status = await verifyRazorpayPayment(d.id, body);
    return NextResponse.json({ status });
  } catch (e) {
    const msg = e instanceof AppError ? e.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

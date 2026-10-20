import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { all, get, insert, tx, update } from "../db";
import { conflict, forbidden, invalid, notFound } from "../errors";
import { isAdmin, requirePermission, type Actor } from "../permissions";
import { newId, nowIso } from "../utils";
import { canPaymentTransition } from "../workflow";
import { audit } from "./audit";
import { notify, notifyAdmins } from "./notifications";

/**
 * Monetary donations.
 *
 *  - "simulated": no gateway keys configured. A FoodLoop-hosted demo checkout
 *    lets you pick an outcome. NO REAL MONEY IS TRANSFERRED and every record is
 *    labelled as simulated.
 *  - "sandbox":   Razorpay TEST keys (rzp_test_…). Real gateway, test money.
 *  - "live":      Razorpay LIVE keys. Only after legal/financial requirements are met.
 *
 * FoodLoop never sees card numbers, CVVs, UPI PINs or bank credentials — those are
 * entered only on the gateway's own checkout. A browser redirect is never treated as
 * proof of payment: success requires a verified signature AND a server-side fetch of
 * the payment, or a signed webhook.
 */
export type PaymentMode = "simulated" | "sandbox" | "live";

export function paymentMode(): PaymentMode {
  const key = process.env.RAZORPAY_KEY_ID;
  if (!key || !process.env.RAZORPAY_KEY_SECRET) return "simulated";
  return key.startsWith("rzp_test_") ? "sandbox" : "live";
}

export type DonationRow = {
  id: string;
  code: string;
  user_id: string | null;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  amount_paise: number;
  currency: string;
  program_id: string | null;
  frequency: string;
  acknowledge_publicly: number;
  mode: PaymentMode;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  status: "created" | "pending" | "succeeded" | "failed" | "cancelled" | "refunded";
  failure_reason: string | null;
  access_token: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

async function razorpay<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw invalid(`Payment gateway error (${res.status}). Please try again.`);
  return (await res.json()) as T;
}

function nextCode() {
  const n = (get<{ n: number }>("SELECT COUNT(*) AS n FROM monetary_donations")?.n ?? 0) + 1;
  return `MD-${new Date().getFullYear()}-${String(n).padStart(4, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export function getDonation(id: string) {
  return get<DonationRow & { program_title: string | null; org_name: string | null }>(
    `SELECT d.*, p.title AS program_title, o.name AS org_name FROM monetary_donations d
       LEFT JOIN meal_programs p ON p.id = d.program_id LEFT JOIN organizations o ON o.id = p.org_id WHERE d.id = ?`,
    id,
  );
}

/** A donation is visible to its owner, an admin, or whoever holds its private access token. */
export function canViewDonation(actor: Actor | null, d: DonationRow, token?: string | null) {
  if (actor && (isAdmin(actor) || d.user_id === actor.id)) return true;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(d.access_token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createDonation(
  actor: Actor | null,
  input: { amount_inr: number; program_id?: string; frequency: "one_time" | "monthly"; donor_name: string; donor_email: string; donor_phone?: string; acknowledge_publicly: boolean },
) {
  if (actor && actor.status !== "active") throw forbidden();
  if (input.program_id) {
    const p = get<{ is_active: number }>("SELECT is_active FROM meal_programs WHERE id = ?", input.program_id);
    if (!p || !p.is_active) throw invalid("Selected programme is not accepting contributions.");
  }
  const amountPaise = Math.round(input.amount_inr * 100);
  if (!Number.isInteger(amountPaise) || amountPaise < 1000) throw invalid("Minimum contribution is ₹10.");
  const mode = paymentMode();
  const id = newId("don");
  const code = nextCode();
  const ts = nowIso();
  const token = randomBytes(18).toString("base64url");
  insert("monetary_donations", {
    id,
    code,
    user_id: actor?.id ?? null,
    donor_name: input.donor_name,
    donor_email: input.donor_email,
    donor_phone: input.donor_phone ?? null,
    amount_paise: amountPaise,
    currency: "INR",
    program_id: input.program_id ?? null,
    frequency: input.frequency,
    acknowledge_publicly: input.acknowledge_publicly,
    mode,
    provider: mode === "simulated" ? "simulated" : "razorpay",
    status: "created",
    access_token: token,
    is_demo: mode === "simulated" || actor?.is_demo ? 1 : 0,
    created_at: ts,
    updated_at: ts,
  });
  audit(actor?.id ?? null, "payment.create", "donation", id, null, { amountPaise, mode });

  if (mode === "simulated") {
    update("monetary_donations", id, { provider_order_id: `sim_order_${id}`, status: "pending", updated_at: nowIso() });
  } else {
    const order = await razorpay<{ id: string }>("/orders", { method: "POST", body: { amount: amountPaise, currency: "INR", receipt: code, notes: { donation_id: id } } });
    update("monetary_donations", id, { provider_order_id: order.id, status: "pending", updated_at: nowIso() });
  }
  return { donation: getDonation(id)!, token };
}

/**
 * Apply a status change exactly once. `eventId` must be unique per provider event,
 * so replays of the same webhook / form submission are ignored.
 */
export function applyPaymentEvent(donationId: string, to: DonationRow["status"], eventId: string, verifiedBy: string, payload?: unknown, extra: Record<string, unknown> = {}) {
  return tx(() => {
    if (get("SELECT 1 FROM payment_transactions WHERE provider_event_id = ?", eventId)) return { applied: false, reason: "duplicate" as const };
    const d = getDonation(donationId);
    if (!d) throw notFound("Donation");
    if (d.status === to) {
      insert("payment_transactions", { id: newId("ptx"), donation_id: d.id, provider_event_id: eventId, event_type: `noop:${to}`, from_status: d.status, to_status: to, verified_by: verifiedBy, payload_json: payload ? JSON.stringify(payload) : null, created_at: nowIso() });
      return { applied: false, reason: "already" as const };
    }
    if (!canPaymentTransition(d.status, to)) throw invalid(`Invalid payment status change: ${d.status} → ${to}.`);
    update("monetary_donations", d.id, { status: to, updated_at: nowIso(), ...extra });
    insert("payment_transactions", { id: newId("ptx"), donation_id: d.id, provider_event_id: eventId, event_type: to, from_status: d.status, to_status: to, verified_by: verifiedBy, payload_json: payload ? JSON.stringify(payload) : null, created_at: nowIso() });
    return { applied: true, reason: null, donation: d };
  });
}

function afterStatus(d: DonationRow, to: string) {
  if (d.user_id) {
    const simulated = d.mode === "simulated" ? " (SIMULATED — no money moved)" : "";
    if (to === "succeeded") notify([d.user_id], "payment.success", `Contribution ${d.code} confirmed${simulated}`, `₹${(d.amount_paise / 100).toLocaleString("en-IN")}`, `/donate-money/receipt/${d.id}`);
    if (to === "failed") notify([d.user_id], "payment.failed", `Payment ${d.code} failed`, d.failure_reason ?? undefined, `/donate-money/receipt/${d.id}`);
  }
  if (to === "succeeded") notifyAdmins("payment.success", `New contribution ${d.code}${d.mode === "simulated" ? " (simulated)" : ""}`, undefined, "/admin/payments");
}

/** Demo checkout outcome. Only possible when no gateway is configured. */
export function completeSimulated(actor: Actor | null, donationId: string, token: string | null, outcome: "success" | "failure" | "cancel") {
  if (paymentMode() !== "simulated") throw forbidden("Simulated payments are disabled because a payment gateway is configured.");
  const d = getDonation(donationId);
  if (!d) throw notFound("Donation");
  if (!canViewDonation(actor, d, token)) throw forbidden();
  if (d.mode !== "simulated") throw forbidden("Only simulated donations can be completed this way.");
  if (d.status !== "pending") throw conflict(`This payment is already ${d.status}.`);
  const to = outcome === "success" ? "succeeded" : outcome === "failure" ? "failed" : "cancelled";
  const res = applyPaymentEvent(d.id, to, `sim_${d.id}_final`, "simulation", { outcome }, {
    provider_payment_id: outcome === "success" ? `sim_pay_${d.id}` : null,
    failure_reason: outcome === "failure" ? "Simulated failure selected in demo checkout" : null,
  });
  if (res.applied) afterStatus({ ...d, failure_reason: outcome === "failure" ? "Simulated failure" : null }, to);
  return to;
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? "") {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "") {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called after Razorpay Checkout returns. Signature + server-side fetch are both required. */
export async function verifyRazorpayPayment(donationId: string, body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  if (paymentMode() === "simulated") throw forbidden("No payment gateway is configured.");
  const d = getDonation(donationId);
  if (!d) throw notFound("Donation");
  if (d.provider_order_id !== body.razorpay_order_id) throw invalid("Order mismatch.");
  if (!verifyCheckoutSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    audit(null, "payment.signature_invalid", "donation", d.id);
    throw invalid("Payment signature could not be verified.");
  }
  const payment = await razorpay<{ id: string; status: string; amount: number; order_id: string }>(`/payments/${body.razorpay_payment_id}`, { method: "GET" });
  if (payment.order_id !== d.provider_order_id || payment.amount !== d.amount_paise) throw invalid("Payment details do not match this donation.");
  if (payment.status === "captured") {
    const res = applyPaymentEvent(d.id, "succeeded", `${payment.id}:captured`, "signature+fetch", payment, { provider_payment_id: payment.id });
    if (res.applied) afterStatus(d, "succeeded");
    return "succeeded";
  }
  if (payment.status === "failed") {
    applyPaymentEvent(d.id, "failed", `${payment.id}:failed`, "signature+fetch", payment, { provider_payment_id: payment.id });
    return "failed";
  }
  // authorized but not yet captured → remains pending until the webhook arrives
  return "pending";
}

/** Signed Razorpay webhook. Unsigned or replayed events are rejected / ignored. */
export function handleRazorpayWebhook(rawBody: string, signature: string, eventIdHeader: string | null) {
  if (!verifyWebhookSignature(rawBody, signature)) throw forbidden("Invalid webhook signature.");
  const evt = JSON.parse(rawBody) as { event: string; payload: { payment?: { entity: { id: string; order_id: string; error_description?: string } }; refund?: { entity: { payment_id: string } } } };
  const pay = evt.payload.payment?.entity;
  const orderId = pay?.order_id;
  const d = orderId
    ? get<DonationRow>("SELECT * FROM monetary_donations WHERE provider_order_id = ?", orderId)
    : evt.payload.refund
      ? get<DonationRow>("SELECT * FROM monetary_donations WHERE provider_payment_id = ?", evt.payload.refund.entity.payment_id)
      : undefined;
  if (!d) return { ignored: true };
  const eventId = eventIdHeader || `${evt.event}:${pay?.id ?? evt.payload.refund?.entity.payment_id}`;
  let to: DonationRow["status"] | null = null;
  if (evt.event === "payment.captured" || evt.event === "order.paid") to = "succeeded";
  else if (evt.event === "payment.failed") to = "failed";
  else if (evt.event === "refund.processed") to = "refunded";
  if (!to) return { ignored: true };
  const res = applyPaymentEvent(d.id, to, eventId, "webhook", evt, pay ? { provider_payment_id: pay.id, failure_reason: pay.error_description ?? null } : {});
  if (res.applied) afterStatus(d, to);
  return { ignored: !res.applied };
}

export async function refundDonation(actorIn: Actor | null, id: string, reason: string) {
  const actor = requirePermission(actorIn, "payment.admin");
  if (!reason || reason.trim().length < 5) throw invalid("A reason is required for refunds.");
  const d = getDonation(id);
  if (!d) throw notFound("Donation");
  if (d.status !== "succeeded") throw invalid("Only successful payments can be refunded.");
  if (get("SELECT 1 FROM refunds WHERE donation_id = ?", id)) throw conflict("A refund already exists for this payment.");
  if (d.mode === "simulated") {
    tx(() => {
      insert("refunds", { id: newId("rfd"), donation_id: id, amount_paise: d.amount_paise, reason, status: "processed", created_by: actor.id, created_at: nowIso() });
      applyPaymentEvent(id, "refunded", `sim_${id}_refund`, "admin", { reason });
    });
  } else {
    await razorpay(`/payments/${d.provider_payment_id}/refund`, { method: "POST", body: { amount: d.amount_paise, notes: { reason } } });
    // status becomes "refunded" only when the signed refund.processed webhook arrives
    insert("refunds", { id: newId("rfd"), donation_id: id, amount_paise: d.amount_paise, reason, status: "recorded", created_by: actor.id, created_at: nowIso() });
  }
  audit(actor.id, "payment.refund", "donation", id, reason);
}

export function recordDisbursement(actorIn: Actor | null, programId: string, amountInr: number, description: string) {
  const actor = requirePermission(actorIn, "payment.admin");
  if (!(amountInr > 0)) throw invalid("Enter an amount.");
  if (!description || description.trim().length < 5) throw invalid("Describe the disbursement (what, to whom, reference).");
  const prog = get<{ id: string }>("SELECT id FROM meal_programs WHERE id = ?", programId);
  if (!prog) throw notFound("Programme");
  const s = programFinancials(programId);
  const amount = Math.round(amountInr * 100);
  if (amount > s.available_paise) throw invalid("Disbursement exceeds confirmed, unrefunded funds for this programme.");
  const id = newId("dsb");
  insert("disbursements", { id, program_id: programId, amount_paise: amount, description, recorded_by: actor.id, is_demo: actor.is_demo, created_at: nowIso() });
  audit(actor.id, "payment.disburse", "meal_program", programId, description, { amount });
}

export function programFinancials(programId: string) {
  const raised = get<{ p: number }>("SELECT COALESCE(SUM(amount_paise),0) AS p FROM monetary_donations WHERE program_id = ? AND status = 'succeeded'", programId)?.p ?? 0;
  const disbursed = get<{ p: number }>("SELECT COALESCE(SUM(amount_paise),0) AS p FROM disbursements WHERE program_id = ?", programId)?.p ?? 0;
  return { raised_paise: raised, disbursed_paise: disbursed, available_paise: raised - disbursed };
}

export type ProgramRow = {
  id: string;
  org_id: string;
  org_name: string;
  org_city: string | null;
  title: string;
  summary: string;
  purpose: string;
  est_cost_per_meal_paise: number | null;
  cost_basis_verified: number;
  cost_basis_note: string | null;
  goal_paise: number | null;
  image: string | null;
  is_active: number;
  is_demo: number;
  raised_paise: number;
  disbursed_paise: number;
};

export function listPrograms(activeOnly = true) {
  return all<ProgramRow>(
    `SELECT p.*, o.name AS org_name, o.city AS org_city,
       (SELECT COALESCE(SUM(amount_paise),0) FROM monetary_donations d WHERE d.program_id = p.id AND d.status = 'succeeded') AS raised_paise,
       (SELECT COALESCE(SUM(amount_paise),0) FROM disbursements x WHERE x.program_id = p.id) AS disbursed_paise
       FROM meal_programs p JOIN organizations o ON o.id = p.org_id
      WHERE o.verification_status = 'verified' ${activeOnly ? "AND p.is_active = 1" : ""} ORDER BY p.created_at`,
  );
}

export function getProgram(id: string) {
  return listPrograms(false).find((p) => p.id === id);
}

export function listDonations(filter: { userId?: string; status?: string } = {}) {
  const where = ["1=1"];
  const p: unknown[] = [];
  if (filter.userId) (where.push("d.user_id = ?"), p.push(filter.userId));
  if (filter.status) (where.push("d.status = ?"), p.push(filter.status));
  return all<DonationRow & { program_title: string | null }>(
    `SELECT d.*, p.title AS program_title FROM monetary_donations d LEFT JOIN meal_programs p ON p.id = d.program_id WHERE ${where.join(" AND ")} ORDER BY d.created_at DESC`,
    ...p,
  );
}

export function paymentEventsFor(donationId: string) {
  return all<{ provider_event_id: string; event_type: string; from_status: string | null; to_status: string | null; verified_by: string; created_at: string }>(
    "SELECT * FROM payment_transactions WHERE donation_id = ? ORDER BY created_at ASC, rowid ASC",
    donationId,
  );
}

export function listDisbursements() {
  return all<{ id: string; program_title: string; amount_paise: number; description: string; created_at: string; is_demo: number; recorder: string }>(
    `SELECT x.*, p.title AS program_title, u.name AS recorder FROM disbursements x JOIN meal_programs p ON p.id = x.program_id JOIN users u ON u.id = x.recorded_by ORDER BY x.created_at DESC`,
  );
}

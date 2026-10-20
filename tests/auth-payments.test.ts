import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { actor, freshDb } from "./helpers";
import { authenticate, createSession, getActorFromToken, registerUser, verifyPassword, hashPassword } from "@/lib/auth";
import { applyPaymentEvent, completeSimulated, createDonation, getDonation, handleRazorpayWebhook, verifyCheckoutSignature, verifyRazorpayPayment, verifyWebhookSignature } from "@/lib/services/payments";
import { reviewVerification } from "@/lib/services/organizations";
import { setUserStatus } from "@/lib/services/users";
import { get } from "@/lib/db";
import { screenFood } from "@/lib/safety";
import { sniffType } from "@/lib/uploads";

beforeEach(async () => {
  await freshDb();
});

describe("Authentication", () => {
  it("hashes passwords and rejects wrong ones", () => {
    const h = hashPassword("Secret123");
    expect(h).not.toContain("Secret123");
    expect(verifyPassword("Secret123", h)).toBe(true);
    expect(verifyPassword("Secret124", h)).toBe(false);
    expect(() => authenticate("admin@foodloop.demo", "wrong")).toThrow(/Incorrect/);
  });

  it("public registration can never create an administrator", () => {
    expect(() => registerUser({ email: "x@y.com", password: "Passw0rd!", name: "X", role: "admin" })).toThrow(/Administrator/);
    const u = registerUser({ email: "x@y.com", password: "Passw0rd!", name: "X", role: "donor" });
    expect(u.role).toBe("donor");
  });

  it("sessions resolve to the user and suspended users lose access", () => {
    const u = authenticate("supporter@foodloop.demo", "Demo@1234");
    const { token } = createSession(u.id);
    expect(getActorFromToken(token)?.email).toBe("supporter@foodloop.demo");
    setUserStatus(actor("admin@foodloop.demo"), u.id, "suspended", "Test suspension");
    expect(getActorFromToken(token)).toBeNull();
    expect(() => authenticate("supporter@foodloop.demo", "Demo@1234")).toThrow(/suspended/);
  });
});

describe("NGO verification", () => {
  it("only admins can verify, with a reason", () => {
    const org = get<{ id: string }>("SELECT id FROM organizations WHERE name LIKE 'New Dawn%'")!;
    expect(() => reviewVerification(actor("ngo@foodloop.demo"), org.id, "verified", "looks fine")).toThrow(/permission/);
    expect(() => reviewVerification(actor("admin@foodloop.demo"), org.id, "verified", "")).toThrow(/reason/);
    reviewVerification(actor("admin@foodloop.demo"), org.id, "verified", "Documents checked");
    expect(get<{ verification_status: string }>("SELECT verification_status FROM organizations WHERE id = ?", org.id)!.verification_status).toBe("verified");
    expect(get("SELECT 1 FROM audit_logs WHERE action = 'org.verify' AND entity_id = ?", org.id)).toBeTruthy();
  });
});

describe("Payments", () => {
  it("simulated payments are labelled and processed exactly once", async () => {
    const sup = actor("supporter@foodloop.demo");
    const { donation, token } = await createDonation(sup, { amount_inr: 500, frequency: "one_time", donor_name: "K", donor_email: "k@x.com", acknowledge_publicly: false });
    expect(donation.mode).toBe("simulated");
    expect(donation.status).toBe("pending");
    completeSimulated(sup, donation.id, token, "success");
    expect(getDonation(donation.id)!.status).toBe("succeeded");
    expect(() => completeSimulated(sup, donation.id, token, "success")).toThrow(/already/);
    const dup = applyPaymentEvent(donation.id, "succeeded", `sim_${donation.id}_final`, "simulation");
    expect(dup.applied).toBe(false);
  });

  it("rejects invalid status transitions", async () => {
    const { donation, token } = await createDonation(null, { amount_inr: 100, frequency: "one_time", donor_name: "G", donor_email: "g@x.com", acknowledge_publicly: false });
    completeSimulated(null, donation.id, token, "failure");
    expect(() => applyPaymentEvent(donation.id, "succeeded", "evt-x", "test")).toThrow(/Invalid payment status/);
  });

  it("guests need the private token to complete or view a donation", async () => {
    const { donation } = await createDonation(null, { amount_inr: 100, frequency: "one_time", donor_name: "G", donor_email: "g@x.com", acknowledge_publicly: false });
    expect(() => completeSimulated(null, donation.id, "bad-token", "success")).toThrow();
  });

  it("verifies Razorpay checkout and webhook signatures; a redirect alone cannot confirm", async () => {
    const secret = "test_secret";
    const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, secret)).toBe(false);
    const body = JSON.stringify({ event: "payment.captured" });
    const wsig = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wsig, "whsec")).toBe(true);
    expect(verifyWebhookSignature(body + " ", wsig, "whsec")).toBe(false);
    // no gateway configured → server-side verification is refused; nothing becomes "succeeded"
    const { donation } = await createDonation(null, { amount_inr: 100, frequency: "one_time", donor_name: "G", donor_email: "g@x.com", acknowledge_publicly: false });
    await expect(verifyRazorpayPayment(donation.id, { razorpay_order_id: "x", razorpay_payment_id: "y", razorpay_signature: "z" })).rejects.toThrow();
    expect(() => handleRazorpayWebhook(body, "forged", null)).toThrow(/signature/);
    expect(getDonation(donation.id)!.status).toBe("pending");
  });
});

describe("Safety rules & uploads", () => {
  const base = {
    category: "cooked_meals", storage_condition: "hot_held", storage_temp_c: 65, packaging_condition: "covered_food_grade",
    prepared_at: new Date(Date.now() - 36e5).toISOString(), collection_deadline: new Date(Date.now() + 2 * 36e5).toISOString(),
    pickup_window_start: new Date(Date.now() + 6e5).toISOString(), pickup_window_end: new Date(Date.now() + 36e5).toISOString(),
    allergens: "None known", not_served_confirmed: true, hygiene_confirmed: true,
  };
  it("passes hot-held food and fails cool hot-held food", () => {
    expect(screenFood(base).result).toBe("pass");
    expect(screenFood({ ...base, storage_temp_c: 40 }).result).toBe("fail");
    expect(screenFood({ ...base, storage_temp_c: null }).result).toBe("needs_review");
    expect(screenFood({ ...base, storage_condition: "exposed_unknown" }).result).toBe("fail");
    expect(screenFood({ ...base, packaging_condition: "damaged" }).result).toBe("fail");
  });
  it("identifies files by content, not name", () => {
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("png");
    expect(sniffType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});

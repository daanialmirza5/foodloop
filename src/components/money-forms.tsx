"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ActionForm, Checkbox, Input, Select, SubmitButton } from "./forms";
import { donateAction, simulatePaymentAction } from "@/lib/actions";
import { SUGGESTED_AMOUNTS_INR } from "@/lib/constants";
import { cn } from "@/lib/format";

export function DonateForm({ programs, defaultProgram, name, email, mode }: { programs: { id: string; title: string }[]; defaultProgram?: string; name?: string; email?: string; mode: string }) {
  const [choice, setChoice] = useState("1000");
  return (
    <ActionForm action={donateAction} className="space-y-5">
      <Select label="Support" name="program_id" defaultValue={defaultProgram ?? ""} placeholder="General FoodLoop meal fund" options={programs.map((p) => ({ value: p.id, label: p.title }))} />
      <fieldset>
        <legend className="label">Amount (₹)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[...SUGGESTED_AMOUNTS_INR.map(String), "custom"].map((a) => (
            <label key={a} className={cn("cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition", choice === a ? "border-forest-700 bg-forest-700 text-white" : "border-black/10 bg-white hover:border-forest-300")}>
              <input type="radio" name="amount_choice" value={a} checked={choice === a} onChange={() => setChoice(a)} className="sr-only" />
              {a === "custom" ? "Other" : `₹${Number(a).toLocaleString("en-IN")}`}
            </label>
          ))}
        </div>
        {choice === "custom" && <Input label="Custom amount (₹)" name="amount_inr" type="number" min="10" max="500000" required className="mt-3" />}
      </fieldset>
      <Select
        label="Frequency"
        name="frequency"
        options={[
          { value: "one_time", label: "One-time" },
          { value: "monthly", label: "Monthly pledge (first payment now; renewals not automated in this build)" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" name="donor_name" required defaultValue={name} autoComplete="name" />
        <Input label="Email (for your receipt)" name="donor_email" type="email" required defaultValue={email} autoComplete="email" />
      </div>
      <Input label="Phone (optional)" name="donor_phone" type="tel" />
      <Checkbox name="acknowledge_publicly" label="You may acknowledge my contribution publicly by name" hint="Off by default. We never publish email or phone." />
      <SubmitButton className="w-full" pendingText="Creating secure order…">
        {mode === "simulated" ? "Continue to demo checkout" : "Continue to secure payment"}
      </SubmitButton>
      <p className="text-xs text-muted">FoodLoop never sees or stores card numbers, CVVs, UPI PINs or bank credentials. No tax-deduction certificate is issued.</p>
    </ActionForm>
  );
}

export function SimulatedCheckout({ id, token }: { id: string; token: string }) {
  return (
    <ActionForm action={simulatePaymentAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={token} />
      <SubmitButton name="outcome" value="success" className="w-full">
        Simulate successful payment
      </SubmitButton>
      <div className="grid grid-cols-2 gap-2">
        <SubmitButton name="outcome" value="failure" variant="danger">
          Simulate failure
        </SubmitButton>
        <SubmitButton name="outcome" value="cancel" variant="secondary">
          Cancel payment
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

/** Razorpay Checkout (sandbox or live). The result is verified server-side; nothing here is trusted. */
export function RazorpayCheckout({ keyId, orderId, amount, id, token, name, email, sandbox }: { keyId: string; orderId: string; amount: number; id: string; token: string; name: string; email: string; sandbox: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const pay = () => {
    if (!window.Razorpay) return setMsg("Payment window could not load. Check your connection.");
    const rz = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency: "INR",
      name: "FoodLoop",
      description: sandbox ? "SANDBOX test payment" : "Meal contribution",
      prefill: { name, email },
      theme: { color: "#1b4d33" },
      handler: async (resp: Record<string, string>) => {
        setMsg("Verifying payment with the server…");
        const r = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ donation_id: id, t: token, ...resp }) });
        const j = (await r.json()) as { status?: string; error?: string };
        if (!r.ok) setMsg(j.error ?? "Verification failed.");
        router.push(`/donate-money/receipt/${id}?t=${token}`);
      },
      modal: { ondismiss: () => setMsg("Payment window closed. No payment was taken.") },
    });
    rz.on("payment.failed", () => setMsg("The payment failed. You were not charged."));
    rz.open();
  };
  return (
    <div className="space-y-3">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setReady(true)} />
      <button className="btn-primary w-full" onClick={pay} disabled={!ready}>
        {ready ? "Pay securely with Razorpay" : "Loading secure checkout…"}
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

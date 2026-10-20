import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { canViewDonation, getDonation } from "@/lib/services/payments";
import { formatInr } from "@/lib/format";
import { KeyValue, PageHeader, Section } from "@/components/ui";
import { RazorpayCheckout, SimulatedCheckout } from "@/components/money-forms";

export const metadata = { title: "Checkout" };

export default async function Checkout({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const d = getDonation(id);
  if (!d || !canViewDonation(await getActor(), d, t)) notFound();
  if (d.status !== "pending") redirect(`/donate-money/receipt/${id}?t=${t ?? ""}`);
  return (
    <div className="container-page max-w-xl py-10">
      <PageHeader title="Checkout" subtitle={`Reference ${d.code}`} />
      {d.mode === "simulated" && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-saffron-500 bg-saffron-100 p-5 text-center">
          <p className="text-xl font-extrabold tracking-wide text-saffron-700">DEMO MODE — NO REAL MONEY IS TRANSFERRED.</p>
          <p className="mt-1 text-sm text-saffron-700">This is a simulated checkout for demonstration. Choose an outcome below. No card or UPI details are requested.</p>
        </div>
      )}
      <Section>
        <KeyValue
          items={[
            ["Amount", <span key="a" className="text-lg font-bold">{formatInr(d.amount_paise)}</span>],
            ["Programme", d.program_title ?? "General meal fund"],
            ["Frequency", d.frequency === "monthly" ? "Monthly pledge" : "One-time"],
            ["Donor", d.donor_name],
            ["Mode", d.mode === "simulated" ? "Simulated (demo)" : d.mode === "sandbox" ? "Razorpay sandbox (test)" : "Razorpay live"],
          ]}
        />
        <div className="mt-6">
          {d.mode === "simulated" ? (
            <SimulatedCheckout id={d.id} token={d.access_token} />
          ) : (
            <RazorpayCheckout keyId={process.env.RAZORPAY_KEY_ID!} orderId={d.provider_order_id!} amount={d.amount_paise} id={d.id} token={d.access_token} name={d.donor_name} email={d.donor_email} sandbox={d.mode === "sandbox"} />
          )}
        </div>
      </Section>
    </div>
  );
}

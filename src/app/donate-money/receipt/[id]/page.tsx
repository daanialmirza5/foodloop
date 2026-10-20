import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getActor } from "@/lib/session";
import { canViewDonation, getDonation, paymentEventsFor } from "@/lib/services/payments";
import { formatDateTime, formatInr } from "@/lib/format";
import { Alert, KeyValue, PageHeader, Section, StatusBadge } from "@/components/ui";

export const metadata = { title: "Receipt" };

export default async function Receipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const d = getDonation(id);
  if (!d || !canViewDonation(await getActor(), d, t)) notFound();
  const events = paymentEventsFor(id);
  const Icon = d.status === "succeeded" ? CheckCircle2 : d.status === "pending" || d.status === "created" ? Clock : XCircle;
  return (
    <div className="container-page max-w-2xl py-10">
      <PageHeader title={d.mode === "simulated" ? "Simulated transaction record" : "Transaction record"} subtitle={`Reference ${d.code}`} actions={<StatusBadge status={d.status} />} />
      {d.mode === "simulated" && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-saffron-500 bg-saffron-100 p-4 text-center">
          <p className="text-lg font-extrabold text-saffron-700">SIMULATED — NO REAL MONEY WAS TRANSFERRED.</p>
          <p className="text-sm text-saffron-700">This record exists only to demonstrate the workflow. It is not a receipt for a real payment.</p>
        </div>
      )}
      <Section>
        <div className="mb-5 flex items-center gap-3">
          <Icon className={d.status === "succeeded" ? "size-8 text-forest-600" : d.status === "pending" ? "size-8 text-saffron-500" : "size-8 text-red-600"} />
          <div>
            <p className="text-2xl font-bold text-forest-900">{formatInr(d.amount_paise)}</p>
            <p className="text-sm text-muted">
              {d.status === "succeeded" ? "Payment confirmed" : d.status === "pending" ? "Awaiting confirmation from the payment provider" : d.status === "refunded" ? "Refunded" : d.status === "cancelled" ? "Cancelled — no payment taken" : "Payment failed — you were not charged"}
            </p>
          </div>
        </div>
        <KeyValue
          items={[
            ["Programme", d.program_title ? `${d.program_title} (${d.org_name})` : "General meal fund"],
            ["Donor", d.donor_name],
            ["Date", formatDateTime(d.created_at)],
            ["Provider", d.mode === "simulated" ? "Simulation (no provider)" : `Razorpay ${d.mode}`],
            ["Provider order", d.provider_order_id],
            ["Provider payment", d.provider_payment_id],
          ]}
        />
        {d.failure_reason && <Alert tone="error" className="mt-4">{d.failure_reason}</Alert>}
        <p className="mt-5 text-xs text-muted">FoodLoop does not issue tax-exemption certificates. Contributions are recorded as disbursed only when a disbursement to the programme is logged.</p>
      </Section>
      <Section title="Verification trail" className="mt-6">
        <ul className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.provider_event_id} className="flex flex-wrap items-center gap-2">
              <StatusBadge status={e.to_status ?? e.event_type} />
              <span className="text-muted">
                {formatDateTime(e.created_at)} · verified by {e.verified_by}
              </span>
            </li>
          ))}
          {!events.length && <li className="text-muted">No provider events yet.</li>}
        </ul>
      </Section>
      <div className="mt-6 flex gap-3">
        <Link href="/donate-money" className="btn-secondary">
          Back to programmes
        </Link>
        <Link href="/impact" className="btn-ghost">
          See impact
        </Link>
      </div>
    </div>
  );
}

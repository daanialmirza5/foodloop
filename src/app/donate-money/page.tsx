import { HeartHandshake, ShieldCheck } from "lucide-react";
import { getActor } from "@/lib/session";
import { listPrograms, paymentMode } from "@/lib/services/payments";
import { formatInr } from "@/lib/format";
import { Alert, DemoBadge, PageHeader, Section } from "@/components/ui";
import { DonateForm } from "@/components/money-forms";

export const metadata = { title: "Donate money" };

export default async function DonateMoney({ searchParams }: { searchParams: Promise<{ program?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const actor = await getActor();
  const programs = listPrograms();
  const mode = paymentMode();
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Fund meals" title="Donate money" subtitle="Support verified meal programmes and the logistics that carry rescued food. Every contribution is tracked from payment to recorded disbursement." />
      {mode === "simulated" ? (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-saffron-500 bg-saffron-100 p-4 text-center">
          <p className="text-lg font-extrabold tracking-wide text-saffron-700">DEMO MODE — NO REAL MONEY IS TRANSFERRED.</p>
          <p className="mt-1 text-sm text-saffron-700">No payment gateway is configured. You will see a simulated checkout and every record is labelled as simulated.</p>
        </div>
      ) : mode === "sandbox" ? (
        <Alert tone="warning" title="Razorpay SANDBOX" className="mb-6">
          Test mode: use Razorpay test cards/UPI. No real money moves.
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {programs.map((p) => {
            const pct = p.goal_paise ? Math.min(100, Math.round((p.raised_paise / p.goal_paise) * 100)) : 0;
            return (
              <article key={p.id} id={p.id} className="card flex flex-col overflow-hidden sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image && <img src={p.image} alt="" className="h-40 w-full object-cover sm:h-auto sm:w-44" />}
                <div className="flex-1 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-forest-900">{p.title}</h2>
                    <DemoBadge show={p.is_demo} />
                  </div>
                  <p className="text-xs text-muted">
                    by {p.org_name}, {p.org_city}
                  </p>
                  <p className="mt-2 text-sm text-ink/80">{p.summary}</p>
                  <p className="mt-2 text-xs">
                    <strong>Purpose:</strong> {p.purpose}
                  </p>
                  {p.est_cost_per_meal_paise ? (
                    <p className="mt-1 text-xs text-muted">
                      Illustrative estimate: ~{formatInr(p.est_cost_per_meal_paise)} per meal{p.cost_basis_verified ? "" : " — not independently verified"}. We don’t promise a fixed number of meals per rupee.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Funding progress">
                      <div className="h-full rounded-full bg-leaf-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatInr(p.raised_paise)} confirmed{mode === "simulated" ? " (simulated)" : ""} of {formatInr(p.goal_paise)} goal · {formatInr(p.disbursed_paise)} disbursed
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          {!programs.length && <p className="text-sm text-muted">No verified programmes are accepting contributions yet.</p>}
        </div>
        <div className="space-y-4">
          <Section title="Your contribution">
            <DonateForm programs={programs} defaultProgram={sp.program} name={actor?.name} email={actor?.email} mode={mode} />
          </Section>
          <div className="card space-y-2 p-5 text-sm text-ink/75">
            <p className="flex items-center gap-2 font-semibold text-forest-900">
              <ShieldCheck className="size-4" /> How we handle money
            </p>
            <p>Payments are verified on our server with the payment provider — a browser redirect alone never marks a payment successful.</p>
            <p>Funds are shown as disbursed only when a recorded disbursement exists.</p>
            <p className="flex items-center gap-2 text-xs text-muted">
              <HeartHandshake className="size-3.5" /> FoodLoop is a student project and does not offer tax benefits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

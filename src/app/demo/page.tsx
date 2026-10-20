import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { isDemoMode } from "@/lib/utils";
import { getUserByEmail } from "@/lib/auth";
import { Alert, PageHeader, Section } from "@/components/ui";
import { DemoLoginButton, ResetDemoButton } from "./client";

export const metadata = { title: "Demo access" };

const SCENARIOS = [
  ["A", "Restaurant surplus → NGO", "Sign in as Annapurna (NGO) → Discover Food → request “Veg biryani & dal tadka”. Switch to the restaurant donor → accept. Switch to volunteer Arjun → Available tasks → accept → record pickup → handover. Back as NGO → Deliveries → confirm received kg."],
  ["B", "Wedding event rescue", "Sign in as the wedding organiser → My Events → “Iyer–Menon Wedding Reception” → Donate Leftover Food Now. As admin → Listings → approve. Continue as in Scenario A; the event dashboard and impact update on delivery."],
  ["C", "Fresh meals & sponsorship", "As Golden Crust Bakery, see the bread donation requested by Hope Shelter and accept it. Visit Fresh Meals to see meal sponsorship programmes."],
  ["D", "Simulated contribution", "As the supporter (or a guest) → Donate Money → choose a programme → the clearly labelled DEMO checkout → simulate success or failure → receipt."],
  ["E", "Admin verification & incident", "As admin → Organisations → verify “New Dawn Children’s Home” with a reason. Then Incidents → review the bread packaging report."],
];

export default function DemoPage() {
  if (!isDemoMode()) notFound();
  const seeded = !!getUserByEmail("admin@foodloop.demo");
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Presentation mode" title="Demo access" subtitle="One-click sign-in for fictional demonstration accounts. Disable with DEMO_MODE=false before any public deployment." />
      <Alert tone="warning" title="Everything here is fictional" className="mb-6">
        All demo organisations, people, donations and payments are invented and labelled DEMO. Payments are simulated — no real money is transferred. Open listings use deadlines relative to the time of seeding, so reset the demo shortly before presenting.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Demo accounts" description={<span className="inline-flex items-center gap-1"><KeyRound className="size-3.5" /> Password for all: <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs">{DEMO_PASSWORD}</code></span>}>
          {!seeded && <Alert tone="info" className="mb-4">Demo data is not loaded yet. Use “Reset demo data”.</Alert>}
          <ul className="divide-y divide-black/5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-forest-900">{a.label}</p>
                  <p className="text-xs text-muted">{a.email}</p>
                </div>
                <DemoLoginButton email={a.email} disabled={!seeded} />
              </li>
            ))}
          </ul>
        </Section>
        <div className="space-y-6">
          <Section title="Reset demo data" description="Wipes the local database and reloads the fictional scenario data.">
            <ResetDemoButton />
          </Section>
          <Section title="Presentation scenarios">
            <ol className="space-y-4">
              {SCENARIOS.map(([k, t, d]) => (
                <li key={k}>
                  <p className="text-sm font-semibold text-forest-900">
                    <span className="mr-2 inline-grid size-6 place-items-center rounded-md bg-saffron-100 text-xs text-saffron-700">{k}</span>
                    {t}
                  </p>
                  <p className="mt-1 text-sm text-muted">{d}</p>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

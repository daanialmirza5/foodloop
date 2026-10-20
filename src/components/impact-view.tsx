import { Download, Info } from "lucide-react";
import type { Impact } from "@/lib/services/impact";
import { CATEGORY_LABELS, SOURCE_LABELS, type FoodCategory, type Source } from "@/lib/constants";
import { formatInr, formatKg } from "@/lib/format";
import { Alert, DemoBadge, Section, StatCard } from "./ui";
import { Donut, FunnelBar, MonthlyBar } from "./charts";

export function ImpactFilters({ action, from, to, demo, showDemoToggle }: { action: string; from?: string; to?: string; demo: boolean; showDemoToggle: boolean }) {
  return (
    <form method="get" action={action} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label" htmlFor="from">
          From
        </label>
        <input id="from" type="date" name="from" defaultValue={from} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="to">
          To
        </label>
        <input id="to" type="date" name="to" defaultValue={to} className="input" />
      </div>
      {showDemoToggle && (
        <div>
          <label className="label" htmlFor="data">
            Data
          </label>
          <select id="data" name="data" defaultValue={demo ? "demo" : "real"} className="input">
            <option value="demo">Include demonstration data</option>
            <option value="real">Real records only</option>
          </select>
        </div>
      )}
      <button className="btn-primary">Apply</button>
    </form>
  );
}

export function ImpactView({ impact: i, demo, exportHref }: { impact: Impact; demo: boolean; exportHref?: string }) {
  return (
    <div className="space-y-6">
      {demo ? (
        <Alert tone="warning" title="Includes fictional demonstration data">
          Records marked DEMO are invented for presentation. Switch to “Real records only” to see actual platform activity.
        </Alert>
      ) : (
        <Alert tone="info">Showing real (non-demo) records only.</Alert>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Food offered" value={formatKg(i.offered.kg)} hint={`${i.offered.n} listings submitted`} tone="stone" />
        <StatCard label="Accepted after screening" value={formatKg(i.accepted.kg)} hint={`${i.accepted.n} approved`} tone="leaf" />
        <StatCard label="Collected" value={formatKg(i.collected.kg)} hint={`${i.collected.n} pickups recorded`} />
        <StatCard label="Delivered (recipient-confirmed)" value={formatKg(i.delivered.kg)} hint={`${i.delivered.n} successful donations`} tone="saffron" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active donors" value={i.offered.donors} />
        <StatCard label="Verified recipient orgs" value={i.verifiedOrgs} hint={`${i.delivered.orgs} received food in period`} />
        <StatCard label="Volunteer assignments done" value={i.volunteer.completed} hint={`${i.volunteer.hours} hours recorded`} />
        <StatCard label="Estimated meals" value={`≈ ${i.estimate.meals.toLocaleString("en-IN")}`} hint={`Estimate: delivered kg ÷ ${i.estimate.kgPerMeal} kg per meal`} tone="stone" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Food journey (kg)" description="Each stage counted separately; a donation is never re-counted as its status changes.">
          <FunnelBar
            data={[
              { stage: "Offered", kg: i.offered.kg },
              { stage: "Accepted", kg: i.accepted.kg },
              { stage: "Collected", kg: i.collected.kg },
              { stage: "Delivered", kg: i.delivered.kg },
              { stage: "Rejected", kg: i.rejected.kg },
            ]}
          />
        </Section>
        <Section title="Delivered per month (kg)">
          <MonthlyBar data={i.monthly} />
        </Section>
        <Section title="Delivered by source">
          <Donut data={i.bySource.map((s) => ({ name: SOURCE_LABELS[s.source as Source] ?? s.source, value: Math.round(s.kg * 10) / 10 }))} />
        </Section>
        <Section title="Delivered by category">
          <Donut data={i.byCategory.map((c) => ({ name: CATEGORY_LABELS[c.category as FoodCategory] ?? c.category, value: Math.round(c.kg * 10) / 10 }))} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Wedding & event rescue">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Events registered", i.events.registered],
              ["Events that offered food", i.events.offeredFood],
              ["Completed event collections", i.events.completedCollections],
              ["Event food delivered", formatKg(i.eventDeliveredKg)],
              ["Cancelled events", i.events.cancelled],
              ["Fresh-food donations delivered", `${i.freshDelivered.n} (${formatKg(i.freshDelivered.kg)})`],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-semibold text-forest-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Rejected food & reasons" description={`${i.rejected.n} listings · ${formatKg(i.rejected.kg)}`}>
          {Object.keys(i.rejected.reasons).length ? (
            <ul className="space-y-1 text-sm">
              {Object.entries(i.rejected.reasons).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>{k}</span>
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
              {Object.entries(i.rejected.failedChecks).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2 pl-3 text-xs text-muted">
                  <span>↳ failed: {k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No rejections in this period.</p>
          )}
        </Section>
        <Section title="Money">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Confirmed by payment provider</dt>
              <dd className="font-semibold">{formatInr(i.money.provider_confirmed)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-1">
                Simulated (no real money) <DemoBadge />
              </dt>
              <dd className="font-semibold">{formatInr(i.money.simulated)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Refunded</dt>
              <dd className="font-semibold">{formatInr(i.money.refunded)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Disbursed (recorded)</dt>
              <dd className="font-semibold">{formatInr(i.money.disbursed)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Funds are shown as disbursed only when an administrator records an actual disbursement.</p>
        </Section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Info className="size-3.5" /> Meal counts are estimates using a documented {i.estimate.kgPerMeal} kg/meal assumption, not counted meals.
        </p>
        {exportHref && (
          <a href={exportHref} className="btn-secondary btn-sm">
            <Download className="size-3.5" /> Export delivered records (CSV)
          </a>
        )}
      </div>
    </div>
  );
}

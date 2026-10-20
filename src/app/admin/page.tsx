import Link from "next/link";
import { AlertTriangle, Building2, CalendarHeart, PackageCheck, ShieldCheck, Siren, Truck, Users, Wallet } from "lucide-react";
import { get } from "@/lib/db";
import { computeImpact } from "@/lib/services/impact";
import { listAllListings } from "@/lib/services/listings";
import { listCollections } from "@/lib/services/logistics";
import { formatDateTime, formatInr, formatKg } from "@/lib/format";
import { Alert, DemoBadge, PageHeader, Section, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { isDemoMode } from "@/lib/utils";
import { MonthlyBar } from "@/components/charts";

export default function AdminHome() {
  const n = (sql: string) => get<{ n: number }>(sql)?.n ?? 0;
  const pendingListings = listAllListings({ status: "pending_review" });
  const urgent = listAllListings({ urgent: true }).filter((l) => ["pending_review", "available", "request_received", "accepted", "pickup_scheduled"].includes(l.status));
  const needVolunteer = listCollections({ status: "available" });
  const impact = computeImpact({ includeDemo: true });
  const stats = {
    users: n("SELECT COUNT(*) AS n FROM users"),
    pendingOrgs: n("SELECT COUNT(*) AS n FROM organizations WHERE kind = 'recipient' AND verification_status = 'pending'"),
    openIncidents: n("SELECT COUNT(*) AS n FROM incidents WHERE status IN ('open','investigating')"),
    held: n("SELECT COUNT(*) AS n FROM food_listings WHERE safety_hold = 1"),
    eventsToConfirm: n("SELECT COUNT(*) AS n FROM events WHERE status = 'awaiting_confirmation'"),
    failed: n("SELECT COUNT(*) AS n FROM collections WHERE status = 'failed'"),
  };
  return (
    <>
      <PageHeader eyebrow="Administration" title="Platform overview" subtitle={isDemoMode() ? "Demo mode is ON — figures include fictional demo records." : "Live platform."} />
      {(stats.held > 0 || stats.openIncidents > 0) && (
        <Alert tone="error" title="Safety attention needed" className="mb-6">
          {stats.held} donation(s) on safety hold · {stats.openIncidents} open incident(s). <Link href="/admin/incidents" className="link">Review incidents →</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Listings awaiting review" value={pendingListings.length} icon={<ShieldCheck className="size-4" />} tone="saffron" hint={<Link href="/admin/listings?status=pending_review" className="link">Review</Link>} />
        <StatCard label="NGOs awaiting verification" value={stats.pendingOrgs} icon={<Building2 className="size-4" />} tone="saffron" hint={<Link href="/admin/organizations" className="link">Verify</Link>} />
        <StatCard label="Collections needing a volunteer" value={needVolunteer.length} icon={<Truck className="size-4" />} hint={<Link href="/admin/logistics" className="link">Assign</Link>} />
        <StatCard label="Events awaiting confirmation" value={stats.eventsToConfirm} icon={<CalendarHeart className="size-4" />} hint={<Link href="/admin/events" className="link">Confirm</Link>} />
        <StatCard label="Delivered (confirmed)" value={formatKg(impact.delivered.kg)} icon={<PackageCheck className="size-4" />} tone="leaf" hint={`${impact.delivered.n} donations`} />
        <StatCard label="Users" value={stats.users} icon={<Users className="size-4" />} />
        <StatCard label="Open incidents" value={stats.openIncidents} icon={<AlertTriangle className="size-4" />} tone={stats.openIncidents ? "saffron" : "stone"} hint={`${stats.failed} failed collections all-time`} />
        <StatCard label="Contributions" value={formatInr(impact.money.provider_confirmed + impact.money.simulated)} icon={<Wallet className="size-4" />} hint={`${formatInr(impact.money.simulated)} simulated`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Urgent & time-critical" actions={<Siren className="size-4 text-red-600" />}>
          {urgent.length ? (
            <ul className="divide-y divide-black/5">
              {urgent.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/admin/listings/${l.id}`} className="text-sm font-semibold text-forest-900 hover:underline">
                      {l.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {l.code} · {formatKg(l.quantity_kg)} · deadline {formatDateTime(l.collection_deadline)} <DemoBadge show={l.is_demo} />
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <UrgencyBadge deadline={l.collection_deadline} />
                    <StatusBadge status={l.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No urgent rescues in progress.</p>
          )}
        </Section>
        <Section title="Confirmed deliveries per month">
          <MonthlyBar data={impact.monthly} />
        </Section>
      </div>
    </>
  );
}

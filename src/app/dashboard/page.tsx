import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarHeart, CheckCircle2, Clock, Inbox, PackageCheck, PlusCircle, Scale, Siren, Truck, Utensils, Wallet, Search, Timer } from "lucide-react";
import { requireUser } from "@/lib/session";
import { get } from "@/lib/db";
import { listingsForDonor, searchListings } from "@/lib/services/listings";
import { incomingRequestsForDonor, listCollections, openTasks, requestsForOrg, volunteerStats } from "@/lib/services/logistics";
import { listEvents } from "@/lib/services/events";
import { getOrgForUser } from "@/lib/services/organizations";
import { listDonations } from "@/lib/services/payments";
import { formatDate, formatDateTime, formatInr, formatKg } from "@/lib/format";
import { Alert, DemoBadge, EmptyState, PageHeader, Section, StatCard, StatusBadge, UrgencyBadge } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";
import type { Actor } from "@/lib/permissions";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const actor = await requireUser();
  const { welcome } = await searchParams;
  if (actor.role === "admin") redirect("/admin");
  return (
    <>
      {welcome && (
        <Alert tone="success" title={`Welcome to FoodLoop, ${actor.name.split(" ")[0]}!`} className="mb-6">
          Your account is ready.
        </Alert>
      )}
      {actor.role === "donor" && <DonorHome actor={actor} />}
      {actor.role === "ngo" && <NgoHome actor={actor} />}
      {actor.role === "volunteer" && <VolunteerHome actor={actor} />}
      {actor.role === "supporter" && <SupporterHome actor={actor} />}
    </>
  );
}

function DonorHome({ actor }: { actor: Actor }) {
  const mine = listingsForDonor(actor.id);
  const active = mine.filter((l) => ["pending_review", "available", "request_received", "accepted", "pickup_scheduled", "collected"].includes(l.status));
  const requests = incomingRequestsForDonor(actor.id);
  const pending = requests.filter((r) => r.status === "pending");
  const delivered = get<{ n: number; kg: number; ev: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(d.qty_received_kg),0) AS kg, SUM(CASE WHEN l.source = 'event_surplus' THEN 1 ELSE 0 END) AS ev
       FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id WHERE l.donor_user_id = ?`,
    actor.id,
  )!;
  const events = listEvents({ organizerId: actor.id }).filter((e) => !["completed", "cancelled"].includes(e.status));
  const org = getOrgForUser(actor.id, "donor");
  return (
    <>
      <PageHeader
        eyebrow="Donor dashboard"
        title={`Hello, ${actor.name.split(" ")[0]}`}
        subtitle={org ? `Donating as ${org.name}` : "Donating as an individual. Add a business profile if you donate on behalf of an organisation."}
        actions={
          <>
            <Link href="/dashboard/listings/new" className="btn-primary">
              <PlusCircle className="size-4" /> Add food donation
            </Link>
            <Link href="/dashboard/events/new" className="btn-secondary">
              <CalendarHeart className="size-4" /> Register event
            </Link>
            <Link href="/dashboard/events/urgent" className="btn-accent">
              <Siren className="size-4" /> Urgent rescue
            </Link>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active listings" value={active.length} icon={<Utensils className="size-4" />} />
        <StatCard label="Requests received" value={requests.length} hint={`${pending.length} awaiting your decision`} icon={<Inbox className="size-4" />} tone="saffron" />
        <StatCard label="Donations delivered" value={delivered.n} icon={<PackageCheck className="size-4" />} tone="leaf" />
        <StatCard label="Kg delivered" value={formatKg(delivered.kg)} hint="Recipient-confirmed" icon={<Scale className="size-4" />} />
        <StatCard label="Event donations done" value={delivered.ev ?? 0} icon={<CalendarHeart className="size-4" />} tone="saffron" />
      </div>
      {pending.length > 0 && (
        <Section title="Requests awaiting your decision" className="mt-6" actions={<Link href="/dashboard/requests" className="link text-sm">All requests</Link>}>
          <ul className="divide-y divide-black/5">
            {pending.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-forest-900">{r.org_name}</p>
                  <p className="text-xs text-muted">
                    wants “{r.title}” · {formatKg(r.quantity_kg)} · collect by {formatDateTime(r.collection_deadline)}
                  </p>
                </div>
                <Link href={`/dashboard/listings/${r.listing_id}`} className="btn-primary btn-sm">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Active donations" actions={<Link href="/dashboard/listings" className="link text-sm">View all</Link>}>
          {active.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {active.slice(0, 4).map((l) => (
                <ListingCard key={l.id} l={l} href={`/dashboard/listings/${l.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState title="No active donations" body="List surplus or fresh food and FoodLoop will screen it and alert verified NGOs." action={<Link href="/dashboard/listings/new" className="btn-primary">Add food donation</Link>} />
          )}
        </Section>
        <Section title="My events" actions={<Link href="/dashboard/events" className="link text-sm">All events</Link>}>
          {events.length ? (
            <ul className="space-y-3">
              {events.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <Link href={`/dashboard/events/${e.id}`} className="block rounded-xl border border-black/5 p-3 hover:border-forest-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-forest-900">{e.name}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(e.event_date)} · {e.venue_name} <DemoBadge show={e.is_demo} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No upcoming events. Register a wedding or function to plan food rescue ahead of time.</p>
          )}
        </Section>
      </div>
    </>
  );
}

function NgoHome({ actor }: { actor: Actor }) {
  const org = getOrgForUser(actor.id, "recipient");
  const requests = org ? requestsForOrg(org.id) : [];
  const awaiting = listCollections({ orgOwnerId: actor.id }).filter((c) => c.listing_status === "collected");
  const received = org ? get<{ n: number; kg: number }>("SELECT COUNT(*) AS n, COALESCE(SUM(qty_received_kg),0) AS kg FROM delivery_confirmations WHERE recipient_org_id = ?", org.id)! : { n: 0, kg: 0 };
  const open = searchListings({ pageSize: 4, sort: "deadline" });
  return (
    <>
      <PageHeader eyebrow="NGO / recipient dashboard" title={org?.name ?? `Hello, ${actor.name.split(" ")[0]}`} actions={<Link href="/discover" className="btn-primary"><Search className="size-4" /> Browse available food</Link>} />
      {!org && (
        <Alert tone="warning" title="Register your organisation" className="mb-6">
          You need an organisation profile and administrator verification before you can request food. <Link className="link" href="/dashboard/organization">Set up your organisation →</Link>
        </Alert>
      )}
      {org && org.verification_status !== "verified" && (
        <Alert tone={org.verification_status === "pending" ? "info" : "error"} title={`Verification status: ${org.verification_status}`} className="mb-6">
          {org.verification_status === "pending" ? "An administrator will review your documents. You can browse food, but requesting is enabled once verified." : org.verification_note}{" "}
          <Link className="link" href="/dashboard/organization">View details →</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open requests" value={requests.filter((r) => r.status === "pending").length} icon={<Clock className="size-4" />} tone="saffron" />
        <StatCard label="Accepted, on the way" value={requests.filter((r) => r.status === "accepted").length} icon={<Truck className="size-4" />} />
        <StatCard label="Deliveries received" value={received.n} icon={<CheckCircle2 className="size-4" />} tone="leaf" />
        <StatCard label="Kg received" value={formatKg(received.kg)} icon={<Scale className="size-4" />} />
      </div>
      {awaiting.length > 0 && (
        <Alert tone="warning" title={`${awaiting.length} delivery(ies) need your confirmation`} className="mt-6">
          Confirm the quantity and condition you received. <Link className="link" href="/dashboard/deliveries">Confirm now →</Link>
        </Alert>
      )}
      <Section title="Food closing soon" className="mt-6" actions={<Link href="/discover?sort=deadline" className="link text-sm">See all</Link>}>
        {open.rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {open.rows.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <EmptyState title="No food open for requests right now" body="You'll get an in-app alert when suitable food is approved near you." />
        )}
      </Section>
    </>
  );
}

function VolunteerHome({ actor }: { actor: Actor }) {
  const s = volunteerStats(actor.id);
  const tasks = openTasks();
  const mine = listCollections({ volunteerId: actor.id }).filter((c) => ["assigned", "in_transit"].includes(c.status));
  return (
    <>
      <PageHeader eyebrow="Volunteer dashboard" title={`Thank you, ${actor.name.split(" ")[0]}!`} subtitle="Pick up food safely and on time — every run counts." actions={<Link href="/dashboard/tasks" className="btn-primary">Find tasks</Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open tasks near you" value={tasks.length} icon={<Truck className="size-4" />} tone="saffron" />
        <StatCard label="My active assignments" value={s.active ?? 0} icon={<Clock className="size-4" />} />
        <StatCard label="Completed deliveries" value={s.completed ?? 0} icon={<CheckCircle2 className="size-4" />} tone="leaf" />
        <StatCard label="Volunteer hours" value={(s.minutes / 60).toFixed(1)} hint={`${formatKg(s.kg)} carried`} icon={<Timer className="size-4" />} />
      </div>
      <Section title="My active assignments" className="mt-6" actions={<Link href="/dashboard/assignments" className="link text-sm">Manage</Link>}>
        {mine.length ? (
          <ul className="divide-y divide-black/5">
            {mine.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-forest-900">{c.title}</p>
                  <p className="text-xs text-muted">
                    To {c.org_name} · collect by {formatDateTime(c.collection_deadline)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <UrgencyBadge deadline={c.collection_deadline} />
                  <StatusBadge status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No active assignments. Browse available tasks to help.</p>
        )}
      </Section>
    </>
  );
}

function SupporterHome({ actor }: { actor: Actor }) {
  const d = listDonations({ userId: actor.id });
  const total = d.filter((x) => x.status === "succeeded").reduce((s, x) => s + x.amount_paise, 0);
  const simulated = d.some((x) => x.mode === "simulated");
  return (
    <>
      <PageHeader eyebrow="Supporter dashboard" title={`Hello, ${actor.name.split(" ")[0]}`} actions={<Link href="/donate-money" className="btn-primary"><Wallet className="size-4" /> Fund meals</Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={simulated ? "Successful contributions (incl. simulated)" : "Successful contributions"} value={formatInr(total)} icon={<Wallet className="size-4" />} />
        <StatCard label="Transactions" value={d.length} icon={<CheckCircle2 className="size-4" />} tone="leaf" />
        <StatCard label="Programmes supported" value={new Set(d.filter((x) => x.status === "succeeded").map((x) => x.program_id)).size} icon={<Utensils className="size-4" />} tone="saffron" />
      </div>
      <Section title="Recent contributions" className="mt-6" actions={<Link href="/dashboard/contributions" className="link text-sm">All</Link>}>
        {d.length ? (
          <ul className="divide-y divide-black/5">
            {d.slice(0, 5).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <Link href={`/donate-money/receipt/${x.id}`} className="font-semibold text-forest-900 hover:underline">
                    {x.code}
                  </Link>{" "}
                  · {x.program_title ?? "General fund"} {x.mode === "simulated" && <DemoBadge />}
                </span>
                <span className="flex items-center gap-2">
                  {formatInr(x.amount_paise)} <StatusBadge status={x.status} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No contributions yet.</p>
        )}
      </Section>
    </>
  );
}

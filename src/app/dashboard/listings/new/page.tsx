import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listEvents } from "@/lib/services/events";
import { publicDirectory } from "@/lib/services/organizations";
import { SOURCES, SOURCE_LABELS, type Source } from "@/lib/constants";
import { ListingForm } from "@/components/listing-form";
import { PageHeader } from "@/components/ui";
import { cn } from "@/lib/format";

export const metadata = { title: "Add food donation" };

export default async function NewListing({ searchParams }: { searchParams: Promise<{ source?: string; event?: string }> }) {
  const actor = await requireUser(["donor", "admin"], "/dashboard/listings/new");
  const sp = await searchParams;
  const source: Source = (SOURCES as readonly string[]).includes(sp.source ?? "") ? (sp.source as Source) : sp.event ? "event_surplus" : "everyday_surplus";
  const events = listEvents({ organizerId: actor.id }).filter((e) => !["cancelled", "completed"].includes(e.status));
  const recipients = publicDirectory();
  return (
    <>
      <PageHeader eyebrow="Donate food" title={source === "event_surplus" ? "Donate leftover event food" : source === "fresh_donation" ? "Donate fresh food" : "List surplus food"} subtitle="Accurate details keep people safe and help us find the right recipient quickly." />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Donation type">
        {SOURCES.map((s) => (
          <Link key={s} href={`/dashboard/listings/new?source=${s}`} aria-current={s === source ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 text-sm font-medium ring-1", s === source ? "bg-forest-700 text-white ring-forest-700" : "bg-white text-ink/80 ring-black/10 hover:ring-forest-300")}>
            {SOURCE_LABELS[s]}
          </Link>
        ))}
      </nav>
      <ListingForm mode="create" source={source} events={events} recipients={recipients} defaults={{ event_id: sp.event ?? null, contact_name: actor.name }} />
    </>
  );
}

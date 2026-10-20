import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getListing } from "@/lib/services/listings";
import { listEvents } from "@/lib/services/events";
import { publicDirectory } from "@/lib/services/organizations";
import { DONOR_EDITABLE } from "@/lib/workflow";
import { ListingForm } from "@/components/listing-form";
import { Alert, PageHeader } from "@/components/ui";
import type { Source } from "@/lib/constants";

export const metadata = { title: "Edit donation" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["donor", "admin"]);
  const { id } = await params;
  const l = getListing(id);
  if (!l) notFound();
  if (l.donor_user_id !== actor.id && actor.role !== "admin") redirect("/forbidden");
  if (!DONOR_EDITABLE.includes(l.status)) redirect(`/dashboard/listings/${id}`);
  return (
    <>
      <PageHeader title={`Edit ${l.code}`} subtitle={l.title} />
      <Alert tone="info" className="mb-6">
        Saving changes sends this donation back through automated screening and coordinator review before NGOs can see it again.
      </Alert>
      <ListingForm mode="edit" listingId={id} source={l.source as Source} events={listEvents({ organizerId: l.donor_user_id })} recipients={publicDirectory()} defaults={l as unknown as Record<string, string | number | null>} />
    </>
  );
}

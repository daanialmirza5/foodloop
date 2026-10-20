import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getEvent } from "@/lib/services/events";
import { publicDirectory } from "@/lib/services/organizations";
import { EventForm } from "@/components/event-forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Edit event" };

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser(["donor", "admin"]);
  const { id } = await params;
  const ev = getEvent(id);
  if (!ev) notFound();
  if (ev.organizer_user_id !== actor.id && actor.role !== "admin") redirect("/forbidden");
  if (!["registered", "awaiting_confirmation", "awaiting_food"].includes(ev.status)) redirect(`/dashboard/events/${id}`);
  return (
    <>
      <PageHeader title={`Edit ${ev.name}`} />
      <EventForm mode="edit" eventId={id} recipients={publicDirectory()} defaults={ev as unknown as Record<string, string | number | null>} />
    </>
  );
}

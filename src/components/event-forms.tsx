"use client";

import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./forms";
import { createEventAction, updateEventAction, urgentRescueAction, partnerApplyAction } from "@/lib/actions";
import { EVENT_TYPES, EVENT_TYPE_LABELS, FOOD_TYPES, FOOD_TYPE_LABELS, PACKAGING_CONDITIONS, PACKAGING_LABELS, PARTNER_TYPES, STORAGE_CONDITIONS, STORAGE_LABELS } from "@/lib/constants";
import { toLocalInput } from "@/lib/format";

type D = Partial<Record<string, string | number | null>>;

export function EventForm({ mode, defaults = {}, eventId, recipients }: { mode: "create" | "edit"; defaults?: D; eventId?: string; recipients: { id: string; name: string; city: string | null }[] }) {
  const d = (k: string) => (defaults[k] == null ? undefined : String(defaults[k]));
  return (
    <ActionForm action={mode === "create" ? createEventAction : updateEventAction} className="space-y-6">
      {eventId && <input type="hidden" name="id" value={eventId} />}
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">1 · Event</h2>
        <Input label="Event name" name="name" required defaultValue={d("name")} placeholder="e.g. Iyer–Menon Wedding Reception" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Select label="Event type" name="event_type" required defaultValue={d("event_type") ?? "wedding"} options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))} className="sm:col-span-2" />
          <Input label="Date" name="event_date" type="date" required defaultValue={d("event_date")} />
          <Input label="Expected guests" name="expected_guests" type="number" min="1" defaultValue={d("expected_guests")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start time" name="start_time" type="time" defaultValue={d("start_time")} />
          <Input label="End time" name="end_time" type="time" defaultValue={d("end_time")} />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">2 · Venue & organiser</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Venue name" name="venue_name" required defaultValue={d("venue_name")} />
          <Input label="City" name="city" required defaultValue={d("city")} />
        </div>
        <Input label="Venue address" name="venue_address" required defaultValue={d("venue_address")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Latitude (optional)" name="lat" type="number" step="any" defaultValue={d("lat")} />
          <Input label="Longitude (optional)" name="lng" type="number" step="any" defaultValue={d("lng")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Organiser name" name="organizer_name" required defaultValue={d("organizer_name")} />
          <Input label="Organiser phone" name="organizer_phone" type="tel" required defaultValue={d("organizer_phone")} />
          <Input label="Email" name="organizer_email" type="email" defaultValue={d("organizer_email")} />
        </div>
        <Input label="Caterer / food provider" name="caterer" defaultValue={d("caterer")} />
      </fieldset>
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">3 · Expected food (estimates only)</h2>
        <p className="-mt-2 text-sm text-muted">Estimates help coordinators plan. They are never counted as rescued food — only actual food registered after the event is.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Estimated surplus (kg)" name="estimated_surplus_kg" type="number" min="0" step="0.5" defaultValue={d("estimated_surplus_kg")} />
          <Select label="Food type" name="food_type" required defaultValue={d("food_type") ?? "veg"} options={FOOD_TYPES.map((t) => ({ value: t, label: FOOD_TYPE_LABELS[t] }))} />
          <Input label="Expected availability time" name="expected_availability_time" type="time" defaultValue={d("expected_availability_time")} />
        </div>
        <Input label="Expected food types" name="expected_food_types" defaultValue={d("expected_food_types")} placeholder="e.g. Biryani, paneer curry, rotis, sweets" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea label="Packaging arrangements" name="packaging_arrangements" defaultValue={d("packaging_arrangements")} />
          <Textarea label="Storage arrangements" name="storage_arrangements" defaultValue={d("storage_arrangements")} placeholder="Chafing dishes, cold room…" />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">4 · Collection</h2>
        <Input label="Available collection window" name="collection_window" defaultValue={d("collection_window")} placeholder="e.g. 3:30 pm – 6 pm" />
        <Textarea label="Access & parking instructions" name="access_instructions" defaultValue={d("access_instructions")} />
        <Select label="Preferred recipient organisation (optional)" name="preferred_recipient_org_id" defaultValue={d("preferred_recipient_org_id") ?? ""} placeholder="No preference — FoodLoop will match" options={recipients.map((r) => ({ value: r.id, label: `${r.name}${r.city ? ` — ${r.city}` : ""}` }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox name="containers_available" defaultChecked={!!defaults.containers_available} label="Suitable food-grade containers are available" />
          <Checkbox name="transport_available" defaultChecked={!!defaults.transport_available} label="We can transport the food ourselves" />
        </div>
        <Textarea label="Additional instructions" name="instructions" defaultValue={d("instructions")} />
        <Checkbox name="consent_contact" required defaultChecked={mode === "edit"} label="I consent to be contacted by FoodLoop coordinators, volunteers and the recipient about collection" />
      </fieldset>
      <div className="flex flex-wrap gap-3">
        {mode === "create" ? (
          <>
            <SubmitButton name="intent" value="submit">
              Submit event details
            </SubmitButton>
            <SubmitButton name="intent" value="save" variant="secondary">
              Save without submitting
            </SubmitButton>
          </>
        ) : (
          <SubmitButton>Save changes</SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}

export function UrgentRescueForm({ events }: { events: { id: string; name: string }[] }) {
  const soon = (h: number) => toLocalInput(new Date(Date.now() + h * 36e5).toISOString());
  return (
    <ActionForm action={urgentRescueAction} className="space-y-6">
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">Event</h2>
        <Select label="Registered event (optional)" name="event_id" placeholder="Not registered — create a record for this occasion" options={events.map((e) => ({ value: e.id, label: e.name }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Event / occasion name" name="event_name" required placeholder="e.g. Sharma wedding lunch" />
          <Select label="Event type" name="event_type" defaultValue="wedding" options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }))} />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">Food available right now</h2>
        <Input label="Food details" name="title" required placeholder="e.g. Veg pulao, dal, gulab jamun" />
        <Textarea label="Description" name="description" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Quantity (kg)" name="quantity_kg" type="number" min="0.5" step="0.5" required />
          <Select label="Food type" name="food_type" options={FOOD_TYPES.map((t) => ({ value: t, label: FOOD_TYPE_LABELS[t] }))} />
          <Input label="Preparation time" name="prepared_at" type="datetime-local" required defaultValue={soon(-2)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Storage conditions" name="storage_condition" defaultValue="hot_held" options={STORAGE_CONDITIONS.map((s) => ({ value: s, label: STORAGE_LABELS[s] }))} />
          <Input label="Measured temperature (°C)" name="storage_temp_c" type="number" step="0.5" />
          <Select label="Packaging" name="packaging_condition" defaultValue="covered_food_grade" options={PACKAGING_CONDITIONS.map((s) => ({ value: s, label: PACKAGING_LABELS[s] }))} />
        </div>
        <Input label="Known allergens" name="allergens" required placeholder="e.g. Dairy, nuts — or “None known”" />
        <Textarea label="Any safety concerns?" name="safety_concerns" />
        <div className="grid gap-3">
          <Checkbox name="not_served_confirmed" required label="This food was NOT served on guests’ plates and is not partially eaten" />
          <Checkbox name="hygiene_confirmed" required label="Food was prepared and kept hygienically" />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-forest-900">Pickup</h2>
        <Input label="Pickup location" name="pickup_address" required />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="City" name="city" required />
          <Input label="Latitude (optional)" name="lat" type="number" step="any" />
          <Input label="Longitude (optional)" name="lng" type="number" step="any" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Latest collection deadline" name="collection_deadline" type="datetime-local" required defaultValue={soon(2)} />
          <Input label="Contact person" name="contact_name" required />
          <Input label="Contact number" name="contact_phone" type="tel" required />
        </div>
        <Textarea label="Collection instructions" name="instructions" />
      </fieldset>
      <SubmitButton variant="accent" pendingText="Checking safety & alerting coordinators…">
        Request urgent rescue
      </SubmitButton>
    </ActionForm>
  );
}

export function PartnerForm() {
  return (
    <ActionForm action={partnerApplyAction} className="space-y-4" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Business name" name="business_name" required />
        <Select label="Partner type" name="partner_type" options={PARTNER_TYPES.map((p) => ({ value: p, label: p }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Contact person" name="contact_person" required />
        <Input label="Phone" name="phone" type="tel" required />
        <Input label="Email" name="email" type="email" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" name="city" required />
        <Input label="Events per month (approx.)" name="events_per_month" type="number" min="0" />
      </div>
      <Checkbox name="recurring_interest" label="Interested in a recurring collection arrangement" />
      <Textarea label="Message" name="message" />
      <SubmitButton>Register partnership interest</SubmitButton>
      <p className="text-xs text-muted">Submitting this form does not create a partnership. Partnerships require verification and a signed agreement.</p>
    </ActionForm>
  );
}

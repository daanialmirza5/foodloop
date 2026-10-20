"use client";

import { useState } from "react";
import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./forms";
import { createListingAction, updateListingAction } from "@/lib/actions";
import {
  CATEGORY_LABELS, DATED_CATEGORIES, FOOD_CATEGORIES, FOOD_TYPE_LABELS, FOOD_TYPES, PACKAGING_CONDITIONS, PACKAGING_LABELS,
  PERISHABLE_CATEGORIES, SOURCE_LABELS, STORAGE_CONDITIONS, STORAGE_LABELS, UNITS, type FoodCategory, type Source,
} from "@/lib/constants";
import { toLocalInput } from "@/lib/format";

type Defaults = Partial<Record<string, string | number | null>>;

const opts = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((v) => ({ value: v, label: labels[v] }));

export function ListingForm({
  mode,
  source,
  events,
  recipients,
  defaults = {},
  listingId,
}: {
  mode: "create" | "edit";
  source: Source;
  events: { id: string; name: string; event_date: string; venue_address: string; city: string | null; lat: number | null; lng: number | null; food_type: string | null }[];
  recipients: { id: string; name: string; city: string | null }[];
  defaults?: Defaults;
  listingId?: string;
}) {
  const [category, setCategory] = useState<string>(String(defaults.category ?? (source === "event_surplus" ? "event_surplus" : source === "fresh_donation" ? "fresh_meals" : "cooked_meals")));
  const [storage, setStorage] = useState<string>(String(defaults.storage_condition ?? "hot_held"));
  const [eventId, setEventId] = useState<string>(String(defaults.event_id ?? ""));
  const ev = events.find((e) => e.id === eventId);
  const perishable = (PERISHABLE_CATEGORIES as string[]).includes(category);
  const dated = (DATED_CATEGORIES as string[]).includes(category);
  const d = (k: string) => (defaults[k] === null || defaults[k] === undefined ? undefined : String(defaults[k]));
  const dtv = (k: string) => toLocalInput(d(k));
  const now = new Date();
  const later = (h: number) => toLocalInput(new Date(now.getTime() + h * 36e5).toISOString());

  return (
    <ActionForm action={mode === "create" ? createListingAction : updateListingAction} encType="multipart/form-data" className="space-y-6">
      <input type="hidden" name="source" value={source} />
      {listingId && <input type="hidden" name="id" value={listingId} />}
      {mode === "edit" && defaults.event_id && <input type="hidden" name="event_id" value={String(defaults.event_id)} />}

      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">Food details</legend>
        <h2 className="text-base font-semibold text-forest-900">1 · What food are you donating?</h2>
        <p className="-mt-2 text-sm text-muted">Source: {SOURCE_LABELS[source]}</p>
        {source === "event_surplus" && mode === "create" && (
          <Select
            label="Registered event"
            name="event_id"
            required
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Select the event this food came from"
            options={events.map((e) => ({ value: e.id, label: `${e.name} — ${e.event_date}` }))}
            hint={events.length ? "Actual leftover food is recorded separately from the event's estimated surplus." : "You have no open events. Register one first, or use Urgent Rescue."}
          />
        )}
        <Input label="Food title" name="title" required defaultValue={d("title")} placeholder="e.g. Veg biryani and dal" maxLength={120} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} options={opts(FOOD_CATEGORIES, CATEGORY_LABELS as Record<FoodCategory, string>)} />
          <Select label="Food type" name="food_type" required defaultValue={d("food_type") ?? ev?.food_type ?? "veg"} options={opts(FOOD_TYPES, FOOD_TYPE_LABELS)} />
        </div>
        <Textarea label="Description" name="description" defaultValue={d("description")} placeholder="Dishes included, how it was prepared, portion sizes…" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Quantity" name="quantity" type="number" min="0.1" step="0.1" required defaultValue={d("quantity")} />
          <Select label="Unit" name="unit" required defaultValue={d("unit") ?? "kg"} options={UNITS.map((u) => ({ value: u, label: u }))} />
          <Input label="Approx. total weight (kg)" name="quantity_kg" type="number" min="0.1" step="0.1" required defaultValue={d("quantity_kg")} hint="Used for matching & impact" />
        </div>
        <Input label="Known allergens" name="allergens" required defaultValue={d("allergens")} placeholder="e.g. Dairy, nuts, gluten — or “None known”" />
        <Input label="Photo (optional)" name="photo" type="file" accept="image/jpeg,image/png,image/webp" hint="JPG, PNG or WEBP, max 3 MB. Checked on the server." />
      </fieldset>

      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">Safety</legend>
        <h2 className="text-base font-semibold text-forest-900">2 · Preparation, storage & safety</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={perishable ? "Preparation time" : "Preparation / packing time"} name="prepared_at" type="datetime-local" required={perishable} defaultValue={dtv("prepared_at")} hint={perishable ? "Required for cooked / ready-to-eat food" : "Optional"} />
          <Input label="Expiry / use-by" name="expiry_at" type="datetime-local" required={dated} defaultValue={dtv("expiry_at")} hint={dated ? "Required for packaged food & groceries" : "Optional"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Storage conditions" name="storage_condition" required value={storage} onChange={(e) => setStorage(e.target.value)} options={opts(STORAGE_CONDITIONS, STORAGE_LABELS)} />
          <Input
            label="Measured temperature (°C)"
            name="storage_temp_c"
            type="number"
            step="0.5"
            defaultValue={d("storage_temp_c")}
            hint={storage === "hot_held" ? "Hot food should be 60°C or above" : storage === "refrigerated" ? "Chilled food should be 5°C or below" : "Optional"}
          />
        </div>
        <Select label="Packaging condition" name="packaging_condition" required defaultValue={d("packaging_condition") ?? "covered_food_grade"} options={opts(PACKAGING_CONDITIONS, PACKAGING_LABELS)} />
        <Textarea label="Storage history" name="storage_history" defaultValue={d("storage_history")} placeholder="e.g. Kept in chafing dishes until 3 pm, then packed into lidded containers" />
        <Textarea label="Food handling information" name="handling_info" defaultValue={d("handling_info")} placeholder="Gloves used, separate serving spoons, etc." />
        <Textarea label="Any food-safety concerns?" name="safety_concerns" defaultValue={d("safety_concerns")} hint="Anything here will be reviewed by a coordinator before the food is published." />
        <div className="grid gap-3">
          <Checkbox name="not_served_confirmed" required defaultChecked={!!defaults.not_served_confirmed} label="This food was NOT served on guests’ plates and is not partially eaten" hint="Plated or partially consumed food is always rejected." />
          <Checkbox name="hygiene_confirmed" required defaultChecked={!!defaults.hygiene_confirmed} label="The food was prepared, stored and packed hygienically" />
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">Pickup</legend>
        <h2 className="text-base font-semibold text-forest-900">3 · Pickup</h2>
        <Input label="Pickup address" name="pickup_address" required defaultValue={d("pickup_address") ?? ev?.venue_address} hint="Shared only with the accepted recipient and assigned volunteer." key={`addr-${eventId}`} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="City" name="city" required defaultValue={d("city") ?? ev?.city ?? ""} key={`city-${eventId}`} />
          <Input label="Latitude (optional)" name="lat" type="number" step="any" defaultValue={d("lat") ?? ev?.lat ?? ""} key={`lat-${eventId}`} hint="Improves matching" />
          <Input label="Longitude (optional)" name="lng" type="number" step="any" defaultValue={d("lng") ?? ev?.lng ?? ""} key={`lng-${eventId}`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Pickup window starts" name="pickup_window_start" type="datetime-local" required defaultValue={dtv("pickup_window_start") || later(0.25)} />
          <Input label="Pickup window ends" name="pickup_window_end" type="datetime-local" required defaultValue={dtv("pickup_window_end") || later(2.5)} />
          <Input label="Latest collection deadline" name="collection_deadline" type="datetime-local" required defaultValue={dtv("collection_deadline") || later(3)} hint="After this the food is no longer offered" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Contact person at pickup" name="contact_name" required defaultValue={d("contact_name")} />
          <Input label="Contact phone" name="contact_phone" type="tel" required defaultValue={d("contact_phone")} placeholder="+91 98xxx xxxxx" />
        </div>
        <Textarea label="Additional instructions" name="instructions" defaultValue={d("instructions")} placeholder="Entrance, parking, who to ask for…" />
        <Select
          label={source === "fresh_donation" ? "Intended recipient" : "Preferred recipient (optional)"}
          name="intended_recipient_org_id"
          defaultValue={d("intended_recipient_org_id") ?? ""}
          placeholder="Let FoodLoop match a suitable verified organisation"
          options={recipients.map((r) => ({ value: r.id, label: `${r.name}${r.city ? ` — ${r.city}` : ""}` }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_urgent" defaultChecked={!!defaults.is_urgent} className="size-4 accent-forest-700" /> Mark as urgent (food available right now)
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Screening…">Submit for safety review</SubmitButton>
        <SubmitButton variant="secondary" name="save_as_draft" value="on" formNoValidate>
          Save as draft
        </SubmitButton>
        <p className="text-xs text-muted">Submitted food is screened automatically, then reviewed by a coordinator before NGOs can see it.</p>
      </div>
    </ActionForm>
  );
}

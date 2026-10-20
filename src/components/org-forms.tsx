"use client";

import { ActionForm, Checkbox, Input, Select, SubmitButton, Textarea } from "./forms";
import { saveRecipientOrgAction, saveDonorOrgAction, submitVerificationAction, saveVolunteerProfileAction, updateProfileAction } from "@/lib/actions";
import { DONOR_ORG_TYPES, RECIPIENT_ORG_TYPES } from "@/lib/constants";

type D = Partial<Record<string, string | number | null>>;
const s = (d: D, k: string) => (d[k] == null ? undefined : String(d[k]));

export function RecipientOrgForm({ defaults = {} }: { defaults?: D }) {
  return (
    <ActionForm action={saveRecipientOrgAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Organisation name" name="name" required defaultValue={s(defaults, "name")} />
        <Select label="Organisation type" name="org_type" defaultValue={s(defaults, "org_type") ?? "NGO"} options={RECIPIENT_ORG_TYPES.map((t) => ({ value: t, label: t }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Authorised contact person" name="contact_person" required defaultValue={s(defaults, "contact_person")} />
        <Input label="Phone" name="phone" type="tel" required defaultValue={s(defaults, "phone")} />
        <Input label="Email" name="email" type="email" required defaultValue={s(defaults, "email")} />
      </div>
      <Input label="Service address" name="address" required defaultValue={s(defaults, "address")} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="City" name="city" required defaultValue={s(defaults, "city")} />
        <Input label="Service radius (km)" name="service_radius_km" type="number" min="1" max="100" required defaultValue={s(defaults, "service_radius_km") ?? "10"} />
        <Input label="Latitude" name="lat" type="number" step="any" defaultValue={s(defaults, "lat")} hint="Improves matching" />
        <Input label="Longitude" name="lng" type="number" step="any" defaultValue={s(defaults, "lng")} />
      </div>
      <Input label="Service area" name="service_area" defaultValue={s(defaults, "service_area")} placeholder="Neighbourhoods you serve" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Food capacity per day (kg)" name="capacity_kg_per_day" type="number" min="1" required defaultValue={s(defaults, "capacity_kg_per_day")} hint="Requests above remaining capacity are blocked" />
        <Input label="Approx. people served per day" name="beneficiary_capacity" type="number" min="1" defaultValue={s(defaults, "beneficiary_capacity")} hint="A count only — no personal data" />
        <Input label="Operating hours" name="operating_hours" defaultValue={s(defaults, "operating_hours")} placeholder="e.g. 8 am – 9 pm" />
      </div>
      <Select
        label="Food preferences"
        name="food_preference"
        defaultValue={s(defaults, "food_preference") ?? "any"}
        options={[
          { value: "any", label: "Vegetarian and non-vegetarian" },
          { value: "veg_only", label: "Vegetarian only" },
          { value: "non_veg_ok", label: "Non-vegetarian welcome" },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox name="has_cold_storage" defaultChecked={!!defaults.has_cold_storage} label="We have refrigeration / cold storage" />
        <Checkbox name="has_transport" defaultChecked={!!defaults.has_transport} label="We can collect food with our own vehicle" />
      </div>
      <SubmitButton>Save organisation</SubmitButton>
    </ActionForm>
  );
}

export function DonorOrgForm({ defaults = {} }: { defaults?: D }) {
  return (
    <ActionForm action={saveDonorOrgAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Business / organisation name" name="name" required defaultValue={s(defaults, "name")} />
        <Select label="Type" name="org_type" defaultValue={s(defaults, "org_type") ?? "Restaurant"} options={DONOR_ORG_TYPES.map((t) => ({ value: t, label: t }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Contact person" name="contact_person" required defaultValue={s(defaults, "contact_person")} />
        <Input label="Phone" name="phone" type="tel" required defaultValue={s(defaults, "phone")} />
        <Input label="Email" name="email" type="email" required defaultValue={s(defaults, "email")} />
      </div>
      <Input label="Address" name="address" required defaultValue={s(defaults, "address")} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="City" name="city" required defaultValue={s(defaults, "city")} />
        <Input label="Latitude" name="lat" type="number" step="any" defaultValue={s(defaults, "lat")} />
        <Input label="Longitude" name="lng" type="number" step="any" defaultValue={s(defaults, "lng")} />
      </div>
      <SubmitButton>Save business profile</SubmitButton>
    </ActionForm>
  );
}

export function VerificationForm() {
  return (
    <ActionForm action={submitVerificationAction} encType="multipart/form-data" className="space-y-4">
      <Input label="Registration number (Trust / Society / Section 8 / other)" name="registration_number" required />
      <Input label="Supporting document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" hint="PDF, JPG or PNG, max 5 MB. Stored privately — visible only to you and administrators." />
      <Textarea label="Notes for the reviewer" name="notes" />
      <SubmitButton>Submit for verification</SubmitButton>
    </ActionForm>
  );
}

export function VolunteerProfileForm({ defaults = {} }: { defaults?: D }) {
  return (
    <ActionForm action={saveVolunteerProfileAction} className="space-y-4">
      <Input label="Service areas" name="service_areas" required defaultValue={s(defaults, "service_areas")} placeholder="Neighbourhoods you can cover" />
      <Input label="Availability" name="availability" required defaultValue={s(defaults, "availability")} placeholder="e.g. Weekday evenings, Sunday mornings" />
      <Input label="Vehicle" name="vehicle_type" defaultValue={s(defaults, "vehicle_type")} placeholder="e.g. Scooter with insulated box" />
      <Checkbox name="food_safety_trained" defaultChecked={!!defaults.food_safety_trained} label="I have read FoodLoop’s food-safety guidance for volunteers" />
      <SubmitButton>Save profile</SubmitButton>
    </ActionForm>
  );
}

export function ProfileForm({ defaults }: { defaults: D }) {
  return (
    <ActionForm action={updateProfileAction} className="space-y-4">
      <Input label="Name" name="name" required defaultValue={s(defaults, "name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone" name="phone" type="tel" defaultValue={s(defaults, "phone")} />
        <Input label="City" name="city" defaultValue={s(defaults, "city")} />
      </div>
      <SubmitButton>Save profile</SubmitButton>
    </ActionForm>
  );
}

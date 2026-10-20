import { z } from "zod";
import {
  EVENT_TYPES,
  FOOD_CATEGORIES,
  FOOD_TYPES,
  PACKAGING_CONDITIONS,
  PUBLIC_ROLES,
  SOURCES,
  STORAGE_CONDITIONS,
  UNITS,
} from "./constants";
import { invalid } from "./errors";

/** <input type="datetime-local"> values are interpreted as India Standard Time. */
export function istToIso(v: string) {
  if (!v) return v;
  if (/[zZ]|[+-]\d\d:\d\d$/.test(v)) return new Date(v).toISOString();
  const withSeconds = v.length === 16 ? `${v}:00` : v;
  return new Date(`${withSeconds}+05:30`).toISOString();
}

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optStr = (max = 1000) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const reqStr = (label: string, min = 2, max = 200) =>
  z.string({ error: `${label} is required.` }).trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().min(min).max(max).optional());
const reqNum = (label: string, min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number({ error: `${label} is required.` }).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be at most ${max}.`));
const dateTime = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .min(1, `${label} is required.`)
    .refine((v) => !Number.isNaN(new Date(istToIso(v)).getTime()), `${label} is not a valid date/time.`)
    .transform(istToIso);
const optDateTime = (label: string) => z.preprocess(emptyToUndef, dateTime(label).optional());
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,15}$/, "Enter a valid phone number.");
const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);

export const registerSchema = z.object({
  name: reqStr("Name"),
  email,
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  role: z.enum(PUBLIC_ROLES, { error: "Choose how you will use FoodLoop." }),
  phone: z.preprocess(emptyToUndef, phone.optional()),
  city: optStr(80),
  accept_terms: checkbox.refine((v) => v, "You must accept the terms and privacy policy."),
});

export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required.") });

export const listingSchema = z
  .object({
    source: z.enum(SOURCES),
    event_id: optStr(60),
    is_urgent: checkbox,
    title: reqStr("Food title", 3, 120),
    category: z.enum(FOOD_CATEGORIES, { error: "Choose a category." }),
    description: optStr(1500),
    quantity: reqNum("Quantity", 0.1, 100000),
    unit: z.enum(UNITS),
    quantity_kg: reqNum("Approximate weight (kg)", 0.1, 5000),
    prepared_at: optDateTime("Preparation / packing time"),
    expiry_at: optDateTime("Expiry / use-by"),
    storage_condition: z.enum(STORAGE_CONDITIONS, { error: "Choose storage conditions." }),
    storage_temp_c: optNum(-40, 100),
    storage_history: optStr(1000),
    packaging_condition: z.enum(PACKAGING_CONDITIONS, { error: "Choose packaging condition." }),
    allergens: reqStr("Known allergens (or 'None known')", 2, 300),
    food_type: z.enum(FOOD_TYPES),
    handling_info: optStr(1000),
    not_served_confirmed: checkbox,
    hygiene_confirmed: checkbox,
    pickup_address: reqStr("Pickup address", 5, 300),
    city: reqStr("City", 2, 80),
    lat: optNum(-90, 90),
    lng: optNum(-180, 180),
    pickup_window_start: dateTime("Pickup window start"),
    pickup_window_end: dateTime("Pickup window end"),
    collection_deadline: dateTime("Collection deadline"),
    contact_name: reqStr("Contact person"),
    contact_phone: phone,
    instructions: optStr(1000),
    safety_concerns: optStr(1000),
    intended_recipient_org_id: optStr(60),
    save_as_draft: checkbox,
  })
  .superRefine((d, ctx) => {
    if (new Date(d.pickup_window_end) <= new Date(d.pickup_window_start))
      ctx.addIssue({ code: "custom", path: ["pickup_window_end"], message: "Pickup window must end after it starts." });
    if (new Date(d.collection_deadline) < new Date(d.pickup_window_start))
      ctx.addIssue({ code: "custom", path: ["collection_deadline"], message: "Deadline must be after the pickup window starts." });
    if (d.source === "event_surplus" && !d.event_id)
      ctx.addIssue({ code: "custom", path: ["event_id"], message: "Select the registered event this food came from." });
  });
export type ListingInput = z.infer<typeof listingSchema>;

export const eventSchema = z.object({
  name: reqStr("Event name", 3, 150),
  event_type: z.enum(EVENT_TYPES, { error: "Choose the event type." }),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Event date is required."),
  start_time: optStr(5),
  end_time: optStr(5),
  venue_name: reqStr("Venue name"),
  venue_address: reqStr("Venue address", 5, 300),
  city: reqStr("City", 2, 80),
  lat: optNum(-90, 90),
  lng: optNum(-180, 180),
  organizer_name: reqStr("Organiser name"),
  organizer_phone: phone,
  organizer_email: z.preprocess(emptyToUndef, email.optional()),
  caterer: optStr(200),
  expected_guests: optNum(1, 100000),
  estimated_surplus_kg: optNum(0, 10000),
  expected_food_types: optStr(500),
  food_type: z.enum(FOOD_TYPES),
  expected_availability_time: optStr(5),
  packaging_arrangements: optStr(500),
  storage_arrangements: optStr(500),
  collection_window: optStr(200),
  containers_available: checkbox,
  access_instructions: optStr(500),
  preferred_recipient_org_id: optStr(60),
  transport_available: checkbox,
  instructions: optStr(1000),
  consent_contact: checkbox.refine((v) => v, "Consent to be contacted about collection is required."),
});
export type EventInput = z.infer<typeof eventSchema>;

export const urgentRescueSchema = z.object({
  event_id: optStr(60),
  event_name: reqStr("Event / occasion name", 3, 150),
  title: reqStr("Food details", 3, 120),
  description: optStr(1500),
  food_type: z.enum(FOOD_TYPES),
  quantity_kg: reqNum("Quantity (kg)", 0.5, 5000),
  prepared_at: dateTime("Preparation time"),
  storage_condition: z.enum(STORAGE_CONDITIONS),
  storage_temp_c: optNum(-40, 100),
  packaging_condition: z.enum(PACKAGING_CONDITIONS),
  allergens: reqStr("Known allergens (or 'None known')", 2, 300),
  pickup_address: reqStr("Pickup location", 5, 300),
  city: reqStr("City", 2, 80),
  lat: optNum(-90, 90),
  lng: optNum(-180, 180),
  collection_deadline: dateTime("Collection deadline"),
  contact_name: reqStr("Contact person"),
  contact_phone: phone,
  instructions: optStr(1000),
  safety_concerns: optStr(1000),
  not_served_confirmed: checkbox,
  hygiene_confirmed: checkbox,
});

export const orgSchema = z.object({
  name: reqStr("Organisation name", 2, 150),
  org_type: reqStr("Organisation type", 2, 80),
  contact_person: reqStr("Authorised contact person"),
  phone,
  email,
  address: reqStr("Service address", 5, 300),
  city: reqStr("City", 2, 80),
  service_area: optStr(300),
  service_radius_km: reqNum("Service radius", 1, 100),
  lat: optNum(-90, 90),
  lng: optNum(-180, 180),
  capacity_kg_per_day: reqNum("Daily food capacity (kg)", 1, 20000),
  beneficiary_capacity: optNum(1, 1000000),
  operating_hours: optStr(120),
  food_preference: z.enum(["any", "veg_only", "non_veg_ok"]),
  has_cold_storage: checkbox,
  has_transport: checkbox,
});

export const donorOrgSchema = z.object({
  name: reqStr("Business / organisation name", 2, 150),
  org_type: reqStr("Type", 2, 80),
  contact_person: reqStr("Contact person"),
  phone,
  email,
  address: reqStr("Address", 5, 300),
  city: reqStr("City", 2, 80),
  lat: optNum(-90, 90),
  lng: optNum(-180, 180),
});

export const requestSchema = z.object({
  listing_id: reqStr("Listing", 3, 60),
  transport_mode: z.enum(["volunteer", "recipient", "donor"]),
  message: optStr(500),
});

export const needSchema = z.object({
  title: reqStr("Requirement title", 3, 120),
  category: z.enum(FOOD_CATEGORIES),
  quantity_kg: reqNum("Quantity (kg)", 1, 10000),
  needed_by: optDateTime("Needed by"),
  food_type: z.enum(["any", "veg", "non_veg", "mixed"]),
  notes: optStr(500),
});

export const moneySchema = z.object({
  amount_inr: reqNum("Amount", 10, 500000),
  program_id: optStr(60),
  frequency: z.enum(["one_time", "monthly"]),
  donor_name: reqStr("Name"),
  donor_email: email,
  donor_phone: z.preprocess(emptyToUndef, phone.optional()),
  acknowledge_publicly: checkbox,
});

export const incidentSchema = z.object({
  listing_id: optStr(60),
  collection_id: optStr(60),
  event_id: optStr(60),
  kind: z.enum(["food_safety", "missed_pickup", "delay", "delivery_problem", "complaint", "other"]),
  severity: z.enum(["low", "medium", "high"]),
  description: reqStr("Description", 10, 2000),
});

export const partnerSchema = z.object({
  business_name: reqStr("Business name", 2, 150),
  partner_type: reqStr("Partner type", 2, 80),
  contact_person: reqStr("Contact person"),
  phone,
  email,
  city: reqStr("City", 2, 80),
  events_per_month: optNum(0, 1000),
  recurring_interest: checkbox,
  message: optStr(1000),
});

export const volunteerProfileSchema = z.object({
  service_areas: reqStr("Service areas", 2, 300),
  availability: reqStr("Availability", 2, 300),
  vehicle_type: optStr(80),
  food_safety_trained: checkbox,
});

/** Parse FormData against a schema, throwing an AppError with per-field messages. */
export function parseForm<T extends z.ZodType>(schema: T, form: FormData | Record<string, unknown>): z.infer<T> {
  const obj: Record<string, unknown> = {};
  if (form instanceof FormData) {
    for (const [k, v] of form.entries()) if (typeof v === "string") obj[k] = v;
  } else Object.assign(obj, form);
  const res = schema.safeParse(obj);
  if (!res.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    throw invalid("Please correct the highlighted fields.", fieldErrors);
  }
  return res.data;
}

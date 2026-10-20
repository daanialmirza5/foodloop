/**
 * Demonstration data. EVERY record created here is fictional and flagged is_demo = 1,
 * so it is visibly labelled "DEMO" in the UI and excluded from "real records only" impact.
 * Open listings are created relative to "now", so reset the demo shortly before presenting.
 */
import { getDb, insert, run, setSetting } from "./db";
import { registerUser, type UserRow } from "./auth";
import { newId, nowIso } from "./utils";
import { createListing, reviewListing } from "./services/listings";
import { claimCollection, createRequest, decideRequest } from "./services/logistics";
import { confirmEvent, createEvent, createPartnerApplication } from "./services/events";
import { submitVerification } from "./services/organizations";
import { createDonation, completeSimulated, recordDisbursement, refundDonation } from "./services/payments";
import { reportIncident } from "./services/incidents";
import { DEFAULT_SAFETY_RULES } from "./safety";
import type { ListingInput } from "./validation";

export const DEMO_PASSWORD = "Demo@1234";

export const DEMO_ACCOUNTS = [
  { email: "admin@foodloop.demo", role: "admin", name: "Asha Rao (Coordinator)", label: "Administrator / Coordinator" },
  { email: "restaurant@foodloop.demo", role: "donor", name: "Vikram Shetty", label: "Donor — Spice Route Kitchen (restaurant)" },
  { email: "wedding@foodloop.demo", role: "donor", name: "Meera Iyer", label: "Donor — wedding organiser" },
  { email: "bakery@foodloop.demo", role: "donor", name: "Farah Khan", label: "Donor — Golden Crust Bakery" },
  { email: "ngo@foodloop.demo", role: "ngo", name: "Ravi Kumar", label: "NGO — Annapurna Community Kitchen (verified)" },
  { email: "shelter@foodloop.demo", role: "ngo", name: "Sister Grace", label: "NGO — Hope Shelter Trust (verified, veg only)" },
  { email: "newngo@foodloop.demo", role: "ngo", name: "Daniel Thomas", label: "NGO — New Dawn Children's Home (pending verification)" },
  { email: "volunteer@foodloop.demo", role: "volunteer", name: "Arjun Nair", label: "Volunteer" },
  { email: "volunteer2@foodloop.demo", role: "volunteer", name: "Sana Mirza", label: "Volunteer" },
  { email: "supporter@foodloop.demo", role: "supporter", name: "Kavya Reddy", label: "Individual supporter" },
] as const;

const TABLES = [
  "payment_transactions", "refunds", "disbursements", "monetary_donations", "meal_programs",
  "delivery_confirmations", "collections", "donation_requests", "safety_screenings", "incidents",
  "food_needs", "food_listings", "partner_applications", "events", "verification_requests",
  "volunteer_profiles", "organizations", "notifications", "status_history", "audit_logs",
  "password_resets", "sessions", "users", "settings",
];

export function wipeAll() {
  const db = getDb();
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    for (const t of TABLES) db.exec(`DELETE FROM ${t}`);
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

const h = (hours: number) => new Date(Date.now() + hours * 36e5).toISOString();
const daysAgo = (d: number, hour = 14) => {
  const t = new Date(Date.now() - d * 864e5);
  t.setUTCHours(hour - 5, 30, 0, 0);
  return t.toISOString();
};

function org(owner: UserRow, o: Record<string, unknown>) {
  const id = newId("org");
  insert("organizations", { id, owner_user_id: owner.id, is_demo: 1, created_at: daysAgo(150), updated_at: nowIso(), ...o });
  return id;
}

function baseListing(over: Partial<ListingInput>): ListingInput {
  return {
    source: "everyday_surplus",
    is_urgent: false,
    title: "Demo listing",
    category: "cooked_meals",
    quantity: 10,
    unit: "kg",
    quantity_kg: 10,
    storage_condition: "hot_held",
    storage_temp_c: 65,
    packaging_condition: "covered_food_grade",
    allergens: "None known",
    food_type: "veg",
    not_served_confirmed: true,
    hygiene_confirmed: true,
    pickup_address: "Demo address",
    city: "Bengaluru",
    pickup_window_start: h(0.25),
    pickup_window_end: h(3),
    collection_deadline: h(4.5),
    contact_name: "Demo contact",
    contact_phone: "+91 90000 00000",
    prepared_at: h(-0.75),
    save_as_draft: false,
    ...over,
  } as ListingInput;
}

/** A completed, historical rescue written directly (past timestamps are otherwise rejected by the live workflow). */
function historical(p: {
  donor: UserRow; donorOrg?: string; eventId?: string; source: string; title: string; category: string; kg: number; deliveredKg: number;
  recipientOrg: string; recipientUser: UserRow; volunteer: UserRow; admin: UserRow; day: number; foodType?: string; address: string; lat: number; lng: number;
}) {
  const id = newId("lst");
  const created = daysAgo(p.day, 13);
  const code = `FL-${new Date(created).getFullYear()}-H${String(Math.floor(Math.random() * 9000) + 1000)}`;
  insert("food_listings", {
    id, code, donor_user_id: p.donor.id, donor_org_id: p.donorOrg ?? null, event_id: p.eventId ?? null, source: p.source, is_urgent: 0,
    title: p.title, category: p.category, description: "Historical demo record.", quantity: p.kg, unit: "kg", quantity_kg: p.kg,
    prepared_at: daysAgo(p.day, 12), storage_condition: "hot_held", storage_temp_c: 66, packaging_condition: "covered_food_grade",
    allergens: "Dairy", food_type: p.foodType ?? "veg", not_served_confirmed: 1, hygiene_confirmed: 1, pickup_address: p.address, city: "Bengaluru",
    lat: p.lat, lng: p.lng, pickup_window_start: daysAgo(p.day, 14), pickup_window_end: daysAgo(p.day, 16), collection_deadline: daysAgo(p.day, 17),
    contact_name: p.donor.name, contact_phone: "+91 90000 11111", status: "delivered", status_reason: "Recipient confirmed receipt",
    approved_at: daysAgo(p.day, 13), approved_kg: p.kg, is_demo: 1, created_at: created, updated_at: daysAgo(p.day, 16),
  });
  const checks = JSON.stringify([{ key: "time", label: "Time since preparation", result: "pass", detail: "Within limit" }]);
  insert("safety_screenings", { id: newId("scr"), listing_id: id, stage: "automated", result: "pass", checks_json: checks, screened_by: null, created_at: created });
  insert("safety_screenings", { id: newId("scr"), listing_id: id, stage: "manual", result: "pass", checks_json: "[]", notes: "Manual checklist confirmed", screened_by: p.admin.id, created_at: daysAgo(p.day, 13) });
  const reqId = newId("req");
  insert("donation_requests", { id: reqId, listing_id: id, recipient_org_id: p.recipientOrg, requested_by: p.recipientUser.id, quantity_kg: p.kg, transport_mode: "volunteer", status: "completed", decided_by: p.donor.id, decided_at: daysAgo(p.day, 13), created_at: daysAgo(p.day, 13), updated_at: daysAgo(p.day, 16) });
  const colId = newId("col");
  insert("collections", { id: colId, listing_id: id, request_id: reqId, transport_mode: "volunteer", volunteer_user_id: p.volunteer.id, status: "completed", scheduled_pickup_at: daysAgo(p.day, 14), picked_up_at: daysAgo(p.day, 14), delivered_at: daysAgo(p.day, 15), qty_collected_kg: p.kg, qty_delivered_kg: p.deliveredKg, volunteer_minutes: 75, created_by: p.donor.id, created_at: daysAgo(p.day, 13), updated_at: daysAgo(p.day, 15) });
  insert("delivery_confirmations", { id: newId("dlv"), listing_id: id, collection_id: colId, recipient_org_id: p.recipientOrg, confirmed_by: p.recipientUser.id, qty_received_kg: p.deliveredKg, condition_ok: 1, confirmed_at: daysAgo(p.day, 16) });
  const steps = ["pending_review", "available", "request_received", "accepted", "pickup_scheduled", "collected", "delivered"];
  steps.forEach((s, i) => insert("status_history", { id: newId("hst"), entity_type: "listing", entity_id: id, from_status: i ? steps[i - 1] : "draft", to_status: s, actor_user_id: null, note: "Historical demo record", created_at: daysAgo(p.day, 13 + i * 0.4) }));
  return id;
}

export async function seedDemo() {
  wipeAll();
  setSetting("safety_rules", JSON.stringify(DEFAULT_SAFETY_RULES));
  setSetting("kg_per_meal", "0.4");

  const users: Record<string, UserRow> = {};
  for (const a of DEMO_ACCOUNTS) {
    users[a.email.split("@")[0]] = registerUser({ email: a.email, password: DEMO_PASSWORD, name: a.name, role: a.role, phone: "+91 90000 00000", city: "Bengaluru" }, { allowAdmin: a.role === "admin", isDemo: true });
  }
  const { admin, restaurant, wedding, bakery, ngo, shelter, newngo, volunteer, volunteer2, supporter } = users;
  const A = { ...admin, status: "active" as const };

  run("UPDATE volunteer_profiles SET service_areas = 'Indiranagar, Koramangala, Shivajinagar', availability = 'Weekday evenings, weekends', vehicle_type = 'Scooter with insulated box', food_safety_trained = 1 WHERE user_id = ?", volunteer.id);
  run("UPDATE volunteer_profiles SET service_areas = 'Jayanagar, BTM Layout', availability = 'Weekends', vehicle_type = 'Car', food_safety_trained = 1 WHERE user_id = ?", volunteer2.id);

  // ---------- organisations (fictional) ----------
  const spice = org(restaurant, { kind: "donor", name: "Spice Route Kitchen", org_type: "Restaurant", contact_person: "Vikram Shetty", phone: "+91 90000 10001", email: "restaurant@foodloop.demo", address: "12, 100 Feet Road, Indiranagar", city: "Bengaluru", lat: 12.9719, lng: 77.6412, verification_status: "verified" });
  const crust = org(bakery, { kind: "donor", name: "Golden Crust Bakery", org_type: "Bakery", contact_person: "Farah Khan", phone: "+91 90000 10002", email: "bakery@foodloop.demo", address: "5th Block, Koramangala", city: "Bengaluru", lat: 12.9352, lng: 77.6245, verification_status: "verified" });
  const annapurna = org(ngo, { kind: "recipient", name: "Annapurna Community Kitchen", org_type: "Community Kitchen", contact_person: "Ravi Kumar", phone: "+91 90000 20001", email: "ngo@foodloop.demo", address: "Broadway Road, Shivajinagar", city: "Bengaluru", service_area: "Central & East Bengaluru", service_radius_km: 15, lat: 12.9857, lng: 77.6057, capacity_kg_per_day: 300, beneficiary_capacity: 600, operating_hours: "7 am – 10 pm", food_preference: "any", has_cold_storage: 1, has_transport: 1, verification_status: "verified", verification_note: "Demo: registration documents reviewed" });
  const hope = org(shelter, { kind: "recipient", name: "Hope Shelter Trust", org_type: "Shelter", contact_person: "Sister Grace", phone: "+91 90000 20002", email: "shelter@foodloop.demo", address: "2nd Stage, BTM Layout", city: "Bengaluru", service_area: "South Bengaluru", service_radius_km: 8, lat: 12.9166, lng: 77.6101, capacity_kg_per_day: 60, beneficiary_capacity: 120, operating_hours: "8 am – 8 pm", food_preference: "veg_only", has_cold_storage: 0, has_transport: 0, verification_status: "verified", verification_note: "Demo: registration documents reviewed" });
  org(newngo, { kind: "recipient", name: "New Dawn Children's Home", org_type: "Orphanage / Children's Home", contact_person: "Daniel Thomas", phone: "+91 90000 20003", email: "newngo@foodloop.demo", address: "ITPL Main Road, Whitefield", city: "Bengaluru", service_area: "Whitefield", service_radius_km: 10, lat: 12.9698, lng: 77.75, capacity_kg_per_day: 80, beneficiary_capacity: 70, operating_hours: "9 am – 7 pm", food_preference: "any", has_cold_storage: 1, has_transport: 0, verification_status: "pending" });
  submitVerification({ ...newngo, status: "active" }, { registration_number: "DEMO-TRUST-2026-118", notes: "Demo: trust registration certificate and address proof (fictional)." });

  // ---------- historical completed rescues (for charts) ----------
  const past = [
    { donor: restaurant, donorOrg: spice, source: "everyday_surplus", title: "Veg pulao & raita", category: "cooked_meals", kg: 18, deliveredKg: 18, day: 128, address: "Indiranagar", lat: 12.9719, lng: 77.6412 },
    { donor: bakery, donorOrg: crust, source: "fresh_donation", title: "Whole-wheat bread loaves", category: "bakery", kg: 12, deliveredKg: 12, day: 110, address: "Koramangala", lat: 12.9352, lng: 77.6245 },
    { donor: restaurant, donorOrg: spice, source: "everyday_surplus", title: "Chapati & mixed veg curry", category: "cooked_meals", kg: 22, deliveredKg: 21, day: 92, address: "Indiranagar", lat: 12.9719, lng: 77.6412 },
    { donor: bakery, donorOrg: crust, source: "fresh_donation", title: "Freshly prepared lunch boxes", category: "fresh_meals", kg: 15, deliveredKg: 15, day: 64, address: "Koramangala", lat: 12.9352, lng: 77.6245 },
    { donor: restaurant, donorOrg: spice, source: "everyday_surplus", title: "Lemon rice & sambar", category: "cooked_meals", kg: 20, deliveredKg: 19.5, day: 33, address: "Indiranagar", lat: 12.9719, lng: 77.6412 },
    { donor: restaurant, donorOrg: spice, source: "everyday_surplus", title: "Dal khichdi", category: "cooked_meals", kg: 16, deliveredKg: 16, day: 9, address: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  ];
  for (const p of past) historical({ ...p, recipientOrg: annapurna, recipientUser: ngo, volunteer, admin });

  // past events with completed collections
  const pastEvents = [
    { name: "Rao–Kulkarni Wedding Reception", type: "reception", day: 75, kg: 85, delivered: 82 },
    { name: "Sunrise College Annual Fest", type: "college_fest", day: 47, kg: 40, delivered: 40 },
    { name: "Ganesh Utsav Community Lunch", type: "religious", day: 20, kg: 60, delivered: 58 },
  ];
  for (const e of pastEvents) {
    const evId = newId("evt");
    insert("events", {
      id: evId, organizer_user_id: wedding.id, name: e.name, event_type: e.type, event_date: daysAgo(e.day).slice(0, 10), start_time: "12:00", end_time: "16:00",
      venue_name: "Lakshmi Convention Hall", venue_address: "9th Main, Jayanagar 4th Block", city: "Bengaluru", lat: 12.925, lng: 77.5938,
      organizer_name: "Meera Iyer", organizer_phone: "+91 90000 30001", organizer_email: "wedding@foodloop.demo", caterer: "Demo Caterers",
      expected_guests: 600, estimated_surplus_kg: e.kg + 20, expected_food_types: "Rice, curries, sweets", food_type: "veg", containers_available: 1,
      transport_available: 0, consent_contact: 1, status: "completed", is_demo: 1, created_at: daysAgo(e.day + 14), updated_at: daysAgo(e.day),
    });
    historical({ donor: wedding, eventId: evId, source: "event_surplus", title: `Leftover buffet — ${e.name}`, category: "event_surplus", kg: e.kg, deliveredKg: e.delivered, recipientOrg: annapurna, recipientUser: ngo, volunteer: volunteer2, admin, day: e.day, address: "Jayanagar 4th Block", lat: 12.925, lng: 77.5938 });
  }

  // ---------- Scenario B: wedding registered and confirmed; today is the day ----------
  const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
  const weddingEvent = createEvent({ ...wedding, status: "active" }, {
    name: "Iyer–Menon Wedding Reception", event_type: "reception", event_date: today, start_time: "11:00", end_time: "15:00",
    venue_name: "Lakshmi Convention Hall", venue_address: "9th Main, Jayanagar 4th Block", city: "Bengaluru", lat: 12.925, lng: 77.5938,
    organizer_name: "Meera Iyer", organizer_phone: "+91 90000 30001", organizer_email: "wedding@foodloop.demo", caterer: "Sri Annapoorna Caterers (demo)",
    expected_guests: 800, estimated_surplus_kg: 90, expected_food_types: "Veg biryani, paneer curry, rotis, sweets", food_type: "veg",
    expected_availability_time: "15:30", packaging_arrangements: "Caterer provides food-grade lidded containers", storage_arrangements: "Chafing dishes keep food hot until packing",
    collection_window: "15:30 – 18:00", containers_available: true, access_instructions: "Service entrance on 10th Main; loading bay parking", transport_available: false,
    instructions: "Ask for the catering supervisor.", consent_contact: true,
  }, true);
  confirmEvent(A, weddingEvent.id, "Coordinator call completed: caterer will hot-hold food; volunteer pool on standby.");

  // An upcoming event that is only registered (not food!)
  const upcoming = new Date(Date.now() + 9 * 864e5 + 5.5 * 36e5).toISOString().slice(0, 10);
  createEvent({ ...wedding, status: "active" }, {
    name: "Sharma–Verma Wedding", event_type: "wedding", event_date: upcoming, start_time: "19:00", end_time: "23:30",
    venue_name: "Royal Orchid Banquets", venue_address: "Outer Ring Road, Marathahalli", city: "Bengaluru", lat: 12.9569, lng: 77.7011,
    organizer_name: "Meera Iyer", organizer_phone: "+91 90000 30001", caterer: "Demo Caterers", expected_guests: 1200, estimated_surplus_kg: 150,
    expected_food_types: "Mixed buffet", food_type: "mixed", containers_available: false, transport_available: true, consent_contact: true,
  } as never, true);

  // ---------- Scenario A: restaurant surplus available now ----------
  const a = createListing({ ...restaurant, status: "active" }, baseListing({
    title: "Veg biryani & dal tadka", description: "Prepared for lunch service; surplus kept hot in bain-marie.", quantity: 25, unit: "kg", quantity_kg: 25,
    allergens: "Dairy (ghee)", pickup_address: "12, 100 Feet Road, Indiranagar", lat: 12.9719, lng: 77.6412, contact_name: "Vikram Shetty", contact_phone: "+91 90000 10001",
    instructions: "Collect from the kitchen back door.", collection_deadline: h(5), pickup_window_end: h(4),
  }));
  reviewListing(A, a.listing.id, "approve", "Temperature log checked (66°C). Containers lidded.", true);

  // ---------- Scenario C: planned fresh donation with a pending request ----------
  const c = createListing({ ...bakery, status: "active" }, baseListing({
    source: "fresh_donation", title: "Freshly baked bread & buns", category: "bakery", description: "Baked this morning for donation.", quantity: 60, unit: "items", quantity_kg: 14,
    storage_condition: "ambient_covered", storage_temp_c: undefined, packaging_condition: "sealed_intact", allergens: "Gluten, may contain sesame", food_type: "veg",
    pickup_address: "5th Block, Koramangala", lat: 12.9352, lng: 77.6245, contact_name: "Farah Khan", contact_phone: "+91 90000 10002",
    pickup_window_end: h(20), collection_deadline: h(22), prepared_at: h(-3),
  }));
  reviewListing(A, c.listing.id, "approve", "Sealed packs, baked today.", true);
  createRequest({ ...shelter, status: "active" }, { listing_id: c.listing.id, transport_mode: "volunteer", message: "We can use these for breakfast tomorrow for ~100 residents." });

  // ---------- Corporate event surplus already accepted: open volunteer task ----------
  const corpEvent = createEvent({ ...restaurant, status: "active" }, {
    name: "TechBridge Summit Lunch", event_type: "conference", event_date: today, venue_name: "Indiranagar Club Hall", venue_address: "Indiranagar Double Road", city: "Bengaluru",
    lat: 12.9784, lng: 77.6408, organizer_name: "Vikram Shetty", organizer_phone: "+91 90000 10001", food_type: "mixed", containers_available: true, transport_available: false, consent_contact: true,
  } as never, true);
  confirmEvent(A, corpEvent.id, "Confirmed by phone.");
  const corp = createListing({ ...restaurant, status: "active" }, baseListing({
    source: "event_surplus", event_id: corpEvent.id, is_urgent: true, title: "Conference lunch surplus — rice, curry & salad", category: "event_surplus", quantity: 40, unit: "portions", quantity_kg: 16,
    food_type: "mixed", allergens: "Dairy, nuts (in curry)", storage_condition: "hot_held", storage_temp_c: 63, pickup_address: "Indiranagar Club Hall, Double Road", lat: 12.9784, lng: 77.6408,
    contact_name: "Event desk", contact_phone: "+91 90000 10009", collection_deadline: h(4), pickup_window_end: h(3.5),
  }));
  reviewListing(A, corp.listing.id, "approve", "Urgent: confirmed hot-holding at 63°C.", true);
  const corpReq = createRequest({ ...ngo, status: "active" }, { listing_id: corp.listing.id, transport_mode: "volunteer", message: "Can serve at our evening meal." });
  decideRequest({ ...restaurant, status: "active" }, corpReq, "accept");

  // ---------- a listing in progress (assigned volunteer) ----------
  const inprog = createListing({ ...restaurant, status: "active" }, baseListing({
    title: "Paneer butter masala & rotis", category: "cooked_meals", quantity: 30, unit: "portions", quantity_kg: 12, storage_condition: "refrigerated", storage_temp_c: 4,
    allergens: "Dairy, gluten", pickup_address: "12, 100 Feet Road, Indiranagar", lat: 12.9719, lng: 77.6412, contact_name: "Vikram Shetty", contact_phone: "+91 90000 10001",
    prepared_at: h(-2), pickup_window_end: h(8), collection_deadline: h(10),
  }));
  reviewListing(A, inprog.listing.id, "approve", "Chilled at 4°C; logged.", true);
  const r2 = createRequest({ ...ngo, status: "active" }, { listing_id: inprog.listing.id, transport_mode: "volunteer" });
  const col2 = decideRequest({ ...restaurant, status: "active" }, r2, "accept");
  if (col2) claimCollection({ ...volunteer2, status: "active" }, col2, h(1));

  // ---------- moderation queue & a rejected listing ----------
  createListing({ ...bakery, status: "active" }, baseListing({
    title: "Packaged biscuits & juice boxes", category: "packaged_food", quantity: 40, unit: "packets", quantity_kg: 9, storage_condition: "ambient_covered", storage_temp_c: undefined,
    packaging_condition: "sealed_intact", allergens: "Gluten, milk", expiry_at: h(24 * 60), pickup_address: "5th Block, Koramangala", lat: 12.9352, lng: 77.6245,
    contact_name: "Farah Khan", contact_phone: "+91 90000 10002", pickup_window_end: h(30), collection_deadline: h(48), prepared_at: undefined,
    safety_concerns: "Two juice boxes slightly dented — please check.",
  }));
  createListing({ ...wedding, status: "active" }, baseListing({
    title: "Leftover curries from a lunch party", category: "cooked_meals", quantity: 8, unit: "kg", quantity_kg: 8, storage_condition: "ambient_covered", storage_temp_c: undefined,
    allergens: "Unknown", pickup_address: "Jayanagar", lat: 12.925, lng: 77.5938, contact_name: "Meera Iyer", contact_phone: "+91 90000 30001", prepared_at: h(-5),
  }));

  // ---------- NGO standing need ----------
  insert("food_needs", { id: newId("ned"), org_id: hope, created_by: shelter.id, title: "Dry rations for weekly distribution", category: "groceries", quantity_kg: 50, needed_by: h(24 * 6), food_type: "veg", notes: "Rice, dal, oil preferred.", status: "open", is_demo: 1, created_at: nowIso() });

  // ---------- meal programmes (illustrative costs, NOT verified) ----------
  const progs = [
    { org: annapurna, title: "Daily Hot Meals Programme", summary: "Freshly cooked lunches served at Annapurna's community kitchen.", purpose: "Ingredients, cooking fuel and kitchen staff for daily lunches.", cost: 4000, goal: 15000000, image: "/images/indian.jpg" },
    { org: hope, title: "Shelter Breakfast Fund", summary: "Nutritious breakfasts for residents of Hope Shelter.", purpose: "Milk, bread, fruit and eggs for the shelter breakfast.", cost: 3000, goal: 6000000, image: "/images/bread.jpg" },
    { org: annapurna, title: "Event Rescue Logistics", summary: "Insulated boxes and fuel so volunteers can collect wedding and event surplus quickly.", purpose: "Transport fuel, insulated containers, food-grade packaging.", cost: null, goal: 5000000, image: "/images/volunteers.jpg" },
  ];
  const progIds: string[] = [];
  for (const p of progs) {
    const id = newId("prg");
    progIds.push(id);
    insert("meal_programs", { id, org_id: p.org, title: p.title, summary: p.summary, purpose: p.purpose, est_cost_per_meal_paise: p.cost, cost_basis_verified: 0, cost_basis_note: p.cost ? "Illustrative estimate supplied by the organisation; not independently verified." : null, goal_paise: p.goal, image: p.image, is_active: 1, is_demo: 1, created_at: daysAgo(160) });
  }

  // ---------- Scenario D: simulated contributions ----------
  if (!process.env.RAZORPAY_KEY_ID) {
    const sup = { ...supporter, status: "active" as const };
    for (const [amt, prog, outcome] of [[1000, 0, "success"], [2500, 1, "success"], [500, 0, "failure"], [5000, 2, "success"], [750, 1, "success"]] as const) {
      const { donation, token } = await createDonation(sup, { amount_inr: amt, program_id: progIds[prog], frequency: "one_time", donor_name: supporter.name, donor_email: supporter.email, acknowledge_publicly: false });
      completeSimulated(sup, donation.id, token, outcome);
    }
    const { donation: refundMe, token } = await createDonation(sup, { amount_inr: 300, program_id: progIds[0], frequency: "one_time", donor_name: supporter.name, donor_email: supporter.email, acknowledge_publicly: false });
    completeSimulated(sup, refundMe.id, token, "success");
    await refundDonation(A, refundMe.id, "Demo: donor requested a refund (duplicate payment).");
    recordDisbursement(A, progIds[0], 800, "Demo: transferred to Annapurna for one week of rice & dal (ref DEMO-DSB-001).");
  }

  // ---------- Scenario E: an incident to review ----------
  reportIncident({ ...shelter, status: "active" }, { listing_id: c.listing.id, kind: "food_safety", severity: "medium", description: "Demo: a few buns in one tray looked squashed — please ask the bakery to check packaging." });

  // ---------- partnership interest (never shown publicly unless an agreement is signed) ----------
  createPartnerApplication(null, { business_name: "Royal Orchid Banquets (demo)", partner_type: "Banquet Hall", contact_person: "Manager", phone: "+91 90000 40001", email: "banquet@example.com", city: "Bengaluru", events_per_month: 12, recurring_interest: true, message: "Interested in recurring collections after weekend weddings." });
  run("UPDATE partner_applications SET is_demo = 1");

  // demo data marker for every row created by services
  for (const t of ["events", "food_listings", "incidents", "monetary_donations", "disbursements"]) run(`UPDATE ${t} SET is_demo = 1`);
  return { users: DEMO_ACCOUNTS.length };
}

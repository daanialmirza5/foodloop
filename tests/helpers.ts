import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetDbConnection, get } from "@/lib/db";
import { seedDemo } from "@/lib/seed";
import { resetRateLimits } from "@/lib/rate-limit";
import type { Actor } from "@/lib/permissions";
import type { ListingInput } from "@/lib/validation";

export async function freshDb() {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "foodloop-test-")), "test.db");
  resetDbConnection(file);
  resetRateLimits();
  await seedDemo();
}

export function actor(email: string): Actor {
  const u = get<Actor>("SELECT id, role, name, email, status, is_demo FROM users WHERE email = ?", email);
  if (!u) throw new Error(`no user ${email}`);
  return u;
}

export const hours = (n: number) => new Date(Date.now() + n * 36e5).toISOString();

export function listingInput(over: Partial<ListingInput> = {}): ListingInput {
  return {
    source: "everyday_surplus",
    is_urgent: false,
    title: "Test meals",
    category: "cooked_meals",
    quantity: 20,
    unit: "kg",
    quantity_kg: 20,
    prepared_at: hours(-0.5),
    storage_condition: "hot_held",
    storage_temp_c: 65,
    packaging_condition: "covered_food_grade",
    allergens: "None known",
    food_type: "veg",
    not_served_confirmed: true,
    hygiene_confirmed: true,
    pickup_address: "12, 100 Feet Road, Indiranagar",
    city: "Bengaluru",
    lat: 12.9719,
    lng: 77.6412,
    pickup_window_start: hours(0.2),
    pickup_window_end: hours(3),
    collection_deadline: hours(4),
    contact_name: "Tester",
    contact_phone: "+91 90000 00000",
    save_as_draft: false,
    ...over,
  } as ListingInput;
}

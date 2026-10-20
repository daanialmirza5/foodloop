import { DATED_CATEGORIES, PERISHABLE_CATEGORIES, type FoodCategory } from "./constants";

/**
 * FoodLoop automated pre-screening.
 *
 * Thresholds are FoodLoop operating rules based on widely published food-safety
 * principles (keep hot food at or above 60°C, keep cold food at or below 5°C,
 * do not keep cooked food at room temperature for more than about 2 hours — see
 * the WHO "Five Keys to Safer Food" and FSSAI consumer/handler guidance). They
 * are NOT a statement of Indian law and are configurable by administrators.
 *
 * A "pass" never makes food available on its own: a trained coordinator must
 * still complete a manual review before a listing is published.
 */
export type SafetyRules = {
  ambientMaxHours: number;
  hotHeldMinTempC: number;
  hotHeldMaxHours: number;
  coldMaxTempC: number;
  refrigeratedMaxHours: number;
};

export const DEFAULT_SAFETY_RULES: SafetyRules = {
  ambientMaxHours: 2,
  hotHeldMinTempC: 60,
  hotHeldMaxHours: 6,
  coldMaxTempC: 5,
  refrigeratedMaxHours: 24,
};

export type CheckResult = "pass" | "review" | "fail";
export type SafetyCheck = { key: string; label: string; result: CheckResult; detail: string };
export type ScreeningOutcome = { result: "pass" | "needs_review" | "fail"; checks: SafetyCheck[]; failures: string[] };

export type SafetyInput = {
  category: FoodCategory | string;
  storage_condition: string;
  storage_temp_c?: number | null;
  packaging_condition: string;
  prepared_at?: string | null;
  expiry_at?: string | null;
  collection_deadline: string;
  pickup_window_start: string;
  pickup_window_end: string;
  allergens: string;
  not_served_confirmed: boolean | number;
  hygiene_confirmed: boolean | number;
  safety_concerns?: string | null;
};

export function screenFood(input: SafetyInput, rules: SafetyRules = DEFAULT_SAFETY_RULES, now = new Date()): ScreeningOutcome {
  const checks: SafetyCheck[] = [];
  const add = (key: string, label: string, result: CheckResult, detail: string) => checks.push({ key, label, result, detail });
  const perishable = (PERISHABLE_CATEGORIES as string[]).includes(input.category);
  const dated = (DATED_CATEGORIES as string[]).includes(input.category);
  const deadline = new Date(input.collection_deadline);
  const winStart = new Date(input.pickup_window_start);
  const winEnd = new Date(input.pickup_window_end);

  // 1. Deadline and pickup window
  if (Number.isNaN(deadline.getTime()) || deadline <= now) add("deadline", "Collection deadline", "fail", "The collection deadline has already passed.");
  else add("deadline", "Collection deadline", "pass", "Deadline is in the future.");

  if (winStart >= winEnd || winStart > deadline) add("window", "Pickup window", "fail", "The pickup window must start before it ends and before the collection deadline.");
  else add("window", "Pickup window", "pass", "Pickup window is consistent with the deadline.");

  // 2. Donor declarations
  if (!input.not_served_confirmed)
    add("not_served", "Not served / not partially consumed", "fail", "Food that has been served on plates or partially consumed cannot be redistributed.");
  else add("not_served", "Not served / not partially consumed", "pass", "Donor confirmed food was not served to guests or partially consumed.");

  if (!input.hygiene_confirmed) add("hygiene", "Hygienic handling", "fail", "Donor must confirm hygienic preparation and handling.");
  else add("hygiene", "Hygienic handling", "pass", "Donor confirmed hygienic preparation and handling.");

  // 3. Allergens
  if (!input.allergens || !input.allergens.trim()) add("allergens", "Allergen declaration", "fail", "Known allergens must be declared (write 'None known' if none).");
  else add("allergens", "Allergen declaration", "pass", `Declared: ${input.allergens.trim()}`);

  // 4. Packaging
  const produce = input.category === "fruits" || input.category === "vegetables";
  if (input.packaging_condition === "damaged") add("packaging", "Packaging integrity", "fail", "Damaged or leaking packaging cannot be accepted.");
  else if (input.packaging_condition === "open_uncovered" && !produce)
    add("packaging", "Packaging integrity", "fail", "Ready-to-eat or packaged food must be covered in food-grade containers.");
  else if (input.packaging_condition === "open_uncovered") add("packaging", "Packaging integrity", "review", "Whole produce is uncovered — coordinator to confirm condition.");
  else add("packaging", "Packaging integrity", "pass", "Packaging is intact / covered.");

  // 5. Storage and time-temperature control
  const temp = input.storage_temp_c;
  const hasTemp = temp !== null && temp !== undefined && !Number.isNaN(Number(temp));
  if (input.storage_condition === "exposed_unknown") {
    add("storage", "Storage conditions", perishable ? "fail" : "review", perishable ? "Ready-to-eat food left uncovered or in unknown conditions is not safe to redistribute." : "Storage conditions unknown — coordinator to inspect.");
  } else if (perishable) {
    const prepared = input.prepared_at ? new Date(input.prepared_at) : null;
    if (!prepared || Number.isNaN(prepared.getTime())) {
      add("prepared", "Preparation time", "fail", "Preparation time is required for cooked or ready-to-eat food.");
    } else if (prepared > now) {
      add("prepared", "Preparation time", "fail", "Preparation time cannot be in the future.");
    } else {
      const hours = (deadline.getTime() - prepared.getTime()) / 36e5;
      const hrs = hours.toFixed(1);
      switch (input.storage_condition) {
        case "hot_held":
          if (!hasTemp) add("temperature", "Hot-holding temperature", "review", `No temperature recorded. Hot food should be held at ${rules.hotHeldMinTempC}°C or above.`);
          else if (Number(temp) < rules.hotHeldMinTempC) add("temperature", "Hot-holding temperature", "fail", `Recorded ${temp}°C is below the ${rules.hotHeldMinTempC}°C hot-holding rule.`);
          else add("temperature", "Hot-holding temperature", "pass", `Recorded ${temp}°C.`);
          if (hours > rules.hotHeldMaxHours) add("time", "Time since preparation", "fail", `${hrs} h from preparation to deadline exceeds the ${rules.hotHeldMaxHours} h limit for hot-held food.`);
          else add("time", "Time since preparation", "pass", `${hrs} h from preparation to deadline (limit ${rules.hotHeldMaxHours} h).`);
          break;
        case "refrigerated":
          if (!hasTemp) add("temperature", "Cold-holding temperature", "review", `No temperature recorded. Chilled food should be kept at ${rules.coldMaxTempC}°C or below.`);
          else if (Number(temp) > rules.coldMaxTempC) add("temperature", "Cold-holding temperature", "fail", `Recorded ${temp}°C is above the ${rules.coldMaxTempC}°C cold-holding rule.`);
          else add("temperature", "Cold-holding temperature", "pass", `Recorded ${temp}°C.`);
          if (hours > rules.refrigeratedMaxHours) add("time", "Time since preparation", "fail", `${hrs} h exceeds the ${rules.refrigeratedMaxHours} h limit for refrigerated cooked food.`);
          else add("time", "Time since preparation", "pass", `${hrs} h from preparation to deadline (limit ${rules.refrigeratedMaxHours} h).`);
          break;
        case "frozen":
          if (hasTemp && Number(temp) > -18) add("temperature", "Frozen temperature", "review", `Recorded ${temp}°C — frozen food is normally kept at -18°C or below.`);
          else add("temperature", "Frozen temperature", "pass", "Food is frozen.");
          break;
        default: // ambient_covered
          if (hours > rules.ambientMaxHours)
            add("time", "Time at room temperature", "fail", `${hrs} h at room temperature exceeds the ${rules.ambientMaxHours} h limit for cooked food. Hot-hold or refrigerate food to extend safe time.`);
          else add("time", "Time at room temperature", "pass", `${hrs} h from preparation to deadline (limit ${rules.ambientMaxHours} h).`);
      }
    }
  } else {
    add("storage", "Storage conditions", "pass", "Storage suitable for this category.");
  }

  // 6. Expiry for packaged goods and groceries
  if (dated) {
    const exp = input.expiry_at ? new Date(input.expiry_at) : null;
    if (!exp || Number.isNaN(exp.getTime())) add("expiry", "Expiry / best-before", "fail", "Packaged food and groceries must include an expiry or best-before date.");
    else if (exp <= deadline) add("expiry", "Expiry / best-before", "fail", "Product expires before the collection deadline.");
    else add("expiry", "Expiry / best-before", "pass", `Expires ${exp.toISOString().slice(0, 10)}.`);
  }

  // 7. Donor-reported concerns always need a human
  if (input.safety_concerns && input.safety_concerns.trim()) add("concerns", "Donor-reported concerns", "review", input.safety_concerns.trim());

  const failures = checks.filter((c) => c.result === "fail").map((c) => c.detail);
  const result = failures.length ? "fail" : checks.some((c) => c.result === "review") ? "needs_review" : "pass";
  return { result, checks, failures };
}

/** Checks a volunteer must confirm at pickup before food can move. */
export const PICKUP_CHECKS = [
  { key: "covered", label: "Food is covered / sealed in clean, food-grade containers" },
  { key: "temperature", label: "Temperature control is maintained (hot food hot, cold food cold)" },
  { key: "no_spoilage", label: "No visible spoilage, bad odour or contamination" },
  { key: "clean_vehicle", label: "Transport container / vehicle is clean" },
] as const;

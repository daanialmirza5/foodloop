import { all, get, getSetting } from "../db";

export type ImpactFilter = { from?: string; to?: string; includeDemo?: boolean; donorId?: string; eventId?: string; source?: string };

/**
 * All impact numbers are computed from stored records:
 *  - offered   = submitted listings (declared kg)
 *  - accepted  = listings approved after safety screening
 *  - collected = quantities recorded at pickup
 *  - delivered = quantities CONFIRMED BY THE RECIPIENT (one row per listing → never double counted)
 * Event "estimated surplus" is never counted.
 */
export function computeImpact(f: ImpactFilter = {}) {
  const lw: string[] = ["l.status <> 'draft'"];
  const lp: unknown[] = [];
  if (!f.includeDemo) lw.push("l.is_demo = 0");
  if (f.donorId) (lw.push("l.donor_user_id = ?"), lp.push(f.donorId));
  if (f.eventId) (lw.push("l.event_id = ?"), lp.push(f.eventId));
  if (f.source) (lw.push("l.source = ?"), lp.push(f.source));
  const range = (col: string, w: string[], p: unknown[]) => {
    if (f.from) (w.push(`${col} >= ?`), p.push(new Date(`${f.from}T00:00:00+05:30`).toISOString()));
    if (f.to) (w.push(`${col} <= ?`), p.push(new Date(`${f.to}T23:59:59+05:30`).toISOString()));
  };

  const offW = [...lw], offP = [...lp];
  range("l.created_at", offW, offP);
  const offered = get<{ kg: number; n: number; donors: number }>(`SELECT COALESCE(SUM(l.quantity_kg),0) AS kg, COUNT(*) AS n, COUNT(DISTINCT l.donor_user_id) AS donors FROM food_listings l WHERE ${offW.join(" AND ")}`, ...offP)!;

  const accW = [...lw, "l.approved_at IS NOT NULL"], accP = [...lp];
  range("l.approved_at", accW, accP);
  const accepted = get<{ kg: number; n: number }>(`SELECT COALESCE(SUM(l.approved_kg),0) AS kg, COUNT(*) AS n FROM food_listings l WHERE ${accW.join(" AND ")}`, ...accP)!;

  const colW = [...lw, "c.picked_up_at IS NOT NULL"], colP = [...lp];
  range("c.picked_up_at", colW, colP);
  const collected = get<{ kg: number; n: number }>(`SELECT COALESCE(SUM(c.qty_collected_kg),0) AS kg, COUNT(*) AS n FROM collections c JOIN food_listings l ON l.id = c.listing_id WHERE ${colW.join(" AND ")}`, ...colP)!;

  const delW = [...lw], delP = [...lp];
  range("d.confirmed_at", delW, delP);
  const delJoin = `FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id WHERE ${delW.join(" AND ")}`;
  const delivered = get<{ kg: number; n: number; orgs: number }>(`SELECT COALESCE(SUM(d.qty_received_kg),0) AS kg, COUNT(*) AS n, COUNT(DISTINCT d.recipient_org_id) AS orgs ${delJoin}`, ...delP)!;
  const bySource = all<{ source: string; kg: number; n: number }>(`SELECT l.source, COALESCE(SUM(d.qty_received_kg),0) AS kg, COUNT(*) AS n ${delJoin} GROUP BY l.source`, ...delP);
  const byCategory = all<{ category: string; kg: number }>(`SELECT l.category, COALESCE(SUM(d.qty_received_kg),0) AS kg ${delJoin} GROUP BY l.category ORDER BY kg DESC`, ...delP);
  const monthly = all<{ month: string; kg: number }>(`SELECT substr(d.confirmed_at, 1, 7) AS month, COALESCE(SUM(d.qty_received_kg),0) AS kg ${delJoin} GROUP BY month ORDER BY month`, ...delP);
  const eventsServed = get<{ n: number }>(`SELECT COUNT(DISTINCT l.event_id) AS n ${delJoin} AND l.event_id IS NOT NULL`, ...delP)!.n;

  const rejW = [...lw, "l.status = 'rejected'"], rejP = [...lp];
  range("l.updated_at", rejW, rejP);
  const rejected = get<{ kg: number; n: number }>(`SELECT COALESCE(SUM(l.quantity_kg),0) AS kg, COUNT(*) AS n FROM food_listings l WHERE ${rejW.join(" AND ")}`, ...rejP)!;
  const rejectedRows = all<{ status_reason: string | null }>(`SELECT l.status_reason FROM food_listings l WHERE ${rejW.join(" AND ")}`, ...rejP);
  const reasons: Record<string, number> = {};
  for (const r of rejectedRows) {
    const s = r.status_reason ?? "";
    const key = s.startsWith("Automated safety screening failed")
      ? "Failed automated safety screening"
      : s.startsWith("Rejected at pickup")
        ? "Failed pickup safety check"
        : s.startsWith("Refused on arrival")
          ? "Refused by recipient on arrival"
          : "Rejected by coordinator review";
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  // which automated checks fail most often
  const failedChecks: Record<string, number> = {};
  for (const s of all<{ checks_json: string }>(
    `SELECT s.checks_json FROM safety_screenings s JOIN food_listings l ON l.id = s.listing_id WHERE s.stage = 'automated' AND s.result = 'fail' AND ${lw.join(" AND ")}`,
    ...lp,
  )) {
    for (const c of JSON.parse(s.checks_json) as { label: string; result: string }[]) if (c.result === "fail") failedChecks[c.label] = (failedChecks[c.label] ?? 0) + 1;
  }

  const volW = [f.includeDemo ? "1=1" : "l.is_demo = 0", "c.status = 'completed'", "c.volunteer_user_id IS NOT NULL"], volP: unknown[] = [];
  if (f.donorId) (volW.push("l.donor_user_id = ?"), volP.push(f.donorId));
  range("c.delivered_at", volW, volP);
  const volunteer = get<{ n: number; minutes: number }>(`SELECT COUNT(*) AS n, COALESCE(SUM(c.volunteer_minutes),0) AS minutes FROM collections c JOIN food_listings l ON l.id = c.listing_id WHERE ${volW.join(" AND ")}`, ...volP)!;

  const evW = [f.includeDemo ? "1=1" : "is_demo = 0"], evP: unknown[] = [];
  if (f.donorId) (evW.push("organizer_user_id = ?"), evP.push(f.donorId));
  range("created_at", evW, evP);
  const events = get<{ n: number; cancelled: number; offered: number }>(
    `SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM food_listings l WHERE l.event_id = events.id AND l.status <> 'draft') THEN 1 ELSE 0 END) AS offered
       FROM events WHERE ${evW.join(" AND ")}`,
    ...evP,
  )!;

  const orgs = get<{ n: number }>(`SELECT COUNT(*) AS n FROM organizations WHERE kind = 'recipient' AND verification_status = 'verified' ${f.includeDemo ? "" : "AND is_demo = 0"}`)!.n;

  const mW = [f.includeDemo ? "1=1" : "d.is_demo = 0"], mP: unknown[] = [];
  range("d.created_at", mW, mP);
  const money = get<{ provider_confirmed: number; simulated: number; refunded: number; count: number }>(
    `SELECT COALESCE(SUM(CASE WHEN d.status = 'succeeded' AND d.mode <> 'simulated' THEN d.amount_paise END),0) AS provider_confirmed,
            COALESCE(SUM(CASE WHEN d.status = 'succeeded' AND d.mode = 'simulated' THEN d.amount_paise END),0) AS simulated,
            COALESCE(SUM(CASE WHEN d.status = 'refunded' THEN d.amount_paise END),0) AS refunded,
            SUM(CASE WHEN d.status = 'succeeded' THEN 1 ELSE 0 END) AS count
       FROM monetary_donations d WHERE ${mW.join(" AND ")}`,
    ...mP,
  )!;
  const dW = [f.includeDemo ? "1=1" : "is_demo = 0"], dP: unknown[] = [];
  range("created_at", dW, dP);
  const disbursed = get<{ p: number }>(`SELECT COALESCE(SUM(amount_paise),0) AS p FROM disbursements WHERE ${dW.join(" AND ")}`, ...dP)!.p;

  const kgPerMeal = Number(getSetting("kg_per_meal", "0.4"));
  return {
    offered,
    accepted,
    collected,
    delivered,
    bySource,
    byCategory,
    monthly,
    rejected: { ...rejected, reasons, failedChecks },
    volunteer: { completed: volunteer.n, hours: Math.round((volunteer.minutes / 60) * 10) / 10 },
    events: { registered: events.n ?? 0, cancelled: events.cancelled ?? 0, offeredFood: events.offered ?? 0, completedCollections: eventsServed },
    eventDeliveredKg: bySource.find((s) => s.source === "event_surplus")?.kg ?? 0,
    freshDelivered: bySource.find((s) => s.source === "fresh_donation") ?? { kg: 0, n: 0 },
    verifiedOrgs: orgs,
    money: { ...money, disbursed },
    estimate: { kgPerMeal, meals: kgPerMeal > 0 ? Math.floor(delivered.kg / kgPerMeal) : 0 },
  };
}

export type Impact = ReturnType<typeof computeImpact>;

export function hasDemoData() {
  return !!get("SELECT 1 FROM users WHERE is_demo = 1 LIMIT 1");
}

/** Raw delivered records for CSV export. */
export function deliveredRecords(f: ImpactFilter = {}) {
  const w = [f.includeDemo ? "1=1" : "l.is_demo = 0"];
  const p: unknown[] = [];
  if (f.from) (w.push("d.confirmed_at >= ?"), p.push(new Date(`${f.from}T00:00:00+05:30`).toISOString()));
  if (f.to) (w.push("d.confirmed_at <= ?"), p.push(new Date(`${f.to}T23:59:59+05:30`).toISOString()));
  if (f.donorId) (w.push("l.donor_user_id = ?"), p.push(f.donorId));
  if (f.eventId) (w.push("l.event_id = ?"), p.push(f.eventId));
  return all<Record<string, unknown>>(
    `SELECT l.code AS tracking_id, l.title, l.category, l.source, e.name AS event, l.quantity_kg AS offered_kg, l.approved_kg AS accepted_kg,
            c.qty_collected_kg AS collected_kg, d.qty_received_kg AS delivered_kg, o.name AS recipient, d.confirmed_at,
            CASE l.is_demo WHEN 1 THEN 'DEMO' ELSE 'REAL' END AS data_type
       FROM delivery_confirmations d JOIN food_listings l ON l.id = d.listing_id JOIN collections c ON c.id = d.collection_id
       JOIN organizations o ON o.id = d.recipient_org_id LEFT JOIN events e ON e.id = l.event_id
      WHERE ${w.join(" AND ")} ORDER BY d.confirmed_at DESC`,
    ...p,
  );
}

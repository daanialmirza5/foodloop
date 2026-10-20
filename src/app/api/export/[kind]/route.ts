import { NextResponse, type NextRequest } from "next/server";
import { all, get } from "@/lib/db";
import { getActor } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { toCsv } from "@/lib/utils";
import { deliveredRecords } from "@/lib/services/impact";
import { listAudit } from "@/lib/services/audit";

/** CSV exports. Each export checks who is asking. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const q = req.nextUrl.searchParams;
  const actor = await getActor();
  const from = q.get("from") || undefined;
  const to = q.get("to") || undefined;
  const includeDemo = q.get("demo") === "1";
  let rows: Record<string, unknown>[] = [];

  switch (kind) {
    case "impact": // public: aggregated delivered records, no personal data
      rows = deliveredRecords({ from, to, includeDemo }).map(({ recipient: _r, ...r }) => r);
      break;
    case "my-donations":
      if (!actor) return deny(401);
      rows = deliveredRecords({ from, to, includeDemo: true, donorId: actor.id });
      break;
    case "event": {
      const id = q.get("id") ?? "";
      const ev = get<{ organizer_user_id: string }>("SELECT organizer_user_id FROM events WHERE id = ?", id);
      if (!actor || !ev || (ev.organizer_user_id !== actor.id && !isAdmin(actor))) return deny(403);
      rows = all(
        `SELECT l.code, l.title, l.status, l.quantity_kg AS offered_kg, l.approved_kg AS accepted_kg,
                (SELECT c.qty_collected_kg FROM collections c WHERE c.listing_id = l.id AND c.picked_up_at IS NOT NULL ORDER BY c.created_at DESC LIMIT 1) AS collected_kg,
                (SELECT d.qty_received_kg FROM delivery_confirmations d WHERE d.listing_id = l.id) AS delivered_kg, l.status_reason, l.created_at
           FROM food_listings l WHERE l.event_id = ? ORDER BY l.created_at`,
        id,
      );
      break;
    }
    case "listings":
    case "users":
    case "payments":
    case "incidents":
    case "events":
    case "audit":
    case "collections":
      if (!isAdmin(actor)) return deny(403);
      rows = adminExport(kind, from, to);
      break;
    default:
      return deny(404);
  }
  return new NextResponse(toCsv(rows) || "no records\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="foodloop-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function deny(status: number) {
  return new NextResponse(status === 404 ? "Unknown export" : "Not authorised", { status });
}

function adminExport(kind: string, from?: string, to?: string) {
  const range = (col: string) => {
    const w: string[] = [];
    const p: unknown[] = [];
    if (from) (w.push(`${col} >= ?`), p.push(new Date(`${from}T00:00:00+05:30`).toISOString()));
    if (to) (w.push(`${col} <= ?`), p.push(new Date(`${to}T23:59:59+05:30`).toISOString()));
    return { where: w.length ? `WHERE ${w.join(" AND ")}` : "", p };
  };
  switch (kind) {
    case "listings": {
      const r = range("created_at");
      return all(`SELECT code, title, category, source, status, quantity_kg, approved_kg, city, collection_deadline, status_reason, CASE is_demo WHEN 1 THEN 'DEMO' ELSE 'REAL' END AS data_type, created_at FROM food_listings ${r.where} ORDER BY created_at DESC`, ...r.p);
    }
    case "users":
      return all("SELECT name, email, role, status, city, CASE is_demo WHEN 1 THEN 'DEMO' ELSE 'REAL' END AS data_type, created_at FROM users ORDER BY created_at DESC");
    case "payments": {
      const r = range("created_at");
      return all(`SELECT code, donor_name, amount_paise / 100.0 AS amount_inr, status, mode, provider, provider_order_id, provider_payment_id, created_at FROM monetary_donations ${r.where} ORDER BY created_at DESC`, ...r.p);
    }
    case "incidents":
      return all("SELECT i.kind, i.severity, i.status, i.description, i.resolution, l.code AS listing, i.created_at FROM incidents i LEFT JOIN food_listings l ON l.id = i.listing_id ORDER BY i.created_at DESC");
    case "events":
      return all("SELECT name, event_type, event_date, venue_name, city, expected_guests, estimated_surplus_kg, status, CASE is_demo WHEN 1 THEN 'DEMO' ELSE 'REAL' END AS data_type FROM events ORDER BY event_date DESC");
    case "collections":
      return all("SELECT l.code, c.status, c.transport_mode, u.name AS volunteer, c.scheduled_pickup_at, c.picked_up_at, c.delivered_at, c.qty_collected_kg, c.qty_delivered_kg, c.failure_reason FROM collections c JOIN food_listings l ON l.id = c.listing_id LEFT JOIN users u ON u.id = c.volunteer_user_id ORDER BY c.created_at DESC");
    case "audit":
      return listAudit(5000).map((a) => ({ when: a.created_at, actor: a.actor_name, role: a.actor_role, action: a.action, entity: a.entity_type, entity_id: a.entity_id, reason: a.reason }));
  }
  return [];
}

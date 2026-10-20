import { all, insert } from "../db";
import { newId, nowIso } from "../utils";

export function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  reason?: string | null,
  details?: Record<string, unknown>,
) {
  insert("audit_logs", {
    id: newId("aud"),
    actor_user_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason: reason ?? null,
    details_json: details ? JSON.stringify(details) : null,
    created_at: nowIso(),
  });
}

export function recordHistory(entityType: string, entityId: string, from: string | null, to: string, actorId: string | null, note?: string | null) {
  insert("status_history", {
    id: newId("hst"),
    entity_type: entityType,
    entity_id: entityId,
    from_status: from,
    to_status: to,
    actor_user_id: actorId,
    note: note ?? null,
    created_at: nowIso(),
  });
}

export type HistoryRow = { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string; actor_name: string | null; entity_type: string };

export function historyFor(entityType: string, entityId: string) {
  return all<HistoryRow>(
    `SELECT h.*, u.name AS actor_name FROM status_history h LEFT JOIN users u ON u.id = h.actor_user_id
      WHERE h.entity_type = ? AND h.entity_id = ? ORDER BY h.created_at ASC, h.rowid ASC`,
    entityType,
    entityId,
  );
}

export function listAudit(limit = 200) {
  return all<{ id: string; action: string; entity_type: string; entity_id: string | null; reason: string | null; details_json: string | null; created_at: string; actor_name: string | null; actor_role: string | null }>(
    `SELECT a.*, u.name AS actor_name, u.role AS actor_role FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?`,
    limit,
  );
}

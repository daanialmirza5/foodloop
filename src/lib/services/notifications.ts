import { all, get, insert, run } from "../db";
import { newId, nowIso } from "../utils";

/**
 * In-app notifications. External channels (email / WhatsApp) are NOT configured
 * in this build, so nothing here claims an external message was sent.
 */
export function notify(userIds: (string | null | undefined)[], type: string, title: string, body?: string, link?: string) {
  const unique = [...new Set(userIds.filter(Boolean) as string[])];
  const ts = nowIso();
  for (const userId of unique) {
    insert("notifications", { id: newId("ntf"), user_id: userId, type, title, body: body ?? null, link: link ?? null, read_at: null, created_at: ts });
  }
}

export function adminIds(): string[] {
  return all<{ id: string }>("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").map((r) => r.id);
}

export function notifyAdmins(type: string, title: string, body?: string, link?: string) {
  notify(adminIds(), type, title, body, link);
}

export type NotificationRow = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function listNotifications(userId: string, limit = 100) {
  return all<NotificationRow>("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?", userId, limit);
}

export function unreadCount(userId: string) {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", userId)?.n ?? 0;
}

export function markRead(userId: string, id?: string) {
  if (id) run("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", nowIso(), id, userId);
  else run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowIso(), userId);
}

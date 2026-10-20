import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

/**
 * Local relational database built on Node's built-in SQLite (node >= 22.13).
 * Loaded through process.getBuiltinModule so bundlers never try to resolve it.
 */
type Param = string | number | bigint | null | Uint8Array;
type Row = Record<string, unknown>;

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

const globalRef = globalThis as unknown as { __foodloopDb?: DatabaseSyncType; __foodloopTxDepth?: number };

function openDatabase(file: string): DatabaseSyncType {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  db.prepare("INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('version', ?)").run(String(SCHEMA_VERSION));
  return db;
}

export function getDb(): DatabaseSyncType {
  if (!globalRef.__foodloopDb) {
    globalRef.__foodloopDb = openDatabase(process.env.DATABASE_FILE || "./data/foodloop.db");
  }
  return globalRef.__foodloopDb;
}

/** Used by tests and the seed script to point at a fresh database. */
export function resetDbConnection(file?: string) {
  globalRef.__foodloopDb?.close();
  globalRef.__foodloopDb = undefined;
  globalRef.__foodloopTxDepth = 0;
  if (file) process.env.DATABASE_FILE = file;
}

function clean(params: unknown[]): Param[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p as Param;
  });
}

// node:sqlite returns null-prototype rows; React can only serialise plain objects to client components.
export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...clean(params))
    .map((r) => ({ ...r })) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  const row = getDb().prepare(sql).get(...clean(params));
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...clean(params));
}

/** Insert a row from an object. Keys are trusted column names from our own code. */
export function insert(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
  return run(sql, ...keys.map((k) => row[k]));
}

export function update(table: string, id: string, patch: Record<string, unknown>, idColumn = "id") {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE ${idColumn} = ?`;
  return run(sql, ...keys.map((k) => patch[k]), id);
}

/**
 * Run fn atomically. Nested calls join the outer transaction.
 * node:sqlite is synchronous, so a transaction can never interleave with
 * another request inside this process.
 */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  const depth = globalRef.__foodloopTxDepth ?? 0;
  if (depth > 0) {
    globalRef.__foodloopTxDepth = depth + 1;
    try {
      return fn();
    } finally {
      globalRef.__foodloopTxDepth = depth;
    }
  }
  db.exec("BEGIN IMMEDIATE");
  globalRef.__foodloopTxDepth = 1;
  try {
    const result = fn();
    if (result instanceof Promise) throw new Error("tx() callbacks must be synchronous");
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    globalRef.__foodloopTxDepth = 0;
  }
}

export function getSetting(key: string, fallback: string): string {
  return get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  run("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
}

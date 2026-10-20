import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { invalid } from "./errors";

type Kind = "photos" | "documents";

const LIMITS: Record<Kind, { maxBytes: number; types: string[] }> = {
  photos: { maxBytes: 3 * 1024 * 1024, types: ["jpg", "png", "webp"] },
  documents: { maxBytes: 5 * 1024 * 1024, types: ["pdf", "jpg", "png"] },
};

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Identify a file by its magic bytes — never trust the browser-supplied MIME type or name. */
export function sniffType(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  return null;
}

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./storage");
}

/** Saves an uploaded file outside the public folder. Returns "<kind>/<name>" or null if no file was given. */
export async function saveUpload(file: File | null | undefined, kind: Kind): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const limit = LIMITS[kind];
  if (file.size > limit.maxBytes) throw invalid(`File is too large (max ${Math.round(limit.maxBytes / 1048576)} MB).`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(buf);
  if (!type || !limit.types.includes(type)) throw invalid(`Unsupported file. Allowed: ${limit.types.join(", ").toUpperCase()}.`);
  const dir = path.join(uploadRoot(), kind);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${type}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `${kind}/${name}`;
}

/** Resolve a stored relative path safely (no traversal outside the upload root). */
export function resolveUpload(rel: string): { file: string; type: string } | null {
  if (!/^(photos|documents)\/[a-f0-9]{24}\.(jpg|png|webp|pdf)$/.test(rel)) return null;
  const file = path.join(uploadRoot(), rel);
  if (!fs.existsSync(file)) return null;
  const ext = rel.split(".").pop()!;
  return { file, type: CONTENT_TYPES[ext] };
}

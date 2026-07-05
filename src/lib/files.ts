import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

// Uploads live outside public/ because Next only serves public/ assets that
// existed at build time; /files/[...path] streams these at runtime.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
]);

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Persist an uploaded file under uploads/<subdir>/ with a random name.
 * Returns the relative stored path ("subdir/name.ext"), or null if the
 * file is empty, too large, or has a disallowed extension.
 */
export async function saveUpload(
  file: File | null,
  subdir: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) return null;
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;

  const name = `${randomBytes(12).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `${subdir}/${name}`;
}

export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

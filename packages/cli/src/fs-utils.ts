// packages/cli/src/fs-utils.ts
// File-system helpers: directory creation and JSON/text read/write.
// All helpers perform disk I/O only — no project/domain logic.

import { promises as fs } from "node:fs";
import { dirname } from "node:path";

/** Recursively create a directory if it does not exist. */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Read and parse a JSON file.
 *
 * Returns `null` only when the file does not exist (ENOENT). Any other
 * error (e.g. a malformed JSON payload or an I/O failure) is re-thrown
 * with context so data corruption is not silently masked.
 */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    // Re-throw JSON parse errors and other I/O errors with context.
    throw new Error(`Failed to read ${filePath}: ${e?.message ?? e}`);
  }
}

/** Serialize data as pretty-printed JSON and write it to disk. */
export async function writeJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/** Write plain text to a file, creating parent directories as needed. */
export async function writeText(
  filePath: string,
  text: string,
): Promise<void> {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, text, "utf8");
}

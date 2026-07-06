// packages/cli/src/fs-utils.ts
// File-system helpers: directory creation and JSON/text read/write.
// All helpers perform disk I/O only — no project/domain logic.
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
/** Recursively create a directory if it does not exist. */
export async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
/** Read and parse a JSON file, returning null on any I/O or parse error. */
export async function readJson(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/** Serialize data as pretty-printed JSON and write it to disk. */
export async function writeJson(filePath, data) {
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
/** Write plain text to a file, creating parent directories as needed. */
export async function writeText(filePath, text) {
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, text, "utf8");
}
//# sourceMappingURL=fs-utils.js.map
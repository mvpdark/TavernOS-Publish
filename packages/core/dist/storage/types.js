// Unified storage types — shared between WebDAV and Local storage backends.
import { z } from "zod";
/** Storage mode: "webdav" (remote) or "local" (filesystem). */
export const StorageModeSchema = z.enum(["webdav", "local"]).default("webdav");
/** Local storage configuration. */
export const LocalStorageConfigSchema = z.object({
    /** Absolute path to the TavernOS root folder, e.g. "D:\\TavernOS" or "/data/TavernOS". */
    path: z.string().default(""),
});
//# sourceMappingURL=types.js.map
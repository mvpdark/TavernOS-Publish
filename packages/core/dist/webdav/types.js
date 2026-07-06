// WebDAV client types and Zod schemas.
//
// WebDAV is accessed via standard HTTP extensions (MKCOL / PUT / PROPFIND / GET)
// so no third-party SDK is required — native fetch is sufficient.
import { z } from "zod";
/** WebDAV connection + storage configuration. */
export const WebDAVConfigSchema = z.object({
    /** Server root URL, e.g. https://dav.example.com or https://dav.jianguoyun.com/dav/ */
    url: z.string().default(""),
    /** Username for Basic auth. */
    username: z.string().default(""),
    /** Password or app-specific token for Basic auth. */
    password: z.string().default(""),
    /** Base folder path under the server root where TavernOS data is mirrored,
     *  e.g. /TavernOS (contains Novels/ and Characters/ subfolders). */
    basePath: z.string().default("/TavernOS"),
});
//# sourceMappingURL=types.js.map
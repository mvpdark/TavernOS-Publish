import { z } from "zod";
/** WebDAV connection + storage configuration. */
export declare const WebDAVConfigSchema: z.ZodObject<{
    /** Server root URL, e.g. https://dav.example.com or https://dav.jianguoyun.com/dav/ */
    url: z.ZodDefault<z.ZodString>;
    /** Username for Basic auth. */
    username: z.ZodDefault<z.ZodString>;
    /** Password or app-specific token for Basic auth. */
    password: z.ZodDefault<z.ZodString>;
    /** Base folder path under the server root where TavernOS data is mirrored,
     *  e.g. /TavernOS (contains Novels/ and Characters/ subfolders). */
    basePath: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    username: string;
    password: string;
    basePath: string;
}, {
    url?: string | undefined;
    username?: string | undefined;
    password?: string | undefined;
    basePath?: string | undefined;
}>;
export type WebDAVConfig = z.infer<typeof WebDAVConfigSchema>;
/** Result of a WebDAV connection test. */
export interface WebDAVTestResult {
    readonly ok: boolean;
    readonly message: string;
}
//# sourceMappingURL=types.d.ts.map
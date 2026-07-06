import type { WebDAVConfig, WebDAVTestResult } from "./types.js";
export interface WebDAVClient {
    /** Test connectivity by issuing a PROPFIND against the base path. */
    testConnection(): Promise<WebDAVTestResult>;
    /** Recursively ensure a folder exists (relative to basePath). */
    ensureFolder(relativePath: string): Promise<void>;
    /** Upload a file (relative to basePath). Returns the public URL of the file. */
    uploadFile(relativePath: string, data: Buffer, contentType: string): Promise<string>;
    /** Delete a file or folder (relative to basePath). No error if it doesn't exist. */
    deletePath(relativePath: string): Promise<void>;
    /** Resolve the full public URL for a path (relative to basePath). */
    getPublicUrl(relativePath: string): string;
    /** Whether the config has the minimum fields populated. */
    readonly configured: boolean;
}
export declare function createWebDAVClient(config: WebDAVConfig): WebDAVClient;
//# sourceMappingURL=client.d.ts.map
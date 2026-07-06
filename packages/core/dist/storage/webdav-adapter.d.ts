import { Buffer } from "node:buffer";
import type { WebDAVClient } from "../webdav/client.js";
import type { WebDAVConfig } from "../webdav/types.js";
import type { StorageClient, StorageMode, StorageTestResult } from "./types.js";
export declare class WebDAVStorageAdapter implements StorageClient {
    private readonly client;
    private readonly config;
    readonly mode: StorageMode;
    constructor(client: WebDAVClient, config: WebDAVConfig);
    get configured(): boolean;
    testConnection(): Promise<StorageTestResult>;
    ensureFolder(relativePath: string): Promise<void>;
    uploadFile(relativePath: string, data: Buffer, contentType: string): Promise<string>;
    deletePath(relativePath: string): Promise<void>;
    getPublicUrl(relativePath: string): string;
    downloadFile(relativePath: string): Promise<Buffer>;
}
//# sourceMappingURL=webdav-adapter.d.ts.map
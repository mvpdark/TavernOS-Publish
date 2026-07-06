import type { LocalStorageConfig, StorageTestResult, StorageClient, StorageMode } from "./types.js";
export declare class LocalStorageClient implements StorageClient {
    private readonly rootPath;
    readonly mode: StorageMode;
    readonly configured: boolean;
    constructor(config: LocalStorageConfig);
    /** Resolve a relative path to an absolute filesystem path, with path traversal guard. */
    private resolvePath;
    testConnection(): Promise<StorageTestResult>;
    ensureFolder(relativePath: string): Promise<void>;
    uploadFile(relativePath: string, data: Buffer, _contentType: string): Promise<string>;
    deletePath(relativePath: string): Promise<void>;
    getPublicUrl(relativePath: string): string;
    downloadFile(relativePath: string): Promise<Buffer>;
}
/** Factory: create a LocalStorageClient from config. */
export declare function createLocalStorageClient(config: LocalStorageConfig): LocalStorageClient;
//# sourceMappingURL=local-client.d.ts.map
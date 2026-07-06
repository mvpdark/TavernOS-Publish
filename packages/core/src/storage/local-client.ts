// Local filesystem storage client — mirrors the WebDAVClient interface but
// reads/writes directly to a local directory on disk.
//
// Files are served to the browser via the /api/local-storage/ proxy endpoint,
// so getPublicUrl() returns relative URLs that the frontend can fetch.

import { promises as fs } from "node:fs";
import { join, resolve, normalize, sep } from "node:path";
import type { LocalStorageConfig, StorageTestResult, StorageClient, StorageMode } from "./types.js";

/** Normalize a relative path to use forward slashes and strip leading/trailing slashes. */
function normalizeRelative(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

/** The API endpoint prefix for serving local storage files to the browser. */
const LOCAL_API_PREFIX = "/api/local-storage/file";

export class LocalStorageClient implements StorageClient {
  private readonly rootPath: string;
  readonly mode: StorageMode = "local";
  readonly configured: boolean;

  constructor(config: LocalStorageConfig) {
    this.rootPath = config.path ? resolve(config.path) : "";
    this.configured = !!config.path;
  }

  /** Resolve a relative path to an absolute filesystem path, with path traversal guard. */
  private resolvePath(relativePath: string): string {
    const clean = normalizeRelative(relativePath);
    const full = join(this.rootPath, clean);
    const normalizedFull = resolve(normalize(full));
    // Guard against path traversal: resolved path must start with rootPath.
    if (!normalizedFull.startsWith(this.rootPath + sep) && normalizedFull !== this.rootPath) {
      throw new Error(`Path traversal detected: ${relativePath}`);
    }
    return normalizedFull;
  }

  async testConnection(): Promise<StorageTestResult> {
    if (!this.configured) {
      return { ok: false, message: "本地存储路径不能为空" };
    }
    try {
      // Ensure the directory exists.
      await fs.mkdir(this.rootPath, { recursive: true });
      // Verify writability by creating (and removing) a temp file.
      const testFile = join(this.rootPath, ".tavernos-write-test");
      await fs.writeFile(testFile, "ok");
      await fs.unlink(testFile);
      return { ok: true, message: "本地存储路径可访问且可写入" };
    } catch (e) {
      return {
        ok: false,
        message: `路径不可用或不可写: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  async ensureFolder(relativePath: string): Promise<void> {
    if (!this.configured) return;
    const dirPath = this.resolvePath(relativePath);
    await fs.mkdir(dirPath, { recursive: true }).catch(() => {});
  }

  async uploadFile(relativePath: string, data: Buffer, _contentType: string): Promise<string> {
    if (!this.configured) throw new Error("Local storage not configured");
    const filePath = this.resolvePath(relativePath);
    // Ensure parent folder exists.
    const parentDir = filePath.substring(0, filePath.lastIndexOf(sep));
    await fs.mkdir(parentDir, { recursive: true }).catch(() => {});
    await fs.writeFile(filePath, data);
    return this.getPublicUrl(relativePath);
  }

  async deletePath(relativePath: string): Promise<void> {
    if (!this.configured) return;
    const targetPath = this.resolvePath(relativePath);
    // Try to delete as file first, then as directory.
    await fs.unlink(targetPath).catch(() => {});
    await fs.rm(targetPath, { recursive: true, force: true }).catch(() => {});
  }

  getPublicUrl(relativePath: string): string {
    const clean = normalizeRelative(relativePath);
    return `${LOCAL_API_PREFIX}/${clean}`;
  }

  async downloadFile(relativePath: string): Promise<Buffer> {
    if (!this.configured) throw new Error("Local storage not configured");
    const filePath = this.resolvePath(relativePath);
    return fs.readFile(filePath);
  }
}

/** Factory: create a LocalStorageClient from config. */
export function createLocalStorageClient(config: LocalStorageConfig): LocalStorageClient {
  return new LocalStorageClient(config);
}

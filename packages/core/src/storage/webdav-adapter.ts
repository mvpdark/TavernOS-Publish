// WebDAV adapter — wraps the existing WebDAVClient to implement the unified
// StorageClient interface, adding the missing downloadFile() method.

import { Buffer } from "node:buffer";
import type { WebDAVClient } from "../webdav/client.js";
import type { WebDAVConfig } from "../webdav/types.js";
import type { StorageClient, StorageMode, StorageTestResult } from "./types.js";

export class WebDAVStorageAdapter implements StorageClient {
  readonly mode: StorageMode = "webdav";

  constructor(
    private readonly client: WebDAVClient,
    private readonly config: WebDAVConfig,
  ) {}

  get configured(): boolean {
    return this.client.configured;
  }

  async testConnection(): Promise<StorageTestResult> {
    const result = await this.client.testConnection();
    return { ok: result.ok, message: result.message };
  }

  async ensureFolder(relativePath: string): Promise<void> {
    return this.client.ensureFolder(relativePath);
  }

  async uploadFile(relativePath: string, data: Buffer, contentType: string): Promise<string> {
    return this.client.uploadFile(relativePath, data, contentType);
  }

  async deletePath(relativePath: string): Promise<void> {
    return this.client.deletePath(relativePath);
  }

  getPublicUrl(relativePath: string): string {
    return this.client.getPublicUrl(relativePath);
  }

  async downloadFile(relativePath: string): Promise<Buffer> {
    const url = this.client.getPublicUrl(relativePath);
    const authHeader = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`;
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`WebDAV download failed ${res.status}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

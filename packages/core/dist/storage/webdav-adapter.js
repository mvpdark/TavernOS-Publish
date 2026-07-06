// WebDAV adapter — wraps the existing WebDAVClient to implement the unified
// StorageClient interface, adding the missing downloadFile() method.
import { Buffer } from "node:buffer";
export class WebDAVStorageAdapter {
    client;
    config;
    mode = "webdav";
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    get configured() {
        return this.client.configured;
    }
    async testConnection() {
        const result = await this.client.testConnection();
        return { ok: result.ok, message: result.message };
    }
    async ensureFolder(relativePath) {
        return this.client.ensureFolder(relativePath);
    }
    async uploadFile(relativePath, data, contentType) {
        return this.client.uploadFile(relativePath, data, contentType);
    }
    async deletePath(relativePath) {
        return this.client.deletePath(relativePath);
    }
    getPublicUrl(relativePath) {
        return this.client.getPublicUrl(relativePath);
    }
    async downloadFile(relativePath) {
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
//# sourceMappingURL=webdav-adapter.js.map
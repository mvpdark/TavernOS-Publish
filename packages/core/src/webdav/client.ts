// WebDAV client implemented with native fetch.
//
// WebDAV extends HTTP with a few extra methods:
//   - MKCOL  : create a collection (folder)
//   - PUT    : upload/overwrite a file
//   - PROPFIND: list/inspect resources (used here for connection tests)
//   - GET    : download a file
// All requests use HTTP Basic auth. No external SDK is required.

import type { WebDAVConfig, WebDAVTestResult } from "./types.js";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Join path segments with single slashes, ensuring a leading slash and no trailing slash. */
function joinPath(...segments: string[]): string {
  const joined = segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter((s) => s.length > 0)
    .join("/");
  return joined ? `/${joined}` : "";
}

/** Build the Basic auth header value from username:password. */
function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// WebDAVClient interface
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWebDAVClient(config: WebDAVConfig): WebDAVClient {
  const root = (config.url || "").replace(/\/+$/, "");
  const base = config.basePath || "";

  const configured = !!(config.url && config.username && config.password);

  /** Full URL for a path relative to basePath. */
  function fullUrl(relativePath: string): string {
    const path = joinPath(base, relativePath);
    return `${root}${path}`;
  }

  /** Build headers with Basic auth. */
  function headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: basicAuth(config.username, config.password),
      ...extra,
    };
  }

  /** Issue an MKCOL request; resolves on 201 (created) or 405 (already exists). */
  async function mkcol(url: string): Promise<void> {
    const res = await fetch(url, { method: "MKCOL", headers: headers() });
    if (res.status !== 201 && res.status !== 405) {
      throw new Error(`MKCOL failed ${res.status}`);
    }
  }

  return {
    configured,

    async testConnection(): Promise<WebDAVTestResult> {
      if (!configured) {
        return { ok: false, message: "WebDAV 地址、用户名、密码不能为空" };
      }
      const url = fullUrl("");
      // PROPFIND with Depth: 0 to check the base folder exists / is accessible.
      try {
        const res = await fetch(url, {
          method: "PROPFIND",
          headers: headers({ Depth: "0" }),
        });
        // 207 Multi-Status = success. 404 = folder missing (server still reachable).
        if (res.status === 207) {
          return { ok: true, message: "连接成功，基础目录可访问" };
        }
        if (res.status === 404) {
          // Try to create the base folder.
          try {
            await mkcol(fullUrl(""));
            return { ok: true, message: "连接成功，已自动创建基础目录" };
          } catch {
            return { ok: false, message: "服务器可达但基础目录不存在且无法创建 (404)" };
          }
        }
        if (res.status === 401) {
          return { ok: false, message: "认证失败：用户名或密码错误 (401)" };
        }
        if (res.status === 405) {
          // Method Not Allowed — some servers reject PROPFIND but allow PUT.
          return { ok: true, message: "连接成功（服务器不支持 PROPFIND，但可能可上传）" };
        }
        const text = await res.text().catch(() => "");
        return { ok: false, message: `HTTP ${res.status}: ${text || res.statusText}` };
      } catch (e) {
        return { ok: false, message: `网络错误: ${e instanceof Error ? e.message : String(e)}` };
      }
    },

    async ensureFolder(relativePath: string): Promise<void> {
      // Create each path segment recursively so deeply nested folders work.
      const segments = joinPath(base, relativePath)
        .split("/")
        .filter((s) => s.length > 0);
      let current = root;
      for (const seg of segments) {
        current = `${current}/${seg}`;
        // 405 = folder already exists; ignore. Other errors are swallowed so a
        // single uncreatable segment does not abort the whole chain — the
        // subsequent PUT will surface a real failure if the folder is missing.
        await mkcol(current).catch(() => {});
      }
    },

    async uploadFile(relativePath: string, data: Buffer, contentType: string): Promise<string> {
      const url = fullUrl(relativePath);
      // Ensure the parent folder exists before uploading.
      const parent = relativePath.split("/").slice(0, -1).join("/");
      if (parent) {
        await this.ensureFolder(parent);
      }
      // Copy the Buffer's byte region into a standalone ArrayBuffer. Node's
      // global fetch accepts ArrayBuffer as a body; the raw Buffer/Uint8Array
      // trips a TS 5.7+ generic-typed-array mismatch, so cast the union
      // (ArrayBuffer | SharedArrayBuffer) down to ArrayBuffer — image buffers
      // are always plain ArrayBuffers at runtime. We avoid the DOM-only
      // BodyInit type since core is a pure Node.js package (lib: ES2022 only).
      const bodyBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const res = await fetch(url, {
        method: "PUT",
        headers: headers({ "Content-Type": contentType }),
        body: bodyBuffer as ArrayBuffer,
      });
      if (!res.ok && res.status !== 201 && res.status !== 204 && res.status !== 200) {
        const text = await res.text().catch(() => "");
        throw new Error(`WebDAV upload failed ${res.status}: ${text || res.statusText}`);
      }
      return url;
    },

    async deletePath(relativePath: string): Promise<void> {
      const url = fullUrl(relativePath);
      const res = await fetch(url, { method: "DELETE", headers: headers() });
      // 204/200 = deleted, 404 = already gone — all fine.
      if (!res.ok && res.status !== 404 && res.status !== 204 && res.status !== 200) {
        const text = await res.text().catch(() => "");
        throw new Error(`WebDAV delete failed ${res.status}: ${text || res.statusText}`);
      }
    },

    getPublicUrl(relativePath: string): string {
      return fullUrl(relativePath);
    },
  };
}

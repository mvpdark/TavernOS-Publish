// WebDAV module exports.

export {
  WebDAVConfigSchema,
  type WebDAVConfig,
  type WebDAVTestResult,
} from "./types.js";

export { createWebDAVClient, type WebDAVClient } from "./client.js";

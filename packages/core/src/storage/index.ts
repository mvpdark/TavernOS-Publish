// Storage module exports — unified interface for WebDAV and Local storage.

export {
  StorageModeSchema,
  LocalStorageConfigSchema,
  type StorageMode,
  type LocalStorageConfig,
  type StorageTestResult,
  type StorageClient,
} from "./types.js";

export { LocalStorageClient, createLocalStorageClient } from "./local-client.js";
export { WebDAVStorageAdapter } from "./webdav-adapter.js";

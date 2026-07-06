// Unified storage types — shared between WebDAV and Local storage backends.

import { z } from "zod";

/** Storage mode: "webdav" (remote) or "local" (filesystem). */
export const StorageModeSchema = z.enum(["webdav", "local"]).default("webdav");
export type StorageMode = z.infer<typeof StorageModeSchema>;

/** Local storage configuration. */
export const LocalStorageConfigSchema = z.object({
  /** Absolute path to the TavernOS root folder, e.g. "D:\\TavernOS" or "/data/TavernOS". */
  path: z.string().default(""),
});
export type LocalStorageConfig = z.infer<typeof LocalStorageConfigSchema>;

/** Result of a storage connection test. */
export interface StorageTestResult {
  readonly ok: boolean;
  readonly message: string;
}

/**
 * Unified storage client interface — implemented by both WebDAVClient and LocalStorageClient.
 * All paths are relative to the storage root (basePath for WebDAV, rootPath for Local).
 */
export interface StorageClient {
  /** Test connectivity / writability. */
  testConnection(): Promise<StorageTestResult>;
  /** Recursively ensure a folder exists (relative to root). */
  ensureFolder(relativePath: string): Promise<void>;
  /** Upload a file (relative to root). Returns the public URL of the file. */
  uploadFile(relativePath: string, data: Buffer, contentType: string): Promise<string>;
  /** Delete a file or folder (relative to root). No error if it doesn't exist. */
  deletePath(relativePath: string): Promise<void>;
  /** Resolve the full public URL for a path (relative to root). */
  getPublicUrl(relativePath: string): string;
  /** Download a file and return its buffer (relative to root). */
  downloadFile(relativePath: string): Promise<Buffer>;
  /** Whether the config has the minimum fields populated. */
  readonly configured: boolean;
  /** The storage mode. */
  readonly mode: StorageMode;
}

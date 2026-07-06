// packages/core/src/extensions/loggers.ts
// Logger factories and registry configuration for the extension system.
//
// These are pure utilities with no dependency on the registry's internal
// state, so they are isolated in their own module for reuse and testability.

import type { ExtensionLogger } from "./types.js";

// ---------------------------------------------------------------------------
// Default loggers
// ---------------------------------------------------------------------------

/**
 * Create a simple logger that writes to console methods.
 * Used as the default when no custom logger is supplied.
 */
export function createConsoleLogger(prefix = "[extension]"): ExtensionLogger {
  return {
    info: (msg: string) => console.error(`${prefix} INFO: ${msg}`),
    warn: (msg: string) => console.error(`${prefix} WARN: ${msg}`),
    error: (msg: string) => console.error(`${prefix} ERROR: ${msg}`),
  };
}

/**
 * Create a silent logger that discards all output.
 * Useful in tests or when extensions should run quietly.
 */
export function createSilentLogger(): ExtensionLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

// ---------------------------------------------------------------------------
// Registry configuration
// ---------------------------------------------------------------------------

export interface RegistryConfig {
  /** Default project root used when creating contexts. */
  readonly projectRoot?: string;
  /** Default logger for extension contexts. */
  readonly logger?: ExtensionLogger;
  /** Default configuration passed to extension contexts. */
  readonly defaultConfig?: Readonly<Record<string, unknown>>;
}

import type { ExtensionLogger } from "./types.js";
/**
 * Create a simple logger that writes to console methods.
 * Used as the default when no custom logger is supplied.
 */
export declare function createConsoleLogger(prefix?: string): ExtensionLogger;
/**
 * Create a silent logger that discards all output.
 * Useful in tests or when extensions should run quietly.
 */
export declare function createSilentLogger(): ExtensionLogger;
export interface RegistryConfig {
    /** Default project root used when creating contexts. */
    readonly projectRoot?: string;
    /** Default logger for extension contexts. */
    readonly logger?: ExtensionLogger;
    /** Default configuration passed to extension contexts. */
    readonly defaultConfig?: Readonly<Record<string, unknown>>;
}
//# sourceMappingURL=loggers.d.ts.map
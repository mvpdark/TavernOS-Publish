// packages/core/src/extensions/loggers.ts
// Logger factories and registry configuration for the extension system.
//
// These are pure utilities with no dependency on the registry's internal
// state, so they are isolated in their own module for reuse and testability.
// ---------------------------------------------------------------------------
// Default loggers
// ---------------------------------------------------------------------------
/**
 * Create a simple logger that writes to console methods.
 * Used as the default when no custom logger is supplied.
 */
export function createConsoleLogger(prefix = "[extension]") {
    return {
        info: (msg) => console.error(`${prefix} INFO: ${msg}`),
        warn: (msg) => console.error(`${prefix} WARN: ${msg}`),
        error: (msg) => console.error(`${prefix} ERROR: ${msg}`),
    };
}
/**
 * Create a silent logger that discards all output.
 * Useful in tests or when extensions should run quietly.
 */
export function createSilentLogger() {
    return {
        info: () => { },
        warn: () => { },
        error: () => { },
    };
}
//# sourceMappingURL=loggers.js.map
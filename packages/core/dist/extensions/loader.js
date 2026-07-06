// packages/core/src/extensions/loader.ts
// Extension loader — validates and loads extensions from plain objects
// or dynamically imported modules.  Manifest validation uses Zod; the
// remaining structural checks are performed manually since functions
// cannot be fully expressed in a Zod schema.
import { ExtensionManifestSchema } from "./types.js";
// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
/** All valid pipeline phase strings, used for structural validation. */
const VALID_PHASES = new Set([
    "before-architect",
    "after-architect",
    "before-writer",
    "after-writer",
    "before-audit",
    "after-audit",
    "before-revise",
    "after-revise",
]);
/**
 * Validate that a value is a function or undefined.
 * @returns true if the value is undefined or a function.
 */
function isOptionalFunction(val) {
    return val === undefined || typeof val === "function";
}
/**
 * Structurally validate the non-manifest fields of an extension object.
 * Returns an error string if invalid, or null if valid.
 */
function validateExtensionStructure(obj) {
    // activate — optional function
    if (!isOptionalFunction(obj.activate)) {
        return "Extension 'activate' must be a function if present";
    }
    // deactivate — optional function
    if (!isOptionalFunction(obj.deactivate)) {
        return "Extension 'deactivate' must be a function if present";
    }
    // pipelineHooks — optional object of phase → function
    if (obj.pipelineHooks !== undefined) {
        if (typeof obj.pipelineHooks !== "object" || obj.pipelineHooks === null) {
            return "Extension 'pipelineHooks' must be an object if present";
        }
        const hooks = obj.pipelineHooks;
        for (const [phase, fn] of Object.entries(hooks)) {
            if (!VALID_PHASES.has(phase)) {
                return `Extension 'pipelineHooks' has unknown phase: "${phase}"`;
            }
            if (typeof fn !== "function") {
                return `Extension 'pipelineHooks.${phase}' must be a function`;
            }
        }
    }
    // narrativeProcessors — optional array of { name, priority, process }
    if (obj.narrativeProcessors !== undefined) {
        if (!Array.isArray(obj.narrativeProcessors)) {
            return "Extension 'narrativeProcessors' must be an array if present";
        }
        for (let i = 0; i < obj.narrativeProcessors.length; i++) {
            const np = obj.narrativeProcessors[i];
            if (typeof np !== "object" || np === null) {
                return `Extension 'narrativeProcessors[${i}]' must be an object`;
            }
            if (typeof np.name !== "string" || np.name.length === 0) {
                return `Extension 'narrativeProcessors[${i}].name' must be a non-empty string`;
            }
            if (typeof np.priority !== "number") {
                return `Extension 'narrativeProcessors[${i}].priority' must be a number`;
            }
            if (typeof np.process !== "function") {
                return `Extension 'narrativeProcessors[${i}].process' must be a function`;
            }
        }
    }
    return null;
}
// ---------------------------------------------------------------------------
// Public loader API
// ---------------------------------------------------------------------------
/**
 * Validate a plain object as an extension.
 *
 * Performs two-stage validation:
 *  1. Zod validation of the manifest (name, version, description, capabilities).
 *  2. Structural validation of lifecycle methods, pipeline hooks, and narrative processors.
 *
 * @returns An ExtensionLoadResult with success=true and the extension, or
 *          success=false and an error message.
 */
export function loadExtensionFromObject(obj) {
    if (typeof obj !== "object" || obj === null) {
        return { success: false, error: "Extension must be a non-null object" };
    }
    const record = obj;
    // Stage 1: manifest validation via Zod.
    if (typeof record.manifest !== "object" || record.manifest === null) {
        return { success: false, error: "Extension 'manifest' must be a non-null object" };
    }
    const manifestResult = ExtensionManifestSchema.safeParse(record.manifest);
    if (!manifestResult.success) {
        const issues = manifestResult.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
        return { success: false, error: `Manifest validation failed: ${issues}` };
    }
    // Stage 2: structural validation of remaining fields.
    const structError = validateExtensionStructure(record);
    if (structError) {
        return { success: false, error: structError };
    }
    // All checks passed — cast to Extension (the manifest is now validated).
    return { success: true, extension: obj };
}
/**
 * Load an extension from a dynamically imported ES module.
 *
 * The module must export an `extension` named export (or a default export
 * that is an Extension object).  This enables loading extensions from
 * file paths at runtime.
 *
 * @param modulePath  File path or module specifier to import.
 * @returns An ExtensionLoadResult.
 *
 * @example
 * ```ts
 * const result = await loadExtensionFromModule("./extensions/my-ext/index.js");
 * if (result.success) {
 *   registry.register(result.extension);
 * }
 * ```
 */
export async function loadExtensionFromModule(modulePath) {
    let mod;
    try {
        // Dynamic import — works with ESM and CommonJS interop.
        mod = (await import(modulePath));
    }
    catch (err) {
        return {
            success: false,
            error: `Failed to import module "${modulePath}": ${err instanceof Error ? err.message : String(err)}`,
        };
    }
    // Prefer named export "extension", fall back to default export.
    const candidate = mod.extension ?? mod.default;
    if (candidate === undefined) {
        return {
            success: false,
            error: `Module "${modulePath}" must export an "extension" named export or a default export`,
        };
    }
    return loadExtensionFromObject(candidate);
}
/**
 * Convenience: validate an extension object and return a human-readable
 * error message, or null if valid.  Useful for pre-flight checks.
 */
export function validateExtension(obj) {
    const result = loadExtensionFromObject(obj);
    return result.success ? null : result.error ?? "Unknown validation error";
}
//# sourceMappingURL=loader.js.map
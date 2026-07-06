import { z } from "zod";
/**
 * Declares what an extension provides.  The registry uses this to filter
 * extensions when querying by capability.
 */
export type ExtensionCapability = "pipeline-hook" | "narrative-processor" | "custom-agent" | "lorebook-source" | "export-format";
export declare const ExtensionCapabilitySchema: z.ZodEnum<["pipeline-hook", "narrative-processor", "custom-agent", "lorebook-source", "export-format"]>;
/**
 * Metadata describing an extension.  Validated at registration time
 * via {@link ExtensionManifestSchema}.
 */
export interface ExtensionManifest {
    /** Globally unique identifier, e.g. "com.example.my-extension". */
    readonly name: string;
    /** Semantic version string, e.g. "1.0.0". */
    readonly version: string;
    /** Short human-readable description. */
    readonly description: string;
    /** Optional author / organization name. */
    readonly author?: string;
    /** Minimum TavernOS core version required (semver). */
    readonly minCoreVersion?: string;
    /** List of capabilities this extension declares. */
    readonly capabilities: readonly ExtensionCapability[];
}
export declare const ExtensionManifestSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    minCoreVersion: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodArray<z.ZodEnum<["pipeline-hook", "narrative-processor", "custom-agent", "lorebook-source", "export-format"]>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    description: string;
    capabilities: ("pipeline-hook" | "narrative-processor" | "custom-agent" | "lorebook-source" | "export-format")[];
    author?: string | undefined;
    minCoreVersion?: string | undefined;
}, {
    name: string;
    version: string;
    description: string;
    capabilities: ("pipeline-hook" | "narrative-processor" | "custom-agent" | "lorebook-source" | "export-format")[];
    author?: string | undefined;
    minCoreVersion?: string | undefined;
}>;
/**
 * Minimal logging surface passed to extension hooks.
 * Implementations may route to stderr, a file, or an in-memory buffer.
 */
export interface ExtensionLogger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
/**
 * Immutable context object supplied to every extension hook and lifecycle
 * method.  Extensions read configuration and project state from here.
 */
export interface ExtensionContext {
    /** Absolute path to the project root directory. */
    readonly projectRoot: string;
    /** Extension-specific configuration (validated by the extension itself). */
    readonly config: Readonly<Record<string, unknown>>;
    /** Logger instance for diagnostic output. */
    readonly logger: ExtensionLogger;
}
/**
 * Identifies a point in the multi-agent pipeline where extensions can
 * intercept and transform data.
 *
 * - `before-*` hooks receive the input to a stage and may return a
 *   modified copy.
 * - `after-*` hooks receive the output of a stage and may return a
 *   modified copy.
 */
export type PipelinePhase = "before-architect" | "after-architect" | "before-writer" | "after-writer" | "before-audit" | "after-audit" | "before-revise" | "after-revise";
/**
 * A pipeline hook function.  Receives the current phase data and the
 * extension context, returns (possibly modified) data of the same type.
 *
 * Hooks are async-capable — returning a Promise is supported.
 */
export type PipelineHookFn<T = unknown> = (data: T, ctx: ExtensionContext) => T | Promise<T>;
/**
 * A single registered pipeline hook with its owning extension name and
 * execution priority.  Lower priority numbers run first.
 */
export interface PipelineHookEntry<T = unknown> {
    /** Name of the extension that registered this hook. */
    readonly extensionName: string;
    /** The pipeline phase this hook fires on. */
    readonly phase: PipelinePhase;
    /** The hook function. */
    readonly fn: PipelineHookFn<T>;
    /** Execution order within the same phase (lower = earlier). */
    readonly priority: number;
}
/**
 * A text post-processor that transforms narrative output after the writer
 * agent produces text.  Multiple processors are chained in priority order.
 */
export interface NarrativeProcessor {
    /** Unique name within the extension. */
    readonly name: string;
    /** Execution order (lower = earlier in the chain). */
    readonly priority: number;
    /** Transform function — receives text, returns processed text. */
    readonly process: (text: string, ctx: ExtensionContext) => string | Promise<string>;
}
/**
 * The main extension contract.  An extension is a plain object (no class
 * inheritance required) that provides a manifest and optionally implements
 * lifecycle methods, pipeline hooks, and narrative processors.
 *
 * This mirrors the compose-pattern used by agents and the style detector —
 * extensions are data + functions, not class hierarchies.
 */
export interface Extension {
    /** Validated metadata. */
    readonly manifest: ExtensionManifest;
    /** Called when the extension is activated.  Receives the context. */
    readonly activate?: (ctx: ExtensionContext) => void | Promise<void>;
    /** Called when the extension is deactivated.  Cleanup goes here. */
    readonly deactivate?: () => void | Promise<void>;
    /** Pipeline hooks keyed by phase. */
    readonly pipelineHooks?: Readonly<Partial<Record<PipelinePhase, PipelineHookFn>>>;
    /** Narrative post-processors provided by this extension. */
    readonly narrativeProcessors?: readonly NarrativeProcessor[];
}
/**
 * An extension that has been registered with the registry, along with its
 * activation state.
 */
export interface RegisteredExtension {
    /** Same as manifest.name. */
    readonly id: string;
    /** The extension object. */
    readonly extension: Extension;
    /** Whether activate() has been called (and deactivate() has not). */
    readonly active: boolean;
}
/**
 * Result of attempting to load and validate an extension from an
 * arbitrary source (object, module, file).
 */
export interface ExtensionLoadResult {
    readonly success: boolean;
    readonly extension?: Extension;
    readonly error?: string;
}
//# sourceMappingURL=types.d.ts.map
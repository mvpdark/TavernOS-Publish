// packages/core/src/extensions/index.ts
// Extension system — skeleton interfaces, registry, and loader for
// third-party TavernOS extensions.
//
// Extensions are plain objects (no class hierarchy) that provide a manifest,
// optional lifecycle hooks, pipeline interceptors, and narrative processors.
// The registry manages activation state and ordered hook execution.

// Types and Zod schemas
export type {
  ExtensionCapability,
  ExtensionManifest,
  ExtensionLogger,
  ExtensionContext,
  PipelinePhase,
  PipelineHookFn,
  PipelineHookEntry,
  NarrativeProcessor,
  Extension,
  RegisteredExtension,
  ExtensionLoadResult,
} from "./types.js";

export {
  ExtensionCapabilitySchema,
  ExtensionManifestSchema,
} from "./types.js";

// Loggers and registry config (pure utilities)
export {
  createConsoleLogger,
  createSilentLogger,
  type RegistryConfig,
} from "./loggers.js";

// Registry (factory + type)
export {
  createExtensionRegistry,
  type ExtensionRegistry,
} from "./registry.js";

// Hook helpers (pure collection + execution)
export {
  collectPipelineHooks,
  collectActiveProcessors,
  executePipelineHooks,
  executeNarrativeProcessors,
  type NamedNarrativeProcessor,
} from "./hooks.js";

// Loader
export {
  loadExtensionFromObject,
  loadExtensionFromModule,
  validateExtension,
} from "./loader.js";

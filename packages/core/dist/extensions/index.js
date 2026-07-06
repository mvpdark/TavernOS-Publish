// packages/core/src/extensions/index.ts
// Extension system — skeleton interfaces, registry, and loader for
// third-party TavernOS extensions.
//
// Extensions are plain objects (no class hierarchy) that provide a manifest,
// optional lifecycle hooks, pipeline interceptors, and narrative processors.
// The registry manages activation state and ordered hook execution.
export { ExtensionCapabilitySchema, ExtensionManifestSchema, } from "./types.js";
// Loggers and registry config (pure utilities)
export { createConsoleLogger, createSilentLogger, } from "./loggers.js";
// Registry (factory + type)
export { createExtensionRegistry, } from "./registry.js";
// Hook helpers (pure collection + execution)
export { collectPipelineHooks, collectActiveProcessors, executePipelineHooks, executeNarrativeProcessors, } from "./hooks.js";
// Loader
export { loadExtensionFromObject, loadExtensionFromModule, validateExtension, } from "./loader.js";
//# sourceMappingURL=index.js.map
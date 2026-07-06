export type { ExtensionCapability, ExtensionManifest, ExtensionLogger, ExtensionContext, PipelinePhase, PipelineHookFn, PipelineHookEntry, NarrativeProcessor, Extension, RegisteredExtension, ExtensionLoadResult, } from "./types.js";
export { ExtensionCapabilitySchema, ExtensionManifestSchema, } from "./types.js";
export { createConsoleLogger, createSilentLogger, type RegistryConfig, } from "./loggers.js";
export { createExtensionRegistry, type ExtensionRegistry, } from "./registry.js";
export { collectPipelineHooks, collectActiveProcessors, executePipelineHooks, executeNarrativeProcessors, type NamedNarrativeProcessor, } from "./hooks.js";
export { loadExtensionFromObject, loadExtensionFromModule, validateExtension, } from "./loader.js";
//# sourceMappingURL=index.d.ts.map
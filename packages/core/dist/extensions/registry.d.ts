import type { Extension, ExtensionContext, PipelineHookEntry, PipelinePhase, ExtensionCapability, RegisteredExtension } from "./types.js";
import { type RegistryConfig } from "./loggers.js";
import { type NamedNarrativeProcessor } from "./hooks.js";
/**
 * Factory: create an extension registry.  Validates and stores extensions,
 * tracks activation state, collects hooks/processors, and executes hooks
 * in priority order (threading data through each hook).
 */
export declare function createExtensionRegistry(config?: RegistryConfig): {
    register: (extension: Extension) => boolean;
    unregister: (name: string) => Promise<void>;
    activate: (name: string) => Promise<boolean>;
    deactivate: (name: string) => Promise<boolean>;
    get: (name: string) => RegisteredExtension | undefined;
    has: (name: string) => boolean;
    list: () => readonly RegisteredExtension[];
    listActive: () => readonly RegisteredExtension[];
    listByCapability: (capability: ExtensionCapability, activeOnly?: boolean) => readonly RegisteredExtension[];
    createContext: (extConfig?: Readonly<Record<string, unknown>>) => ExtensionContext;
    runPipelineHook: <T>(phase: PipelinePhase, data: T, ctx: ExtensionContext) => Promise<T>;
    runNarrativeProcessors: (text: string, ctx: ExtensionContext) => Promise<string>;
    collectHooks: (phase: PipelinePhase) => PipelineHookEntry[];
    collectNarrativeProcessors: () => NamedNarrativeProcessor[];
};
/**
 * The return type of createExtensionRegistry — the public surface of
 * the extension registry.  Exported for type annotations.
 */
export type ExtensionRegistry = ReturnType<typeof createExtensionRegistry>;
//# sourceMappingURL=registry.d.ts.map
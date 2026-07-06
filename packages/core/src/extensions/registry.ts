// packages/core/src/extensions/registry.ts
// Extension registry — manages extension lifecycle (register / activate /
// deactivate / unregister) and provides ordered hook execution for pipeline
// phases and narrative post-processors.
//
// Logger utilities live in ./loggers.ts; hook collection and execution
// helpers live in ./hooks.ts (both pure, parameterized modules).

import type {
  Extension,
  ExtensionContext,
  ExtensionLogger,
  PipelineHookEntry,
  PipelinePhase,
  ExtensionCapability,
  RegisteredExtension,
} from "./types.js";
import {
  createConsoleLogger,
  type RegistryConfig,
} from "./loggers.js";
import {
  collectPipelineHooks,
  collectActiveProcessors,
  executePipelineHooks,
  executeNarrativeProcessors,
  type NamedNarrativeProcessor,
} from "./hooks.js";

// ---------------------------------------------------------------------------
// Registry factory
// ---------------------------------------------------------------------------

/**
 * Factory: create an extension registry.  Validates and stores extensions,
 * tracks activation state, collects hooks/processors, and executes hooks
 * in priority order (threading data through each hook).
 */
export function createExtensionRegistry(config?: RegistryConfig) {
  const extensions = new Map<string, RegisteredExtension>();
  const logger: ExtensionLogger = config?.logger ?? createConsoleLogger();

  /** Create an ExtensionContext, merging default + per-extension config. */
  function createContext(
    extConfig?: Readonly<Record<string, unknown>>,
  ): ExtensionContext {
    return {
      projectRoot: config?.projectRoot ?? process.cwd(),
      config: { ...config?.defaultConfig, ...extConfig },
      logger,
    };
  }

  // --- Registration ---

  /**
   * Register an extension (duplicate names rejected).  Starts inactive —
   * call activate() separately to trigger its lifecycle hook.
   * @returns true if registration succeeded, false if the name is taken.
   */
  function register(extension: Extension): boolean {
    const name = extension.manifest.name;

    if (extensions.has(name)) {
      logger.warn(`Extension "${name}" is already registered`);
      return false;
    }

    extensions.set(name, {
      id: name,
      extension,
      active: false,
    });
    return true;
  }

  /**
   * Remove an extension from the registry.  Calls deactivate() first
   * if the extension is currently active.
   */
  async function unregister(name: string): Promise<void> {
    const entry = extensions.get(name);
    if (!entry) return;

    if (entry.active) {
      await deactivate(name);
    }

    extensions.delete(name);
  }

  // --- Lifecycle ---

  /**
   * Activate a registered extension.  Calls activate() hook (if present)
   * with a fresh context.  No-op if already active.
   */
  async function activate(name: string): Promise<boolean> {
    const entry = extensions.get(name);
    if (!entry) {
      logger.warn(`Cannot activate unknown extension: "${name}"`);
      return false;
    }
    if (entry.active) return true;

    const ctx = createContext();
    try {
      if (entry.extension.activate) {
        await entry.extension.activate(ctx);
      }
      // Update the entry to active.
      extensions.set(name, { ...entry, active: true });
      return true;
    } catch (err) {
      logger.error(
        `Failed to activate extension "${name}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * Deactivate an active extension.  Calls deactivate() (if present).
   * No-op if not active.
   */
  async function deactivate(name: string): Promise<boolean> {
    const entry = extensions.get(name);
    if (!entry) return false;
    if (!entry.active) return true;

    try {
      if (entry.extension.deactivate) {
        await entry.extension.deactivate();
      }
      extensions.set(name, { ...entry, active: false });
      return true;
    } catch (err) {
      logger.error(
        `Failed to deactivate extension "${name}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  // --- Querying ---

  /** Get a registered extension by name. */
  function get(name: string): RegisteredExtension | undefined {
    return extensions.get(name);
  }

  /** Check if an extension is registered. */
  function has(name: string): boolean {
    return extensions.has(name);
  }

  /** List all registered extensions (active and inactive). */
  function list(): readonly RegisteredExtension[] {
    return Array.from(extensions.values());
  }

  /** List only active extensions. */
  function listActive(): readonly RegisteredExtension[] {
    return Array.from(extensions.values()).filter((e) => e.active);
  }

  /**
   * List extensions that declare a specific capability.
   * Optionally filter to active-only.
   */
  function listByCapability(
    capability: ExtensionCapability,
    activeOnly = false,
  ): readonly RegisteredExtension[] {
    return Array.from(extensions.values()).filter(
      (e) =>
        e.extension.manifest.capabilities.includes(capability) &&
        (!activeOnly || e.active),
    );
  }

  // --- Hook collection (delegated to ./hooks.ts) ---

  /** Collect pipeline hooks for a phase (sorted by priority, ascending). */
  function collectHooks(phase: PipelinePhase): PipelineHookEntry[] {
    return collectPipelineHooks(extensions, phase);
  }

  /** Collect narrative processors from active extensions (sorted by priority). */
  function collectNarrativeProcessors(): NamedNarrativeProcessor[] {
    return collectActiveProcessors(extensions);
  }

  // --- Hook execution (delegated to ./hooks.ts) ---

  /**
   * Run all hooks for a phase sequentially in priority order, threading data
   * through each.  Returns original data unchanged if no hooks registered.
   */
  async function runPipelineHook<T>(
    phase: PipelinePhase,
    data: T,
    ctx: ExtensionContext,
  ): Promise<T> {
    const hooks = collectPipelineHooks(extensions, phase);
    if (hooks.length === 0) return data;
    return executePipelineHooks(hooks, data, ctx, logger);
  }

  /** Run all active narrative processors in priority order (chained). */
  async function runNarrativeProcessors(
    text: string,
    ctx: ExtensionContext,
  ): Promise<string> {
    const processors = collectActiveProcessors(extensions);
    if (processors.length === 0) return text;
    return executeNarrativeProcessors(processors, text, ctx, logger);
  }

  // --- Public API ---

  return {
    // Lifecycle
    register,
    unregister,
    activate,
    deactivate,
    // Querying
    get,
    has,
    list,
    listActive,
    listByCapability,
    // Context
    createContext,
    // Hook execution
    runPipelineHook,
    runNarrativeProcessors,
    // Introspection (for testing / debugging)
    collectHooks,
    collectNarrativeProcessors,
  };
}

/**
 * The return type of createExtensionRegistry — the public surface of
 * the extension registry.  Exported for type annotations.
 */
export type ExtensionRegistry = ReturnType<typeof createExtensionRegistry>;

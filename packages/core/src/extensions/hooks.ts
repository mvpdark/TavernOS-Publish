// packages/core/src/extensions/hooks.ts
// Pure helpers for collecting and executing pipeline hooks and narrative
// processors from a set of registered extensions.
//
// These functions take the extensions map (and a logger for error reporting)
// as parameters, keeping them side-effect-free and independently testable.
// The registry factory delegates to these helpers.

import type {
  ExtensionContext,
  ExtensionLogger,
  NarrativeProcessor,
  PipelineHookEntry,
  PipelineHookFn,
  PipelinePhase,
  RegisteredExtension,
} from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A narrative processor annotated with the name of the extension that
 * provided it.  Returned by {@link collectActiveProcessors}.
 */
export type NamedNarrativeProcessor = NarrativeProcessor & {
  readonly extensionName: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default priority assigned to pipeline hooks when none is specified. */
const DEFAULT_HOOK_PRIORITY = 100;

// ---------------------------------------------------------------------------
// Hook collection (pure)
// ---------------------------------------------------------------------------

/**
 * Collect all pipeline hooks for a given phase from active extensions.
 * Returns entries sorted by priority (ascending — lower runs first).
 *
 * Iteration order over the extensions map is preserved for equal priorities,
 * giving stable, insertion-ordered execution.
 */
export function collectPipelineHooks(
  extensions: Map<string, RegisteredExtension>,
  phase: PipelinePhase,
): PipelineHookEntry[] {
  const entries: PipelineHookEntry[] = [];

  for (const reg of extensions.values()) {
    if (!reg.active) continue;
    const hooks = reg.extension.pipelineHooks;
    if (!hooks) continue;

    const fn = hooks[phase];
    if (fn) {
      entries.push({
        extensionName: reg.id,
        phase,
        fn: fn as PipelineHookFn,
        priority: DEFAULT_HOOK_PRIORITY, // Default priority; could be extended per-hook.
      });
    }
  }

  // Sort by priority (stable for equal priorities — insertion order).
  entries.sort((a, b) => a.priority - b.priority);
  return entries;
}

/**
 * Collect all narrative processors from active extensions, sorted by
 * priority (ascending).
 */
export function collectActiveProcessors(
  extensions: Map<string, RegisteredExtension>,
): NamedNarrativeProcessor[] {
  const processors: NamedNarrativeProcessor[] = [];

  for (const reg of extensions.values()) {
    if (!reg.active) continue;
    const nps = reg.extension.narrativeProcessors;
    if (!nps) continue;

    for (const np of nps) {
      processors.push({ ...np, extensionName: reg.id });
    }
  }

  processors.sort((a, b) => a.priority - b.priority);
  return processors;
}

// ---------------------------------------------------------------------------
// Hook execution (pure — receives logger for error reporting)
// ---------------------------------------------------------------------------

/**
 * Run a sequence of pipeline hooks, threading data through each one.
 *
 * Hooks are executed sequentially in the provided order.  Each hook
 * receives the output of the previous hook (or the initial `data`
 * for the first hook), allowing chained transformation.
 *
 * If a hook throws, the error is logged and the chain continues with the
 * current (unchanged) data — a failing hook does not abort execution.
 */
export async function executePipelineHooks<T>(
  hooks: readonly PipelineHookEntry[],
  data: T,
  ctx: ExtensionContext,
  logger: ExtensionLogger,
): Promise<T> {
  let current = data;
  for (const entry of hooks) {
    try {
      const result = await entry.fn(current, ctx);
      current = result as T;
    } catch (err) {
      logger.error(
        `Hook from "${entry.extensionName}" on phase "${entry.phase}" threw: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Continue with current data — a failing hook does not abort the chain.
    }
  }

  return current;
}

/**
 * Run a sequence of narrative processors in priority order.
 *
 * Each processor receives the output of the previous one, forming a
 * processing chain.  If a processor throws, it is skipped (its input
 * is passed to the next processor) and the error is logged.
 */
export async function executeNarrativeProcessors(
  processors: readonly NamedNarrativeProcessor[],
  text: string,
  ctx: ExtensionContext,
  logger: ExtensionLogger,
): Promise<string> {
  let current = text;
  for (const proc of processors) {
    try {
      current = await proc.process(current, ctx);
    } catch (err) {
      logger.error(
        `Narrative processor "${proc.name}" from "${proc.extensionName}" threw: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Skip this processor — pass current text to the next one.
    }
  }

  return current;
}

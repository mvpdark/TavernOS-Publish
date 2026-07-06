import type { ExtensionContext, ExtensionLogger, NarrativeProcessor, PipelineHookEntry, PipelinePhase, RegisteredExtension } from "./types.js";
/**
 * A narrative processor annotated with the name of the extension that
 * provided it.  Returned by {@link collectActiveProcessors}.
 */
export type NamedNarrativeProcessor = NarrativeProcessor & {
    readonly extensionName: string;
};
/**
 * Collect all pipeline hooks for a given phase from active extensions.
 * Returns entries sorted by priority (ascending — lower runs first).
 *
 * Iteration order over the extensions map is preserved for equal priorities,
 * giving stable, insertion-ordered execution.
 */
export declare function collectPipelineHooks(extensions: Map<string, RegisteredExtension>, phase: PipelinePhase): PipelineHookEntry[];
/**
 * Collect all narrative processors from active extensions, sorted by
 * priority (ascending).
 */
export declare function collectActiveProcessors(extensions: Map<string, RegisteredExtension>): NamedNarrativeProcessor[];
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
export declare function executePipelineHooks<T>(hooks: readonly PipelineHookEntry[], data: T, ctx: ExtensionContext, logger: ExtensionLogger): Promise<T>;
/**
 * Run a sequence of narrative processors in priority order.
 *
 * Each processor receives the output of the previous one, forming a
 * processing chain.  If a processor throws, it is skipped (its input
 * is passed to the next processor) and the error is logged.
 */
export declare function executeNarrativeProcessors(processors: readonly NamedNarrativeProcessor[], text: string, ctx: ExtensionContext, logger: ExtensionLogger): Promise<string>;
//# sourceMappingURL=hooks.d.ts.map
/**
 * Reducer function: defines how to merge a partial update into current state.
 * For arrays, typically concat; for scalars, typically replace.
 */
export type ReducerFn<T> = (current: T, update: T) => T;
/**
 * Reducer map: per-key merge strategy.
 * Keys without a reducer use "replace" semantics.
 */
export type ReducerMap<S> = Partial<{
    [K in keyof S]: ReducerFn<S[K]>;
}>;
/**
 * Node function: takes the current state, performs work, and returns a
 * partial state update. Must be a pure async function (no side effects
 * beyond the returned update).
 *
 * The graph engine merges the returned partial into the full state using
 * the configured reducers.
 */
export type NodeFn<S> = (state: S) => Promise<Partial<S>>;
/**
 * Conditional edge router: inspects state and returns the name of the
 * next node to execute. Used for branching (e.g., reroll vs. proceed).
 */
export type RouterFn<S> = (state: S) => string;
/**
 * Mapping from router output values to node names.
 * If not provided, the router output IS the node name.
 */
export type RouteMap = Record<string, string>;
/** Entry point of the graph. */
export declare const START: "__start__";
/** Terminal node — execution stops here. */
export declare const END: "__end__";
/**
 * A compiled, ready-to-run graph instance.
 */
export interface CompiledGraph<S> {
    /**
     * Execute the graph from the given initial state.
     * Returns the final state after reaching END.
     */
    invoke(initialState: S): Promise<S>;
    /**
     * Execute the graph with a callback for state transitions
     * (useful for logging, debugging, SSE streaming).
     */
    invokeWithCallback(initialState: S, onStep?: (nodeName: string, state: S) => void): Promise<S>;
    /**
     * Get the graph topology as an adjacency list (for visualization).
     */
    getTopology(): GraphTopology;
}
/**
 * Graph topology for visualization.
 */
export interface GraphTopology {
    nodes: string[];
    edges: Array<{
        from: string;
        to: string;
        conditional?: boolean;
    }>;
}
//# sourceMappingURL=types.d.ts.map
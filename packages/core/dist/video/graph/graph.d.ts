import type { NodeFn, ReducerMap, RouterFn, RouteMap, CompiledGraph } from "./types.js";
export declare class StateGraph<S extends object> {
    private readonly nodes;
    private readonly edges;
    private readonly conditionalEdges;
    private readonly reducers;
    private maxIterations;
    constructor(reducers?: ReducerMap<S>);
    /** Set the maximum number of node executions (safety against infinite loops). */
    setMaxIterations(n: number): this;
    /** Register a named node with its execution function. */
    addNode(name: string, fn: NodeFn<S>): this;
    /** Add a direct edge: after `from` completes, execute `to`. */
    addEdge(from: string, to: string): this;
    /** Set the entry point: START → node. */
    addEdgeFromStart(node: string): this;
    /** Set the exit point: node → END. */
    addEdgeToEnd(node: string): this;
    /**
     * Add a conditional edge: after `from` completes, call `router(state)`
     * to determine the next node. If `mapping` is provided, the router output
     * is mapped to a node name; otherwise the output IS the node name.
     */
    addConditionalEdges(from: string, router: RouterFn<S>, mapping?: RouteMap): this;
    /** Compile the graph into a runnable instance. */
    compile(): CompiledGraph<S>;
}
//# sourceMappingURL=graph.d.ts.map
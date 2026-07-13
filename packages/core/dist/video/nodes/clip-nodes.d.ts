import type { ClipPipelineState } from "../graph/state.js";
import type { NodeFn } from "../graph/types.js";
export declare const promptEnhanceNode: NodeFn<ClipPipelineState>;
export declare const generateNode: NodeFn<ClipPipelineState>;
export declare const downloadNode: NodeFn<ClipPipelineState>;
export declare const frameCheckNode: NodeFn<ClipPipelineState>;
export declare const reviewNode: NodeFn<ClipPipelineState>;
/**
 * Router function after review node.
 * Returns "reroll", "pass", or "fail" based on review result and attempt count.
 */
export declare function rerollRouter(state: ClipPipelineState): string;
export declare const rerollNode: NodeFn<ClipPipelineState>;
export declare const postProcessNode: NodeFn<ClipPipelineState>;
/**
 * Router function after generate node.
 * Returns "ok", "retry", or "fail" based on generation result.
 */
export declare function genRouter(state: ClipPipelineState): string;
export declare const failNode: NodeFn<ClipPipelineState>;
//# sourceMappingURL=clip-nodes.d.ts.map
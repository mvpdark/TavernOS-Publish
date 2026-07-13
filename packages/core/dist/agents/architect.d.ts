import { type AgentContext, type AgentChatOptions } from "./base.js";
import { parseSections } from "./json-utils.js";
export { parseSections };
export interface ArchitectOutput {
    premise: string;
    world: string;
    characters: string;
    plot: string;
    hooks: string;
}
/** Outline planner agent produced by the factory (compose pattern). */
export interface OutlinePlanner {
    readonly name: string;
    generate(input: {
        title: string;
        genre: string;
        language: string;
        additionalRequirements?: string;
    }, options?: AgentChatOptions): Promise<ArchitectOutput>;
}
/**
 * Factory: build an OutlineConductor agent by composing a shared runtime.
 * Replaces the former `class OutlinePlanner extends BaseAgent`.
 */
export declare function createOutlinePlanner(ctx: AgentContext): OutlinePlanner;
//# sourceMappingURL=architect.d.ts.map
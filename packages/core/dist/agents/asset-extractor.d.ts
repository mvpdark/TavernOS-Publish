import { type AssetCatalog, type AssetExtractionResult } from "../assets/types.js";
import { type AgentContext, type AgentChatOptions } from "./base.js";
/** Input for asset extraction. */
export interface AssetExtractorInput {
    /** The finalized chapter content (revised narrative if available, else narrative). */
    chapterContent: string;
    /** 1-based chapter number. */
    chapter: number;
    /** Existing catalog (from prior chapters). When provided, the LLM is told
     *  to mark entries as new or updates to existing assets. */
    existingCatalog?: AssetCatalog;
}
/** Asset extractor agent produced by the factory (compose pattern). */
export interface AssetExtractor {
    readonly name: string;
    extract(input: AssetExtractorInput, options?: AgentChatOptions): Promise<AssetExtractionResult>;
}
/**
 * Factory: build an AssetExtractor agent by composing a shared runtime.
 *
 * The agent sends chapter content to the LLM with an inline prompt asking
 * it to extract characters (with aliases, appearance, personality), scenes
 * (with features), and props (with attributes). When an existingCatalog is
 * provided, the prompt includes the current asset list so the LLM can mark
 * entries as new additions or updates to existing assets.
 *
 * The LLM response is parsed with a 4-level fallback strategy (same as
 * StateExtractor). On total failure, an empty catalog is returned.
 */
export declare function createAssetExtractor(ctx: AgentContext): AssetExtractor;
//# sourceMappingURL=asset-extractor.d.ts.map
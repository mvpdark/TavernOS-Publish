import { type Asset, type AssetCatalog, type AssetExtractionResult } from "../assets/types.js";
import { type AgentContext, type AgentChatOptions } from "./base.js";
/** Input for asset extraction. */
export interface AssetExtractorInput {
    chapterContent: string;
    chapter: number;
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
 * Uses roster-driven extraction (Phase 1 system scan + Phase 2 LLM for new
 * assets only) when an existing catalog is provided. Falls back to full
 * extraction when no catalog is given (first chapter).
 */
export declare function createAssetExtractor(ctx: AgentContext): AssetExtractor;
/**
 * Scan chapter text for mentions of assets from the existing catalog.
 *
 * Phase 1 does NOT increment appearanceCount — it keeps the original value.
 * The caller's mergeCatalog will handle the +1 when merging Phase 1 results
 * back into the existing catalog. This avoids double-increment when a Phase 2
 * variant also matches the same existing asset.
 *
 * Phase 1 also keeps the original description, so mergeAsset (which takes
 * non-empty new descriptions over old ones) will simply "update" with the
 * same value — a no-op.
 */
/** @internal — exported for unit testing */
export declare function scanRoster(catalog: AssetCatalog, text: string, chapter: number): Asset[];
/**
 * Check if a name appears in text.
 *
 * For 1-char CJK names, uses full boundary check (both sides) to avoid
 * false positives.
 *
 * For 2+ char names, iterates ALL occurrences. For each occurrence,
 * checks if a LONGER known name from the catalog starts at the same
 * position — if so, this occurrence is skipped (the longer name is
 * being referenced, not the shorter one). This correctly handles:
 *   - "李明远走了" (when "李明远" is in catalog) → skip "李明", it's "李明远"
 *   - "李明说道" → no longer name at this position → valid match
 *   - "李明走了" → no longer name at this position → valid match
 *
 * If no longer name is known, false positives (matching "李明" inside
 * "李明远" when "李明远" is NOT in the catalog) are acceptable —
 * Phase 2 will extract "李明远" as a new asset, and the isMatch-based
 * normalization will prevent double-counting.
 */
/** @internal — exported for unit testing */
export declare function containsName(text: string, name: string, allNames: string[]): boolean;
/**
 * Merge Phase 1 (known assets) with Phase 2 (LLM new assets).
 *
 * Phase 1 assets go directly into the result. Phase 2 assets are assumed
 * to already be normalized by the caller, then filtered against Phase 1
 * using the full isMatch logic to remove variants (e.g. "小李" matching
 * Phase 1's "李明"). This prevents the caller's mergeCatalog from
 * double-incrementing appearanceCount.
 */
/** @internal — exported for unit testing */
export declare function mergePhaseResults(phase1: Asset[], phase2: AssetCatalog): AssetCatalog;
//# sourceMappingURL=asset-extractor.d.ts.map
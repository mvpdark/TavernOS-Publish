// packages/core/src/agents/asset-extractor.ts
//
// Asset extraction agent — extracts characters, scenes, and props from
// finalized chapter content after the audit + revision cycle completes.
//
// ── Roster-Driven Extraction (Phase 1 + Phase 2) ──
//
//   Phase 1 (system-level, 0 tokens):
//     Scan the chapter text for mentions of names/aliases from the existing
//     catalog. Each match is recorded as a "known appearance" — the asset's
//     ID is reused deterministically.
//
//   Phase 2 (LLM, only new assets):
//     Tell the LLM which assets have already been identified (so it does NOT
//     re-extract them) and ask it to extract ONLY new assets.
//
// The two phases are merged and deduplicated via normalizeCatalog before
// returning. The caller's mergeCatalog handles the final appearanceCount +1.

import type { LLMMessage } from "../llm/types.js";
import {
  AssetCatalogSchema,
  emptyCatalog,
  type Asset,
  type AssetCatalog,
  type AssetExtractionResult,
  type AssetKind,
} from "../assets/types.js";
import { AssetCatalogManager } from "../assets/catalog.js";
import { createAgentRuntime, type AgentContext, type AgentChatOptions } from "./base.js";
import { parseAndValidate } from "./json-utils.js";

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
export function createAssetExtractor(ctx: AgentContext): AssetExtractor {
  const runtime = createAgentRuntime(ctx);
  const name = "asset-extractor";

  async function extract(input: AssetExtractorInput, options?: AgentChatOptions): Promise<AssetExtractionResult> {
    // ── Phase 1: Roster scan (0 tokens) ──
    let knownAssets: Asset[] = [];
    if (input.existingCatalog) {
      knownAssets = scanRoster(input.existingCatalog, input.chapterContent, input.chapter);
    }

    // ── Phase 2: LLM extraction (new assets only) ──
    const systemContent =
      "你是一个创意写作平台的资产提取代理。\n" +
      "你的任务是从章节内容中提取**新的**资产（角色、场景、道具）。\n" +
      "只输出合法的 JSON，不要输出 Markdown 代码块或解释文字。\n\n" +
      "JSON 格式如下：\n" +
      '{\n  "characters": [{ "id": "...", "kind": "character", "name": "...", "aliases": [...], "description": "...", "firstChapter": N, "lastChapter": N, "attributes": { ... }, "appearanceCount": 1 }],\n' +
      '  "scenes": [{ ... same shape, kind: "scene" ... }],\n' +
      '  "props": [{ ... same shape, kind: "prop" ... }]\n' +
      "}\n\n" +
      "提取规则（仅限尚未登记的新资产）：\n" +
      "- 角色：提取每个有名人物，包括别名/昵称、外貌、性格和角色定位。\n" +
      "- 场景：提取不同的地点/环境及其描述特征。\n" +
      "- 道具：提取对剧情有重要作用的对象/物品及其属性。\n" +
      "- 每个资产必须有唯一的 'id'（使用名称的 slug，如 'protagonist-li-ming'）。\n" +
      "- 'firstChapter' 和 'lastChapter' 设为当前章节号。\n" +
      "- 'appearanceCount' 设为 1。\n" +
      "- 'attributes' 是扁平的键值对（如 {\"age\":\"25\",\"hair\":\"black\"}）。\n\n" +
      "角色描述硬约束：\n" +
      "- 每个角色至少包含 8 个具体细节点（面部、发型发色、肤质、服装、体态等）\n" +
      "- 不同角色至少 3 个字段不同（如发型、服装、肤色、体态、气质）\n" +
      "- 禁止套话：如「面部轮廓清晰」「可直接用于角色设定参考图」等\n" +
      "- 禁止把镜头术语当角色名：Pan/ECU/POV/OTS/Zoom 等\n" +
      "- 推荐使用格式骨架：\"全身视角，名叫[角色名]的[年龄段+性别]，[气质关键词]，[面部细节]，[发型发色细节]，[肤质细节]，身着[上身服装+材质]，[下身服装+材质]，脚穿[鞋履]，[体态或姿势特征]。\"\n\n" +
      "场景描述硬约束：\n" +
      "- 需包含空间结构、光线来源、环境质感、关键陈设\n\n" +
      "道具描述硬约束：\n" +
      "- 需包含形制、材质、纹理/磨损、功能特征";

    let userContent =
      `## 第 ${input.chapter} 章\n\n${input.chapterContent}\n\n` +
      `仅提取新资产（不包含已知列表中已有的），输出 JSON 对象。将 firstChapter 和 lastChapter 设为 ${input.chapter}。`;

    if (knownAssets.length > 0) {
      // Phase 1 found matches — tell LLM to skip them.
      const knownList = formatAssetList(knownAssets, false);
      userContent +=
        `\n\n## 已识别资产（请勿重复提取）\n${knownList}\n\n` +
        "重要：以上资产已由系统在本章中识别。请勿在输出中包含它们。" +
        "仅提取不在上述列表中的新资产。" +
        "如果本章所有资产均已识别，返回空目录：" +
        '{"characters":[],"scenes":[],"props":[]}';
    } else if (
      input.existingCatalog &&
      (input.existingCatalog.characters.length > 0 ||
        input.existingCatalog.scenes.length > 0 ||
        input.existingCatalog.props.length > 0)
    ) {
      // Phase 1 found no matches but we have an existing catalog — list
      // existing assets so the LLM knows what's already tracked and only
      // extracts NEW assets (same "new only" semantics as Phase 1 branch).
      const existingSummary = formatAssetList(
        [...input.existingCatalog.characters, ...input.existingCatalog.scenes, ...input.existingCatalog.props],
        true,
      );
      userContent +=
        `\n\n## 已有资产目录（来自前序章节）\n${existingSummary}\n\n` +
        "以上资产已被跟踪，请勿重复提取。" +
        "仅提取不在列表中的新资产，为其生成新 'id' 并将 'appearanceCount' 设为 1。" +
        "如果本章所有资产均在列表中，返回空目录：" +
        '{"characters":[],"scenes":[],"props":[]}';
    }

    const messages: LLMMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ];

    let rawResponse = "";
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    try {
      const response = await runtime.chat(messages, options);
      rawResponse = response.content;
      usage = response.usage;

      const llmCatalog = parseAndValidate(response.content, AssetCatalogSchema);
      if (llmCatalog !== null) {
        const dedupedLlm = AssetCatalogManager.normalizeCatalog(normalizeCatalogKinds(llmCatalog));
        // Merge Phase 1 + Phase 2, then normalizeCatalog to deduplicate
        // using the full isMatch logic (same as mergeCatalog).
        const merged = mergePhaseResults(knownAssets, dedupedLlm);
        return { catalog: merged, rawResponse, degraded: false, usage };
      }
    } catch (e) {
      return phase1Fallback(knownAssets, rawResponse, e, usage);
    }

    return phase1Fallback(knownAssets, rawResponse, undefined, usage);
  }

  return { name, extract };
}

// ---------------------------------------------------------------------------
// Phase 1: Roster scan — deterministic name/alias matching (0 tokens)
// ---------------------------------------------------------------------------

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
export function scanRoster(catalog: AssetCatalog, text: string, chapter: number): Asset[] {
  const results: Asset[] = [];

  const allAssets: Asset[] = [
    ...catalog.characters,
    ...catalog.scenes,
    ...catalog.props,
  ];

  // Build a list of all known names (canonical + aliases) for prefix checking.
  // This allows containsName to skip short-name matches that are actually
  // prefixes of longer known names (e.g. "李明" in "李明远" when both exist).
  const allNamesSet = new Set<string>();
  for (const asset of allAssets) {
    const trimmed = asset.name.trim();
    if (trimmed) allNamesSet.add(trimmed);
    for (const alias of asset.aliases) {
      const a = alias.trim();
      if (a) allNamesSet.add(a);
    }
  }
  const allNames = [...allNamesSet];

  for (const asset of allAssets) {
    // Collect all names to search for: canonical name + aliases.
    // Allow CJK single-char names (boundary check handles false positives),
    // but skip non-CJK single-char names (too many false positives like "a").
    const namesToSearch = [asset.name, ...asset.aliases].filter((n) => {
      const trimmed = n.trim();
      if (!trimmed) return false;
      if (trimmed.length >= 2) return true;
      // Single char: allow if CJK, skip otherwise
      return /[\u4e00-\u9fff]/.test(trimmed);
    });

    let found = false;
    for (const name of namesToSearch) {
      if (containsName(text, name, allNames)) {
        found = true;
        break;
      }
    }

    if (found) {
      // Update lastChapter to current chapter so mergeCatalog's Math.max
      // produces the correct value. Do NOT increment appearanceCount —
      // the caller's mergeCatalog handles that via mergeAsset (+1).
      // Keep original description so mergeAsset treats it as a no-op.
      results.push({ ...asset, lastChapter: chapter });
    }
  }

  return results;
}

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
export function containsName(text: string, name: string, allNames: string[]): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // For all name lengths: iterate all occurrences, checking each against
  // the catalog of known longer names. This unified approach avoids the
  // problem where 1-char CJK names with regex boundary checks fail in
  // Chinese text (which has no word separators).
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf(trimmed, searchFrom);
    if (idx === -1) return false;

    // Check if a longer known name starts at this position.
    // If "李明" is at position X and "李明远" is a known name,
    // text.startsWith("李明远", X) would be true → skip this occurrence.
    const isPrefixOfLonger = allNames.some(
      (other) => other.length > trimmed.length && text.startsWith(other, idx),
    );

    if (!isPrefixOfLonger) return true; // Valid match
    searchFrom = idx + 1; // Skip, look for next occurrence
  }
}

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
export function mergePhaseResults(phase1: Asset[], phase2: AssetCatalog): AssetCatalog {
  // Build Phase 1 catalog (used for both result and isMatch checking).
  // Separate arrays so Phase 2 assets pushed into result are NOT checked
  // against other Phase 2 assets — only against original Phase 1 assets.
  const phase1Catalog: AssetCatalog = {
    characters: phase1.filter((a) => a.kind === "character"),
    scenes: phase1.filter((a) => a.kind === "scene"),
    props: phase1.filter((a) => a.kind === "prop"),
  };

  // Result starts as a shallow copy of Phase 1.
  const result: AssetCatalog = {
    characters: [...phase1Catalog.characters],
    scenes: [...phase1Catalog.scenes],
    props: [...phase1Catalog.props],
  };

  // Phase 2 is already normalized by the caller (extract()).
  const buckets: Array<keyof AssetCatalog> = ["characters", "scenes", "props"];
  for (const bucket of buckets) {
    for (const asset of phase2[bucket]) {
      // Check if this Phase 2 asset matches any Phase 1 asset using
      // the full isMatch logic (not just ID/exact name).
      const matches = phase1Catalog[bucket].some(
        (existing) => AssetCatalogManager.isMatch(asset, existing),
      );
      if (!matches) {
        result[bucket].push(asset);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Phase 1-only fallback catalog when the LLM call fails. */
function phase1Fallback(
  knownAssets: Asset[],
  rawResponse: string,
  error: unknown,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
): AssetExtractionResult {
  if (knownAssets.length > 0) {
    return {
      catalog: {
        characters: knownAssets.filter((a) => a.kind === "character"),
        scenes: knownAssets.filter((a) => a.kind === "scene"),
        props: knownAssets.filter((a) => a.kind === "prop"),
      },
      rawResponse,
      degraded: true,
      error: error instanceof Error ? error.message : error ? String(error) : "JSON parse/schema validation failure",
      usage,
    };
  }
  return {
    catalog: emptyCatalog(),
    rawResponse,
    degraded: true,
    error: error instanceof Error ? error.message : error ? String(error) : "JSON parse/schema validation failure",
    usage,
  };
}

/**
 * Format assets as a compact list for LLM prompts.
 *
 * @param assets       The assets to format.
 * @param includeDetails When true, includes appearanceCount, lastChapter,
 *                       and description preview (for fallback mode). When
 *                       false, only shows id, name, and aliases (for
 *                       Phase 1 "already identified" mode).
 */
function formatAssetList(assets: Asset[], includeDetails: boolean): string {
  const lines: string[] = [];
  const sections: Array<{ label: string; assets: Asset[] }> = [
    { label: "Characters", assets: assets.filter((a) => a.kind === "character") },
    { label: "Scenes", assets: assets.filter((a) => a.kind === "scene") },
    { label: "Props", assets: assets.filter((a) => a.kind === "prop") },
  ];

  for (const section of sections) {
    if (section.assets.length === 0) continue;
    lines.push(`### ${section.label}`);
    for (const asset of section.assets) {
      const aliases = asset.aliases.length > 0 ? ` (aliases: ${asset.aliases.join(", ")})` : "";
      if (includeDetails) {
        const descTrimmed = asset.description?.trim() ?? "";
        const descPreview = descTrimmed.length > 0
          ? ` — desc: ${descTrimmed.slice(0, 50)}${descTrimmed.length > 50 ? "…" : ""}`
          : "";
        lines.push(`- [id:${asset.id}] ${asset.name}${aliases} — appearances: ${asset.appearanceCount}, lastChapter: ${asset.lastChapter}${descPreview}`);
      } else {
        lines.push(`- [id:${asset.id}] ${asset.name}${aliases}`);
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(none)";
}

/**
 * Ensure each asset's `kind` field matches the bucket it was placed in.
 */
function normalizeCatalogKinds(catalog: AssetCatalog): AssetCatalog {
  return {
    characters: catalog.characters.map((a) => ({ ...a, kind: "character" as AssetKind })),
    scenes: catalog.scenes.map((a) => ({ ...a, kind: "scene" as AssetKind })),
    props: catalog.props.map((a) => ({ ...a, kind: "prop" as AssetKind })),
  };
}

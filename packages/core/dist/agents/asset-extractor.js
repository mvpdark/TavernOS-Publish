// packages/core/src/agents/asset-extractor.ts
//
// Asset extraction agent — extracts characters, scenes, and props from
// finalized chapter content after the audit + revision cycle completes.
//
// This agent uses an inline prompt (like StateExtractor) rather than a YAML
// file, because the prompt logic includes conditional sections based on
// whether an existing catalog is provided.
import { AssetCatalogSchema, emptyCatalog, } from "../assets/types.js";
import { createAgentRuntime } from "./base.js";
import { parseAndValidate } from "./json-utils.js";
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
export function createAssetExtractor(ctx) {
    const runtime = createAgentRuntime(ctx);
    const name = "asset-extractor";
    async function extract(input, options) {
        const systemContent = "你是一个创意写作平台的资产提取代理。\n" +
            "你的任务是从章节内容中提取结构化的资产目录（角色、场景、道具）。\n" +
            "只输出合法的 JSON，不要输出 Markdown 代码块或解释文字。\n\n" +
            "JSON 格式如下：\n" +
            '{\n  "characters": [{ "id": "...", "kind": "character", "name": "...", "aliases": [...], "description": "...", "firstChapter": N, "lastChapter": N, "attributes": { ... }, "appearanceCount": N }],\n' +
            '  "scenes": [{ ... same shape, kind: "scene" ... }],\n' +
            '  "props": [{ ... same shape, kind: "prop" ... }]\n' +
            "}\n\n" +
            "提取规则：\n" +
            "- 角色：提取每个有名人物，包括别名/昵称、外貌、性格和角色定位。\n" +
            "- 场景：提取不同的地点/环境及其描述特征。\n" +
            "- 道具：提取对剧情有重要作用的对象/物品及其属性。\n" +
            "- 每个资产必须有唯一的 'id'（使用名称的 slug，如 'protagonist-li-ming'）。\n" +
            "- 'firstChapter' 和 'lastChapter' 设为当前章节号。\n" +
            "- 新资产 'appearanceCount' 设为 1。已有资产的 appearanceCount 由系统自动累加，无需手动计算（直接设为 1 即可，系统会根据已有目录合并时自动+1）。\n" +
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
        let userContent = `## Chapter ${input.chapter}\n\n${input.chapterContent}\n\n` +
            `Extract the asset catalog as a JSON object. Set firstChapter and lastChapter to ${input.chapter}.`;
        // When an existing catalog is provided, include it so the LLM can mark
        // new vs. updated entries and preserve existing asset IDs.
        if (input.existingCatalog) {
            const existingSummary = formatExistingCatalog(input.existingCatalog);
            userContent +=
                `\n\n## Existing Asset Catalog (from prior chapters)\n${existingSummary}\n\n` +
                    "For assets that already exist (matched by name or alias), reuse the same 'id'. " +
                    "Do NOT calculate or set appearanceCount for existing assets — the system automatically " +
                    "increments appearanceCount when merging (set it to 1 in your output; the merge logic " +
                    "will compute existing+1). " +
                    "For new assets, generate a new 'id' and set 'appearanceCount' to 1. " +
                    "Include ALL assets (both existing and new) in your output.";
        }
        const messages = [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
        ];
        let rawResponse = "";
        try {
            const response = await runtime.chat(messages, options);
            rawResponse = response.content;
            const catalog = parseAndValidate(response.content, AssetCatalogSchema);
            if (catalog !== null) {
                // Ensure kind fields are consistent with the bucket they're in.
                return { catalog: normalizeCatalogKinds(catalog), rawResponse, degraded: false };
            }
        }
        catch (e) {
            // LLM call failed — surface the error on the degraded fallback so the
            // caller can log/diagnose without a silent swallow.
            return {
                catalog: emptyCatalog(),
                rawResponse,
                degraded: true,
                error: e instanceof Error ? e.message : String(e),
            };
        }
        // Fallback: empty catalog on parse failure, marked as degraded
        return { catalog: emptyCatalog(), rawResponse, degraded: true };
    }
    return { name, extract };
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Format an existing catalog as a human-readable summary for the LLM prompt.
 * Lists each asset's id, name, aliases, appearance count, and a short
 * description preview (first 50 chars) so the LLM can disambiguate same-name
 * or same-surname entries semantically.
 */
function formatExistingCatalog(catalog) {
    const lines = [];
    const sections = [
        { label: "Characters", assets: catalog.characters },
        { label: "Scenes", assets: catalog.scenes },
        { label: "Props", assets: catalog.props },
    ];
    for (const section of sections) {
        if (section.assets.length === 0)
            continue;
        lines.push(`### ${section.label}`);
        for (const asset of section.assets) {
            const aliases = asset.aliases.length > 0 ? ` (aliases: ${asset.aliases.join(", ")})` : "";
            const descPreview = asset.description && asset.description.trim().length > 0
                ? ` — desc: ${asset.description.trim().slice(0, 50)}${asset.description.trim().length > 50 ? "…" : ""}`
                : "";
            lines.push(`- [id:${asset.id}] ${asset.name}${aliases} — appearances: ${asset.appearanceCount}, lastChapter: ${asset.lastChapter}${descPreview}`);
        }
    }
    return lines.length > 0 ? lines.join("\n") : "(no existing assets)";
}
/**
 * Ensure each asset's `kind` field matches the bucket it was placed in.
 * The LLM sometimes puts a character in the `characters` array but leaves
 * kind="scene" — this normalizes them.
 */
function normalizeCatalogKinds(catalog) {
    return {
        characters: catalog.characters.map((a) => ({ ...a, kind: "character" })),
        scenes: catalog.scenes.map((a) => ({ ...a, kind: "scene" })),
        props: catalog.props.map((a) => ({ ...a, kind: "prop" })),
    };
}
//# sourceMappingURL=asset-extractor.js.map
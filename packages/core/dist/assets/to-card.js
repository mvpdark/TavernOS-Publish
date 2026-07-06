// packages/core/src/assets/to-card.ts
//
// Asset → PersonaCard converter.
//
// Converts a character Asset (from the writing pipeline's AssetExtractor)
// into a PersonaCardV2 (the format used by the character chat system).
//
// This is a ZERO-LLM template-based conversion — no additional API calls
// or tokens are consumed. The asset's `description` already contains 8+
// specific visual/personality details (enforced by the AssetExtractor
// prompt), so it serves as a rich `description` field. Personality traits
// are derived from `attributes` and `description` excerpts.
//
// Design principles:
//   • Zero LLM calls — pure template transformation
//   • Cards are immediately usable for character chat
//   • The `extensions.tavernos.autoSynced` flag distinguishes auto-generated
//     cards from manually created ones (manual cards are never overwritten)
//   • Cards are updated incrementally as the asset description grows
// ---------------------------------------------------------------------------
// Filename helper
// ---------------------------------------------------------------------------
/**
 * Generate a safe filename for a character card from the asset name.
 * Matches the naming convention used by personas.ts:
 *   lowercase, non-alphanumeric (except CJK) replaced with hyphens.
 */
export function assetToFilename(asset) {
    const base = asset.name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `${base || "unnamed"}.json`;
}
// ---------------------------------------------------------------------------
// Field derivation helpers
// ---------------------------------------------------------------------------
/**
 * Derive a personality string from the asset's attributes and description.
 *
 * Extracts known personality-related attributes (age, occupation, role, etc.)
 * and combines them with a truncated description excerpt.
 */
function derivePersonality(asset) {
    const parts = [];
    // Pull structured attributes into personality.
    const personalityKeys = [
        "age", "occupation", "role", "status", "faction", "rank",
        "ability", "skill", "trait", "alignment", "背景", "身份", "职业",
        "能力", "性格", "阵营", "等级", "地位",
    ];
    for (const [key, value] of Object.entries(asset.attributes)) {
        const lowerKey = key.toLowerCase();
        const isPersonalityKey = personalityKeys.some((pk) => lowerKey.includes(pk) || key.includes(pk));
        if (isPersonalityKey && value.trim()) {
            parts.push(`${key}: ${value}`);
        }
    }
    // Add a description excerpt (first 200 chars) for personality context.
    if (asset.description) {
        const excerpt = asset.description.length > 200
            ? asset.description.slice(0, 200) + "…"
            : asset.description;
        parts.push(excerpt);
    }
    return parts.join("\n");
}
/**
 * Derive a first message (greeting) for the character.
 *
 * Uses a simple in-character greeting template that incorporates the
 * character's name and a brief hint from their description.
 */
function deriveFirstMes(asset) {
    const name = asset.name;
    // Try to extract a mood or role hint from attributes.
    const role = asset.attributes["role"]
        ?? asset.attributes["occupation"]
        ?? asset.attributes["身份"]
        ?? asset.attributes["职业"]
        ?? "";
    if (role) {
        return `（${name}出现在你面前，${role}的气息扑面而来。）\n\n你好，我是${name}。有什么想聊的吗？`;
    }
    return `（${name}出现在你面前。）\n\n你好，我是${name}。有什么想聊的吗？`;
}
/**
 * Derive a system prompt that instructs the LLM to stay in character.
 */
function deriveSystemPrompt(asset) {
    const aliases = asset.aliases.length > 0
        ? `（别名：${asset.aliases.join("、")}）`
        : "";
    return `你正在扮演「${asset.name}」${aliases}。请保持角色性格与语气一致，根据已知的故事背景和角色设定进行对话。不要脱离角色，不要提及你是AI。`;
}
// ---------------------------------------------------------------------------
// Main conversion function
// ---------------------------------------------------------------------------
/**
 * Convert a character Asset into a PersonaCardV2.
 *
 * This is a pure template transformation — no LLM calls. The resulting card
 * is marked with `extensions.tavernos.autoSynced = true` so the sync logic
 * knows it can safely overwrite it when the asset is updated.
 *
 * @param asset  The character asset from the asset catalog.
 * @param storyBible  Optional story bible text (used as scenario context).
 * @returns A PersonaCardV2 object ready for serialization.
 */
export function assetToCard(asset, storyBible) {
    const scenario = storyBible
        ? storyBible.slice(0, 500) + (storyBible.length > 500 ? "…" : "")
        : "";
    return {
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
            name: asset.name,
            description: asset.description || "",
            personality: derivePersonality(asset),
            scenario,
            first_mes: deriveFirstMes(asset),
            mes_example: "",
            creator_notes: `自动从小说写作管线同步（首次出场：第${asset.firstChapter}章）`,
            character_version: "1.0",
            system_prompt: deriveSystemPrompt(asset),
            post_history_instructions: "",
            tags: ["auto-synced"],
            creator: "TavernOS",
            alternate_greetings: [],
            extensions: {
                tavernos: {
                    autoSynced: true,
                    appearances: [asset.firstChapter, asset.lastChapter],
                    arc: `出场${asset.appearanceCount}次（第${asset.firstChapter}-${asset.lastChapter}章）`,
                },
            },
        },
    };
}
/**
 * Check whether a PersonaCard was auto-synced from the asset pipeline.
 *
 * Auto-synced cards have `extensions.tavernos.autoSynced === true`.
 * Manually created or edited cards (no flag, or flag explicitly false)
 * are never overwritten by the sync logic.
 */
export function isAutoSyncedCard(card) {
    const ext = card.data.extensions?.["tavernos"];
    return ext?.["autoSynced"] === true;
}
/**
 * Merge an updated asset into an existing auto-synced card.
 *
 * Updates description, personality, system_prompt, and the tavernos
 * extension metadata. Preserves first_mes (to avoid resetting conversation
 * context) unless the description has changed dramatically (>50% growth).
 *
 * @param existing  The existing PersonaCardV2 (must be auto-synced).
 * @param asset     The updated asset from the catalog.
 * @param storyBible  Optional story bible text.
 * @returns An updated PersonaCardV2.
 */
export function mergeAssetIntoCard(existing, asset, storyBible) {
    const oldDesc = existing.data.description || "";
    const newDesc = asset.description || "";
    const descChangedDramatically = newDesc.length > oldDesc.length * 1.5 ||
        (oldDesc.length > 0 && !newDesc.includes(oldDesc.slice(0, 50)));
    const scenario = storyBible
        ? storyBible.slice(0, 500) + (storyBible.length > 500 ? "…" : "")
        : existing.data.scenario;
    // Preserve first_mes unless the description changed dramatically.
    const firstMes = descChangedDramatically
        ? deriveFirstMes(asset)
        : existing.data.first_mes;
    return {
        ...existing,
        data: {
            ...existing.data,
            description: newDesc || oldDesc,
            personality: derivePersonality(asset),
            scenario,
            system_prompt: deriveSystemPrompt(asset),
            first_mes: firstMes,
            creator_notes: `自动从小说写作管线同步（出场：第${asset.firstChapter}-${asset.lastChapter}章，共${asset.appearanceCount}次）`,
            extensions: {
                ...existing.data.extensions,
                tavernos: {
                    ...existing.data.extensions?.["tavernos"],
                    autoSynced: true,
                    appearances: [asset.firstChapter, asset.lastChapter],
                    arc: `出场${asset.appearanceCount}次（第${asset.firstChapter}-${asset.lastChapter}章）`,
                },
            },
        },
    };
}
//# sourceMappingURL=to-card.js.map
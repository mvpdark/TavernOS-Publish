// packages/core/src/agents/fact-taxonomy.ts
//
// Shared fact taxonomy for the chapter-analyzer and fact-extractor agents.
//
// Both agents previously maintained byte-for-byte identical copies of the
// ExtractedFact interface, the story-domain/category taxonomy constants, and
// the four parsing helpers (buildTaxonomyText, clampNumber, coerceFact,
// parseFacts). This module is the single source of truth for that shared
// logic, eliminating the ~150-line duplication between the two agents.
//
// The taxonomy is kept local to the agents layer (rather than importing from
// the narrative package) so the agents stay decoupled from narrative runtime
// types. It mirrors StoryDomain / StoryCategory / DOMAIN_CATEGORIES defined
// in narrative/types.ts and narrative/story-domains.ts.
import { parseJsonArray } from "./json-utils.js";
export const DOMAIN_CATEGORIES_MAP = {
    character: ["identity", "personality", "appearance", "ability", "background", "relation"],
    world: ["rule", "faction", "history", "system"],
    location: ["geography", "venue", "region"],
    plot_thread: ["foreshadow", "task", "mystery", "causality"],
    timeline: ["event", "milestone", "season"],
    theme: ["motif", "symbol", "conflict"],
};
export const DOMAIN_LABELS_ZH = {
    character: "人物",
    world: "世界观",
    location: "地点",
    plot_thread: "情节线",
    timeline: "时间线",
    theme: "主题",
};
export const CATEGORY_LABELS_ZH = {
    identity: "身份", personality: "性格", appearance: "外貌", ability: "能力", background: "背景", relation: "关系",
    rule: "规则", faction: "势力", history: "历史", system: "体系",
    geography: "地理", venue: "场所", region: "区域",
    foreshadow: "伏笔", task: "任务", mystery: "悬念", causality: "因果",
    event: "事件", milestone: "里程碑", season: "季节",
    motif: "意象", symbol: "象征", conflict: "矛盾",
};
export const VALID_DOMAIN_SET = new Set(Object.keys(DOMAIN_CATEGORIES_MAP));
export const VALID_CATEGORY_SET = new Set(Object.values(DOMAIN_CATEGORIES_MAP).flat());
// ---------------------------------------------------------------------------
// Taxonomy text — injected into agent system prompts.
// ---------------------------------------------------------------------------
/** Build the taxonomy description block used in the system prompt. */
export function buildTaxonomyText() {
    return Object.entries(DOMAIN_CATEGORIES_MAP)
        .map(([domain, cats]) => {
        const dzh = DOMAIN_LABELS_ZH[domain];
        const catStr = cats.map((c) => `${c}（${CATEGORY_LABELS_ZH[c] ?? c}）`).join(", ");
        return `- ${domain}（${dzh}）: ${catStr}`;
    })
        .join("\n");
}
// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
/** Clamp a value into [min, max], falling back when it is not a finite number. */
export function clampNumber(value, min, max, fallback) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
/**
 * Validate and normalise a single raw object into an ExtractedFact.
 * Returns null when the object is missing required fields or uses an
 * unknown domain/category (or a category that does not belong to its domain).
 */
export function coerceFact(raw) {
    if (typeof raw !== "object" || raw === null)
        return null;
    const obj = raw;
    const domain = typeof obj.domain === "string" ? obj.domain : "";
    if (!VALID_DOMAIN_SET.has(domain))
        return null;
    const category = typeof obj.category === "string" ? obj.category : "";
    if (!VALID_CATEGORY_SET.has(category))
        return null;
    // Category must belong to the claimed domain.
    const allowed = DOMAIN_CATEGORIES_MAP[domain];
    if (!allowed || !allowed.includes(category))
        return null;
    const label = typeof obj.label === "string" ? obj.label.trim() : "";
    const content = typeof obj.content === "string" ? obj.content.trim() : "";
    if (!label || !content)
        return null;
    const triggers = Array.isArray(obj.triggers)
        ? obj.triggers.filter((t) => typeof t === "string")
        : [];
    return {
        domain,
        category,
        label,
        content,
        weight: clampNumber(obj.weight, 0, 100, 50),
        certainty: clampNumber(obj.certainty, 0, 1, 0.7),
        triggers,
        emotionalWeight: clampNumber(obj.emotionalWeight, -1, 1, 0),
    };
}
/**
 * Parse the LLM response into a list of validated facts.
 *
 * Returns `null` when the response could not be parsed into a usable array
 * (so the caller can flag the result as degraded). Returns an empty array
 * for a genuine `[]` response. Uses {@link parseJsonArray} for defensive
 * extraction (handles markdown fences and surrounding prose), then validates
 * each element with {@link coerceFact}.
 */
export function parseFacts(text) {
    const rawArray = parseJsonArray(text);
    // parseJsonArray returns [] both for a genuine empty array and for total
    // parse failure. Distinguish by stripping code fences: a legit empty array
    // leaves only "[]".
    if (rawArray.length === 0) {
        const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
        if (stripped === "[]" || stripped === "[ ]")
            return [];
        return null;
    }
    const facts = [];
    for (const raw of rawArray) {
        const fact = coerceFact(raw);
        if (fact)
            facts.push(fact);
    }
    // If an array was parsed but every element failed validation, treat the
    // whole response as unparseable.
    return facts.length > 0 ? facts : null;
}
//# sourceMappingURL=fact-taxonomy.js.map
// packages/core/src/video/script-parser.ts
//
// Script Parser module — intelligently decomposes a long script/screenplay
// (up to ~50,000 characters) into structured elements: characters, scenes,
// props, and per-scene beats (分场概要).
//
// Design overview:
//   1. The input script is too large for a single LLM call, so it is split
//      into ~5000-character chunks at paragraph boundaries (with a hard-split
//      fallback for oversized paragraphs).
//   2. Each chunk is parsed independently by the LLM into a partial result
//      (characters / scenes / props / beats). Chunks are processed with a
//      bounded concurrency to balance throughput and rate limits.
//   3. Partial results are merged and de-duplicated: characters/scenes/props
//      with the same name are merged (missing fields filled from later
//      occurrences); beats are concatenated in chunk order and renumbered
//      sequentially.
//   4. A single chunk failing to parse never aborts the whole run — it is
//      reported via an optional callback and skipped.
//
// Robustness: the LLM is asked to emit strict JSON. The response is first
// validated against a strict Zod schema; if that fails, a lenient per-element
// fallback re-validates each array entry individually so one malformed entry
// does not discard an entire chunk.
import { z } from "zod";
import { createAgentRuntime } from "../agents/base.js";
import { parseAndValidate, parseJsonObject } from "../agents/json-utils.js";
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
/** Default chunk size in characters (≈5000 CJK chars per LLM call). */
const DEFAULT_MAX_CHUNK_SIZE = 5000;
/** Default concurrency for parallel chunk parsing. */
const DEFAULT_CONCURRENCY = 3;
/** Default sampling temperature for structured extraction. */
const DEFAULT_TEMPERATURE = 0.3;
/** Default max output tokens per chunk (guards against JSON truncation). */
const DEFAULT_MAX_TOKENS = 8000;
// ---------------------------------------------------------------------------
// Lenient enum-like field schemas
// ---------------------------------------------------------------------------
// The LLM occasionally returns Chinese tokens ("男"/"女") or unexpected
// values for enumerated fields. These schemas coerce any input into the
// canonical enum, so a single odd value never rejects a whole entry.
const GenderSchema = z
    .string()
    .catch("unknown")
    .transform((v) => {
    const g = v.trim().toLowerCase();
    if (g === "male" || g === "男" || g === "男性" || g === "男主")
        return "male";
    if (g === "female" || g === "女" || g === "女性" || g === "女主")
        return "female";
    return "unknown";
});
const ImportanceSchema = z
    .string()
    .catch("minor")
    .transform((v) => {
    const i = v.trim().toLowerCase();
    if (i === "key" || i === "关键" || i === "重要" || i === "main")
        return "key";
    return "minor";
});
export const ParsedCharacterSchema = z.object({
    name: z.string().min(1),
    gender: GenderSchema,
    ageRange: z.string().optional(),
    role: z.string().default(""),
    personality: z.string().default(""),
    appearance: z.string().optional(),
    relationships: z.array(z.string()).default([]),
});
export const ParsedSceneSchema = z.object({
    name: z.string().min(1),
    location: z.string().default(""),
    timeOfDay: z.string().optional(),
    mood: z.string().optional(),
    description: z.string().optional(),
});
export const ParsedPropSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    importance: ImportanceSchema,
});
export const ParsedSceneBeatSchema = z.object({
    sceneNumber: z.number().int().min(1),
    title: z.string().min(1),
    characters: z.array(z.string()).default([]),
    scene: z.string().min(1),
    summary: z.string().min(1),
    emotion: z.string().optional(),
    estimatedDuration: z.number().int().min(1).optional(),
});
export const ParsedScriptSchema = z.object({
    title: z.string().optional(),
    characters: z.array(ParsedCharacterSchema).default([]),
    scenes: z.array(ParsedSceneSchema).default([]),
    props: z.array(ParsedPropSchema).default([]),
    beats: z.array(ParsedSceneBeatSchema).default([]),
    totalScenes: z.number().int().min(0).default(0),
    estimatedTotalDuration: z.number().int().min(0).optional(),
});
/** Shape returned by the LLM for a single chunk (no global aggregates). */
const ScriptChunkSchema = z.object({
    title: z.string().optional(),
    characters: z.array(ParsedCharacterSchema).default([]),
    scenes: z.array(ParsedSceneSchema).default([]),
    props: z.array(ParsedPropSchema).default([]),
    beats: z.array(ParsedSceneBeatSchema).default([]),
});
// ---------------------------------------------------------------------------
// LLM prompt
// ---------------------------------------------------------------------------
const SCRIPT_PARSER_SYSTEM_PROMPT = `你是 TavernOS 短剧系统的剧本结构解析专家。你的任务是将给定的剧本/小说片段解析为结构化 JSON 数据，提取角色、场景、道具和分场概要（beats）。

【输出要求】
- 只输出一个合法的 JSON 对象，禁止输出 Markdown 代码块、注释或任何解释文字。
- 所有字符串字段使用中文（gender / importance 除外，使用指定英文枚举值）。

【JSON 结构】
{
  "title": "剧本标题（仅当本片段能明确推断出整体标题时填写，否则省略此字段）",
  "characters": [
    {
      "name": "角色名（必填）",
      "gender": "male | female | unknown",
      "ageRange": "年龄段，如 20-25 或 少年（可选）",
      "role": "角色定位，如 男主/女主/反派/配角/路人",
      "personality": "性格描述",
      "appearance": "外貌描述（可选）",
      "relationships": ["与XX是恋人", "XX的父亲"]
    }
  ],
  "scenes": [
    {
      "name": "场景名，如 雨夜街头",
      "location": "地点，如 室外街道/室内客厅",
      "timeOfDay": "白天/夜晚/黄昏/清晨（可选）",
      "mood": "氛围，如 紧张/温馨/压抑（可选）",
      "description": "场景描述（可选）"
    }
  ],
  "props": [
    {
      "name": "道具名",
      "description": "道具描述（可选）",
      "importance": "key | minor"
    }
  ],
  "beats": [
    {
      "sceneNumber": 1,
      "title": "本场小标题",
      "characters": ["出场角色名"],
      "scene": "对应场景名（需与 scenes 中的 name 对应）",
      "summary": "本场所发生事件的一句话摘要",
      "emotion": "情绪基调，如 悲伤/愤怒/释然（可选）",
      "estimatedDuration": 15
    }
  ]
}

【提取规则】
1. 角色：提取所有有名或被反复提及的人物。gender 必须是 male/female/unknown（也接受 男/女/男性/女性）。
2. 场景：提取不同的地点/环境，每个独立场景一个条目；同一地点不同时段可合并或拆分，视剧情而定。
3. 道具：提取对剧情有作用的物品。推动剧情的关键道具 importance=key，普通道具 importance=minor。
4. beats：按剧情时间顺序拆分为若干分场概要。每个 beat 是一个连续的戏剧单元（同一场戏内的连续动作/对话）。
   - sceneNumber 从 1 开始递增（仅限本片段内编号）。
   - estimatedDuration 单位为秒，短剧节奏快，单场通常 5-60 秒。
   - characters 填写本场出场的角色名（需与 characters 中的 name 对应）。
5. characters / scenes / props / beats 数组可为空，但必须存在。
6. 未提及的可选字段请省略，不要编造；必填字段（name / role 等）不可省略。`;
/** Build the user-turn prompt for a single chunk. */
function buildChunkUserPrompt(chunk, index, total) {
    return [
        `## 剧本片段 ${index + 1} / ${total}`,
        "",
        chunk,
        "",
        "---",
        "请将上述片段解析为 JSON。beats 的 sceneNumber 从 1 开始（仅限本片段内编号）。",
        "只输出 JSON 对象，不要输出 Markdown 代码块或解释。",
    ].join("\n");
}
// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------
/**
 * Split a script into chunks of at most `maxChunkSize` characters, preferring
 * paragraph (double-newline) boundaries, then single-newline boundaries, and
 * finally hard-splitting any remaining oversized unit at sentence boundaries.
 */
function chunkScript(script, maxChunkSize) {
    const text = script.replace(/\r\n/g, "\n");
    if (text.length <= maxChunkSize)
        return [text];
    // Step 1: split into paragraph units by blank lines.
    const paragraphs = text.split(/\n{2,}/);
    // Step 2: further split oversized paragraphs by single newlines.
    const units = [];
    for (const para of paragraphs) {
        if (para.length <= maxChunkSize) {
            units.push(para);
            continue;
        }
        const lines = para.split(/\n/);
        let buf = "";
        for (const line of lines) {
            if (buf.length === 0) {
                buf = line;
            }
            else if (buf.length + 1 + line.length <= maxChunkSize) {
                buf += "\n" + line;
            }
            else {
                units.push(buf);
                buf = line;
            }
        }
        if (buf.length > 0)
            units.push(buf);
    }
    // Step 3: greedily pack units into chunks, joining with a blank line.
    const packed = [];
    let current = "";
    for (const unit of units) {
        if (current.length === 0) {
            current = unit;
        }
        else if (current.length + 2 + unit.length <= maxChunkSize) {
            current += "\n\n" + unit;
        }
        else {
            packed.push(current);
            current = unit;
        }
    }
    if (current.length > 0)
        packed.push(current);
    // Step 4: hard-split any chunk still over the limit (no newline boundaries).
    const result = [];
    for (const chunk of packed) {
        for (const piece of hardSplit(chunk, maxChunkSize)) {
            if (piece.length > 0)
                result.push(piece);
        }
    }
    return result;
}
/**
 * Hard-split a single text block at sentence boundaries (。！？!?\n) when it
 * exceeds `maxChunkSize`. Falls back to a clean character cut if no boundary
 * is found in the latter half of the window.
 */
function hardSplit(text, maxChunkSize) {
    if (text.length <= maxChunkSize)
        return [text];
    const result = [];
    const minBoundary = Math.floor(maxChunkSize * 0.5);
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxChunkSize, text.length);
        if (end < text.length) {
            let boundary = -1;
            for (let i = end - 1; i > start + minBoundary; i--) {
                const ch = text[i];
                if (ch === "。" || ch === "！" || ch === "？" || ch === "!" || ch === "?" || ch === "\n") {
                    boundary = i;
                    break;
                }
            }
            if (boundary > 0)
                end = boundary + 1;
        }
        result.push(text.slice(start, end));
        start = end;
    }
    return result;
}
// ---------------------------------------------------------------------------
// Concurrency-limited map (preserves input order in the result array)
// ---------------------------------------------------------------------------
async function mapWithConcurrency(items, fn, concurrency) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
        for (;;) {
            const idx = cursor++;
            if (idx >= items.length)
                return;
            results[idx] = await fn(items[idx], idx);
        }
    }
    const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
// ---------------------------------------------------------------------------
// Merge / de-duplicate helpers
// ---------------------------------------------------------------------------
/** Normalize a name into a stable comparison key (trim, drop spaces, lowercase). */
function normalizeName(name) {
    return name.trim().replace(/\s+/g, "").toLowerCase();
}
/** De-duplicate a string list by trimmed-case-insensitive key, preserving order. */
function dedupeStrings(list) {
    const seen = new Set();
    const out = [];
    for (const s of list) {
        const key = s.trim().toLowerCase();
        if (key.length === 0 || seen.has(key))
            continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}
/** Return the longer of two optional strings (by trimmed length). */
function preferLonger(a, b) {
    const al = a?.trim().length ?? 0;
    const bl = b?.trim().length ?? 0;
    if (al === 0 && bl === 0)
        return undefined;
    return al >= bl ? a ?? b : b ?? a;
}
/** Merge two characters with the same name, filling missing fields. */
function mergeOneCharacter(a, b) {
    return {
        name: a.name || b.name,
        gender: a.gender !== "unknown" ? a.gender : b.gender,
        ageRange: a.ageRange ?? b.ageRange,
        role: a.role || b.role,
        personality: a.personality || b.personality,
        appearance: a.appearance ?? b.appearance,
        relationships: dedupeStrings([...(a.relationships ?? []), ...(b.relationships ?? [])]),
    };
}
/** Merge two scenes with the same name, filling missing fields. */
function mergeOneScene(a, b) {
    return {
        name: a.name || b.name,
        location: a.location || b.location,
        timeOfDay: a.timeOfDay ?? b.timeOfDay,
        mood: a.mood ?? b.mood,
        description: preferLonger(a.description, b.description),
    };
}
/** Merge two props with the same name; "key" importance wins over "minor". */
function mergeOneProp(a, b) {
    return {
        name: a.name || b.name,
        description: preferLonger(a.description, b.description),
        importance: a.importance === "key" || b.importance === "key" ? "key" : "minor",
    };
}
/** Merge character lists from all chunks, de-duplicating by normalized name. */
function mergeCharacters(chunks) {
    const map = new Map();
    for (const list of chunks) {
        for (const c of list) {
            const key = normalizeName(c.name);
            const existing = map.get(key);
            map.set(key, existing ? mergeOneCharacter(existing, c) : { ...c });
        }
    }
    return [...map.values()];
}
/** Merge scene lists from all chunks, de-duplicating by normalized name. */
function mergeScenes(chunks) {
    const map = new Map();
    for (const list of chunks) {
        for (const s of list) {
            const key = normalizeName(s.name);
            const existing = map.get(key);
            map.set(key, existing ? mergeOneScene(existing, s) : { ...s });
        }
    }
    return [...map.values()];
}
/** Merge prop lists from all chunks, de-duplicating by normalized name. */
function mergeProps(chunks) {
    const map = new Map();
    for (const list of chunks) {
        for (const p of list) {
            const key = normalizeName(p.name);
            const existing = map.get(key);
            map.set(key, existing ? mergeOneProp(existing, p) : { ...p });
        }
    }
    return [...map.values()];
}
/**
 * Concatenate beats from all chunks in chunk order and renumber `sceneNumber`
 * sequentially from 1. Chunk order is preserved because the results array
 * returned by {@link mapWithConcurrency} follows input order.
 */
function mergeBeats(chunks) {
    const all = [];
    for (const list of chunks) {
        for (const b of list)
            all.push(b);
    }
    return all.map((b, i) => ({ ...b, sceneNumber: i + 1 }));
}
// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
/** A fresh empty chunk (used as a fallback when parsing fails). */
function emptyChunk() {
    return ScriptChunkSchema.parse({});
}
/** A fresh empty parsed script (used for empty input). */
function emptyParsedScript() {
    return {
        characters: [],
        scenes: [],
        props: [],
        beats: [],
        totalScenes: 0,
    };
}
/** Validate each element of `raw` against `schema`, silently dropping invalid ones. */
function filterValid(raw, schema) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        const r = schema.safeParse(item);
        if (r.success)
            out.push(r.data);
    }
    return out;
}
/**
 * Lenient fallback parser: extract the top-level JSON object, then validate
 * each array element individually so a single malformed entry does not
 * discard the whole chunk.
 */
function parseLenientChunk(text) {
    const raw = parseJsonObject(text);
    if (raw === null || typeof raw !== "object")
        return emptyChunk();
    const obj = raw;
    const title = typeof obj.title === "string" && obj.title.trim().length > 0 ? obj.title : undefined;
    return {
        title,
        characters: filterValid(obj.characters, ParsedCharacterSchema),
        scenes: filterValid(obj.scenes, ParsedSceneSchema),
        props: filterValid(obj.props, ParsedPropSchema),
        beats: filterValid(obj.beats, ParsedSceneBeatSchema),
    };
}
// ---------------------------------------------------------------------------
// ScriptParser
// ---------------------------------------------------------------------------
/**
 * Intelligent script parser.
 *
 * Splits a long script (up to ~50k characters) into chunks, parses each chunk
 * via the LLM into characters / scenes / props / beats, then merges and
 * de-duplicates the results. A single chunk failure is non-fatal.
 *
 * @example
 * ```ts
 * const parser = new ScriptParser(ctx);
 * const result = await parser.parse(novelText, {
 *   onProgress: (cur, total) => console.log(`${cur}/${total}`),
 * });
 * ```
 */
export class ScriptParser {
    runtime;
    constructor(ctx) {
        this.runtime = createAgentRuntime(ctx);
    }
    /**
     * Parse a full script into structured elements.
     *
     * @param script   The raw script / novel text.
     * @param options  Chunking, concurrency, progress, and abort options.
     * @returns        The merged {@link ParsedScript}.
     */
    async parse(script, options) {
        const maxChunkSize = Math.max(500, options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE);
        const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_CONCURRENCY);
        const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
        const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
        const signal = options?.signal;
        const onProgress = options?.onProgress;
        const onChunkError = options?.onChunkError;
        const text = (script ?? "").replace(/\r\n/g, "\n");
        if (text.trim().length === 0) {
            return emptyParsedScript();
        }
        const chunks = chunkScript(text, maxChunkSize);
        const total = chunks.length;
        onProgress?.(0, total);
        let completed = 0;
        const chunkResults = await mapWithConcurrency(chunks, async (chunk, index) => {
            try {
                if (signal?.aborted)
                    throw new Error("aborted");
                return await this.parseChunk(chunk, index, total, { temperature, maxTokens, signal });
            }
            catch (err) {
                onChunkError?.(index, err);
                return emptyChunk();
            }
            finally {
                completed++;
                onProgress?.(completed, total);
            }
        }, concurrency);
        const characters = mergeCharacters(chunkResults.map((r) => r.characters));
        const scenes = mergeScenes(chunkResults.map((r) => r.scenes));
        const props = mergeProps(chunkResults.map((r) => r.props));
        const beats = mergeBeats(chunkResults.map((r) => r.beats));
        const title = chunkResults
            .map((r) => r.title)
            .find((t) => typeof t === "string" && t.trim().length > 0);
        const estimatedTotalDuration = beats.reduce((sum, b) => sum + (b.estimatedDuration ?? 0), 0);
        return {
            title,
            characters,
            scenes,
            props,
            beats,
            totalScenes: beats.length,
            estimatedTotalDuration: estimatedTotalDuration > 0 ? estimatedTotalDuration : undefined,
        };
    }
    /**
     * Parse a single chunk. Tries the strict schema first, then falls back to a
     * lenient per-element parse so one bad entry does not discard the chunk.
     */
    async parseChunk(chunk, index, total, chatOpts) {
        const messages = [
            { role: "system", content: SCRIPT_PARSER_SYSTEM_PROMPT },
            { role: "user", content: buildChunkUserPrompt(chunk, index, total) },
        ];
        const response = await this.runtime.chat(messages, {
            temperature: chatOpts.temperature,
            maxTokens: chatOpts.maxTokens,
            signal: chatOpts.signal,
        });
        const strict = parseAndValidate(response.content, ScriptChunkSchema);
        if (strict !== null)
            return strict;
        // Lenient fallback: validate each element individually.
        return parseLenientChunk(response.content);
    }
}
// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
// All public symbols are exported inline via `export` on their declarations
// above (interfaces, Zod schemas, the ScriptParser class, and the
// ScriptParseOptions interface). They are aggregated here as a quick index
// for readers; no re-export statement is used to avoid TS2323 redeclaration.
//
// Exported:
//   - class    ScriptParser
//   - schema   ParsedCharacterSchema / ParsedSceneSchema / ParsedPropSchema /
//              ParsedSceneBeatSchema / ParsedScriptSchema
//   - type     ParsedCharacter / ParsedScene / ParsedProp / ParsedSceneBeat /
//              ParsedScript / ScriptParseOptions
//# sourceMappingURL=script-parser.js.map
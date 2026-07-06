// packages/core/src/deepgame/engine.ts
//
// Adventure engine — the core logic for DeepGame.
//
// Responsibilities:
//   1. generateWorld()  — create a new game world (from novel or from scratch)
//   2. processTurn()    — process a player action, stream narrative + metadata
//   3. buildSceneImagePrompt() — build image generation prompt from scene
//   4. scoreAdventure() — AI evaluation for novelization potential
//   5. buildNovelConversionData() — prepare data for converting to a novel project
import { loadTruthContext } from "../state/truth-files.js";
import { promises as fs } from "node:fs";
import { join } from "node:path";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Separator between narrative text and structured metadata in LLM output. */
const META_SEPARATOR = "\n===META===\n";
/** Maximum turns to include in context window (for token management). */
const MAX_CONTEXT_TURNS = 12;
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
let idCounter = 0;
function generateId(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}
// ---------------------------------------------------------------------------
// World generation
// ---------------------------------------------------------------------------
/**
 * Generate a new game world.
 *
 * Novel mode: reads the project's truth files (story-bible, story-state,
 * characters) and asks the LLM to create an adventure world based on them.
 *
 * Original mode: asks the LLM to invent a world from user preferences.
 */
export async function generateWorld(client, model, input) {
    if (input.mode === "novel" && input.sourceProjectRoot) {
        return generateWorldFromNovel(client, model, input);
    }
    return generateWorldOriginal(client, model, input);
}
/** Read novel project truth files and create an adventure world. */
async function generateWorldFromNovel(client, model, input) {
    const projectRoot = input.sourceProjectRoot;
    const truth = await loadTruthContext(projectRoot);
    // Read project config for genre/name.
    let projectConfig = {};
    try {
        const raw = await fs.readFile(join(projectRoot, "tavernos.json"), "utf8");
        projectConfig = JSON.parse(raw);
    }
    catch {
        // ignore
    }
    // Build a condensed context from truth files (cap to avoid token overflow).
    const storyBible = truth.storyBible.slice(0, 3000);
    const currentState = truth.currentStateOnly.slice(0, 1500);
    // List character names from the characters/ directory.
    let characterNames = [];
    try {
        const charDir = join(projectRoot, "characters");
        const entries = await fs.readdir(charDir);
        characterNames = entries
            .filter((e) => e.endsWith(".json"))
            .map((e) => e.replace(/\.json$/, ""));
    }
    catch {
        // no characters directory
    }
    const messages = [
        {
            role: "system",
            content: "你是一个互动冒险游戏的世界创世神。请基于给定的小说世界信息，创建一个让玩家可以自由探索的冒险世界。" +
                "你需要将小说的世界观、角色和设定浓缩为一个适合互动冒险的舞台。" +
                "输出必须是合法JSON，不要包含markdown代码块标记。",
        },
        {
            role: "user",
            content: buildNovelWorldPrompt({
                title: projectConfig.name ?? input.sourceProjectId ?? "未知小说",
                genre: projectConfig.genre ?? "",
                storyBible,
                currentState,
                characters: characterNames.join("、"),
                preferences: input.preferences,
            }),
        },
    ];
    const response = await client.chat(model, messages, { temperature: 0.8 });
    const parsed = parseWorldJson(response.content);
    return {
        mode: "novel",
        sourceProjectId: input.sourceProjectId,
        title: parsed.title || `${projectConfig.name ?? "小说"}·冒险`,
        premise: parsed.premise || "",
        setting: parsed.setting || "",
        genre: projectConfig.genre ?? parsed.genre ?? "",
        characterSummary: characterNames.join("、"),
        worldSummary: storyBible.slice(0, 1000),
        playerCharacter: parsed.playerCharacter || "一位神秘的旅人",
        startingScene: parsed.startingScene || "",
    };
}
/** Generate a brand-new world from user preferences. */
async function generateWorldOriginal(client, model, input) {
    const prefs = input.preferences ?? {};
    const messages = [
        {
            role: "system",
            content: "你是一个互动冒险游戏的世界创世神。请根据用户的偏好，创造一个引人入胜、充满可能性的冒险世界。" +
                "世界应该有丰富的设定、有趣的冲突和探索空间。" +
                "输出必须是合法JSON，不要包含markdown代码块标记。",
        },
        {
            role: "user",
            content: buildOriginalWorldPrompt(prefs),
        },
    ];
    const response = await client.chat(model, messages, { temperature: 0.9 });
    const parsed = parseWorldJson(response.content);
    return {
        mode: "original",
        title: parsed.title || "未知世界",
        premise: parsed.premise || "",
        setting: parsed.setting || "",
        genre: prefs.genre ?? parsed.genre ?? "",
        playerCharacter: parsed.playerCharacter || prefs.playerCharacter || "一位冒险者",
        startingScene: parsed.startingScene || "",
    };
}
// ---------------------------------------------------------------------------
// Turn processing
// ---------------------------------------------------------------------------
/**
 * Process a player action and generate narrative + metadata.
 *
 * The LLM streams a response in this format:
 *   [narrative text...]
 *   ===META===
 *   场景: [English scene description for image gen]
 *   位置: [player location]
 *   状态: [player status]
 *   获得: [items gained, comma-separated]
 *   失去: [items lost, comma-separated]
 *
 * The narrative portion is streamed via onChunk; after completion, the full
 * response is parsed to extract metadata.
 */
export async function processTurn(client, model, input) {
    const messages = buildTurnMessages(input);
    let fullResponse = "";
    const response = await client.chat(model, messages, {
        temperature: 0.85,
        signal: input.signal,
        onChunk: (delta) => {
            fullResponse += delta;
            input.onChunk?.(delta);
        },
    });
    // Use accumulated streamed text if available (more complete than response.content
    // when streaming is enabled).
    const raw = fullResponse || response.content;
    // Split narrative and metadata.
    const sepIdx = raw.indexOf(META_SEPARATOR);
    let narrative;
    let metaBlock;
    if (sepIdx >= 0) {
        narrative = raw.slice(0, sepIdx).trim();
        metaBlock = raw.slice(sepIdx + META_SEPARATOR.length).trim();
    }
    else {
        // No separator — treat entire response as narrative, no metadata.
        narrative = raw.trim();
        metaBlock = "";
    }
    const meta = parseMetadata(metaBlock);
    return {
        raw,
        narrative,
        sceneImagePrompt: meta.scene || buildFallbackScenePrompt(input.world, narrative),
        choices: meta.choices,
        playerStateUpdate: {
            location: meta.location || undefined,
            status: meta.status || undefined,
            inventoryAdd: meta.gained.length > 0 ? meta.gained : undefined,
            inventoryRemove: meta.lost.length > 0 ? meta.lost : undefined,
        },
    };
}
// ---------------------------------------------------------------------------
// Scene image prompt builder
// ---------------------------------------------------------------------------
/**
 * Build an image generation prompt from the scene description.
 * Combines world genre styling with the scene description for a cohesive look.
 */
export function buildSceneImagePrompt(world, sceneDescription) {
    const genreStyle = matchGenreVisual(world.genre);
    const parts = [
        `A cinematic scene illustration. ${genreStyle.artDirection}.`,
        `Scene: ${sceneDescription.slice(0, 300)}`,
        `Color palette: ${genreStyle.colorPalette}.`,
        `Lighting: ${genreStyle.lighting}.`,
        `Mood: ${genreStyle.mood}.`,
        `Composition: ${genreStyle.composition}. Landscape orientation (16:9).`,
        `Texture: fine art digital painting, subtle paper grain, high detail.`,
        `CRITICAL: Do NOT render any text, letters, or typography on the image.`,
    ];
    return parts.join("\n");
}
/** Build a fallback scene prompt from narrative text when metadata is missing. */
function buildFallbackScenePrompt(world, narrative) {
    // Extract first 200 chars of narrative as scene description.
    const snippet = narrative.slice(0, 200).replace(/\n/g, " ");
    return `An atmospheric scene from a ${world.genre || "fantasy"} adventure. ${snippet}`;
}
// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
/**
 * Score the adventure for novelization potential.
 * Feeds the entire transcript to the LLM and asks for structured evaluation.
 */
export async function scoreAdventure(client, model, session) {
    const transcript = buildTranscript(session);
    const messages = [
        {
            role: "system",
            content: "你是一位资深小说编辑和互动叙事评估专家。请对以下互动冒险进行全面、客观的评估。" +
                "从叙事质量、互动参与度、创意性、世界观一致性、角色塑造、戏剧张力六个维度评分（0-100）。" +
                "给出总分（六维平均）、推荐等级、优缺点分析和小说化建议。" +
                "输出必须是合法JSON，不要包含markdown代码块标记。",
        },
        {
            role: "user",
            content: buildScoringPrompt(session, transcript),
        },
    ];
    const response = await client.chat(model, messages, { temperature: 0.3 });
    return parseScoreJson(response.content);
}
// ---------------------------------------------------------------------------
// Novel conversion
// ---------------------------------------------------------------------------
/**
 * Build data needed to convert an adventure into a novel project.
 * Returns the project name, genre, and initial story bible content.
 */
export function buildNovelConversionData(session) {
    const { world, turns, score } = session;
    // Build a story bible from the adventure.
    const lines = [
        `# ${world.title}`,
        "",
        "## 核心前提",
        world.premise,
        "",
        "## 世界观",
        world.setting,
        "",
        "## 主角",
        world.playerCharacter,
        "",
        "## 冒险历程摘要",
    ];
    // Summarize key turns — pair each narrator turn with its preceding player
    // action by scanning the chronological sequence. This correctly handles the
    // starting scene (narrator turn with no preceding player action).
    let actNumber = 0;
    for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        if (turn.role !== "narrator")
            continue;
        actNumber++;
        const prev = i > 0 ? turns[i - 1] : undefined;
        if (prev && prev.role === "player") {
            lines.push(`\n### 第${actNumber}幕`);
            lines.push(`**玩家行动**: ${prev.content}`);
            lines.push(`**叙事**: ${turn.content.slice(0, 500)}${turn.content.length > 500 ? "..." : ""}`);
        }
        else {
            // Starting scene or standalone narrator turn with no player action.
            lines.push(`\n### 第${actNumber}幕（开场）`);
            lines.push(`**叙事**: ${turn.content.slice(0, 500)}${turn.content.length > 500 ? "..." : ""}`);
        }
    }
    if (score) {
        lines.push("", "## AI评估");
        lines.push(`总分: ${score.totalScore}/100`);
        lines.push(`推荐: ${score.recommendation}`);
        lines.push(`小说化建议: ${score.novelPotential}`);
    }
    return {
        name: `${world.title}·小说版`,
        genre: world.genre,
        storyBible: lines.join("\n"),
        premise: world.premise,
        protagonist: world.playerCharacter,
    };
}
/**
 * Group adventure turns into logical chapters.
 *
 * Strategy: group every N narrator turns (default 4-5) into one chapter.
 * If the adventure is short (< 6 turns), produce a single chapter.
 * If location changes are detected in player state, prefer splitting there.
 */
function groupTurnsIntoChapters(turns) {
    // Build (player?, narrator) pairs from the chronological turn sequence.
    // A starting scene (narrator turn at index 0 or with no preceding player
    // action) is included as a standalone narrator entry with no player pair.
    // This fixes the off-by-one that occurred when filtering narrator/player
    // turns into separate arrays and indexing them by position.
    const pairs = [];
    for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        if (turn.role !== "narrator")
            continue;
        const prev = i > 0 ? turns[i - 1] : undefined;
        if (prev && prev.role === "player") {
            pairs.push({ player: prev, narrator: turn });
        }
        else {
            pairs.push({ narrator: turn });
        }
    }
    if (pairs.length === 0)
        return [];
    // Determine group size: aim for 4-5 narrator turns per chapter.
    const groupSize = pairs.length <= 5 ? pairs.length : 5;
    const groups = [];
    let chapterNum = 1;
    for (let start = 0; start < pairs.length; start += groupSize) {
        const chunk = pairs.slice(start, start + groupSize);
        const chapterTurns = [];
        for (const pair of chunk) {
            if (pair.player)
                chapterTurns.push(pair.player);
            chapterTurns.push(pair.narrator);
        }
        groups.push({ turns: chapterTurns, chapterNumber: chapterNum });
        chapterNum++;
    }
    return groups;
}
/**
 * Convert an adventure session into novel chapters using LLM.
 *
 * For each chapter group, the LLM rewrites the interactive dialogue
 * (player action → narrator response) into continuous third-person prose
 * suitable for a novel. The output preserves key plot points, character
 * interactions, and world details while removing game-like elements.
 *
 * @param onChapterProgress Called after each chapter is converted (0-indexed).
 */
export async function convertAdventureToChapters(client, model, session, onChapterProgress) {
    const { world, turns, score } = session;
    const groups = groupTurnsIntoChapters(turns);
    const chapters = [];
    const now = new Date().toISOString();
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const messages = [
            {
                role: "system",
                content: buildChapterRewriteSystemPrompt(world),
            },
            {
                role: "user",
                content: buildChapterRewriteUserPrompt(group, world, i + 1, groups.length),
            },
        ];
        const response = await client.chat(model, messages, { temperature: 0.7 });
        const content = response.content.trim();
        // Skip empty or too-short responses.
        if (content.length < 100)
            continue;
        const chapter = {
            id: `chapter-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            title: `第${i + 1}章`,
            content,
            order: i,
            createdAt: now,
            updatedAt: now,
        };
        chapters.push(chapter);
        onChapterProgress?.(i, groups.length, chapter.title);
    }
    // Build story bible.
    const storyBible = buildStoryBible(world, score);
    // Extract characters from the adventure.
    const characters = extractCharacters(session);
    return { chapters, storyBible, characters };
}
// ---------------------------------------------------------------------------
// Chapter rewrite prompts
// ---------------------------------------------------------------------------
function buildChapterRewriteSystemPrompt(world) {
    return [
        "你是一位资深小说作家。你的任务是将一段互动冒险游戏的记录改写为标准小说章节。",
        "",
        "改写规则：",
        "1. 将玩家行动和叙述者的回应融合为流畅的第三人称叙事",
        "2. 去除所有游戏化元素（如「你选择了」「你看到」「你要做什么」等）",
        "3. 保持核心情节、角色互动和世界设定不变",
        "4. 增加适当的细节描写：环境、心理、动作、对话",
        "5. 确保叙事节奏流畅，有起承转合",
        "6. 角色对话用引号标注，保持自然",
        "7. 章节字数应在1500-4000字之间",
        "8. 直接输出小说正文，不要加标题、章节号或任何标记",
        "",
        `【世界设定】${world.title}`,
        `【类型】${world.genre || "未指定"}`,
        `【前提】${world.premise}`,
        `【世界观】${world.setting}`,
        `【主角】${world.playerCharacter}`,
    ].join("\n");
}
function buildChapterRewriteUserPrompt(group, _world, chapterNum, totalChapters) {
    const lines = [
        `请将以下冒险记录改写为小说的第${chapterNum}章（共${totalChapters}章）。`,
        "",
        "【冒险记录】",
    ];
    for (const turn of group.turns) {
        if (turn.role === "player") {
            lines.push(`\n【玩家行动】${turn.content}`);
        }
        else if (turn.role === "narrator") {
            lines.push(`\n【叙述】${turn.content}`);
        }
    }
    if (chapterNum === 1) {
        lines.push("", "注意：这是第一章，需要适当交代背景和世界观，让读者快速进入故事。");
    }
    if (chapterNum === totalChapters) {
        lines.push("", "注意：这是最后一章，需要给出一个有冲击力的收尾，可以留下悬念或完成故事弧。");
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Story bible builder (standard format matching truth-files.ts)
// ---------------------------------------------------------------------------
function buildStoryBible(world, score) {
    const lines = [
        "# 故事圣经",
        "",
        "## 核心前提",
        world.premise || "*（待生成）*",
        "",
        "## 世界观",
        world.setting || "*（待生成）*",
        "",
        "## 角色",
        `主角：${world.playerCharacter}`,
    ];
    if (world.characterSummary) {
        lines.push(`已知角色：${world.characterSummary}`);
    }
    lines.push("", "## 情节大纲");
    if (world.startingScene) {
        lines.push(`开场：${world.startingScene.slice(0, 200)}`);
    }
    if (score) {
        lines.push("", "## 互动冒险评估");
        lines.push(`总分：${score.totalScore}/100`);
        lines.push(`推荐：${score.recommendation}`);
        if (score.strengths.length > 0) {
            lines.push(`优点：${score.strengths.join("；")}`);
        }
        if (score.weaknesses.length > 0) {
            lines.push(`不足：${score.weaknesses.join("；")}`);
        }
        lines.push(`小说化建议：${score.novelPotential}`);
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Character extraction from adventure turns
// ---------------------------------------------------------------------------
function extractCharacters(session) {
    const { world, turns } = session;
    const characters = [];
    const seen = new Set();
    // Add the player character first.
    if (world.playerCharacter) {
        characters.push({
            name: extractCharacterName(world.playerCharacter) || "主角",
            description: world.playerCharacter,
            personality: "",
            role: "主角",
        });
        seen.add("主角");
    }
    // Extract named characters from narrator turns using heuristics.
    // Look for patterns like 「XXX说」「XXX道」at sentence boundaries.
    const narratorText = turns
        .filter((t) => t.role === "narrator")
        .map((t) => t.content)
        .join("\n");
    // Require the name to be at a sentence boundary (after punctuation,
    // whitespace, or start of string) to avoid matching mid-sentence fragments
    // like "他笑着" before "说". Use only 说/道 as triggers — the most reliable
    // speech verbs in Chinese. Most names are 2-3 characters.
    const charPattern = /(?<=[。！？\n\r\u201c\u201d\u2018\u2019（）【】\s]|^)[\u4e00-\u9fff]{2,3}(?=说|道)/g;
    const matches = narratorText.match(charPattern) ?? [];
    // Count occurrences — only keep names appearing 2+ times to reduce
    // false positives from one-off descriptive words.
    const nameCounts = new Map();
    for (const match of matches) {
        const name = match.trim();
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    // Expanded filter for common non-name words that may precede speech verbs.
    const COMMON_WORDS = /(他们|她们|你们|我们|这个|那个|什么|怎么|如果|虽然|但是|因为|所以|然而|于是|只见|接着|然后|突然|忽然|仿佛|好像|似乎|已经|正在|渐渐|慢慢|悄悄|默默|静静|缓缓|纷纷|不禁|不由|看着|望着|盯着|瞧着|瞄着|端详|打量|注视|凝视|老人|年轻人|少年|少女|男子|女子|书生|道士|和尚|农夫|商人|士兵|将军|皇帝|皇后|王爷|公主|太子|丞相|大臣|侍女|仆人|管家|掌柜|对方|旁人|众人|人群)/;
    for (const [name, count] of nameCounts) {
        if (seen.has(name) || name.length < 2)
            continue;
        if (COMMON_WORDS.test(name))
            continue;
        if (count < 2)
            continue;
        seen.add(name);
        characters.push({
            name,
            description: `从冒险记录中提取的角色（出现${count}次）`,
            personality: "",
            role: "配角",
        });
    }
    // Also check world.characterSummary for named characters.
    if (world.characterSummary) {
        const summaryNames = world.characterSummary.split(/[、，,]/);
        for (const rawName of summaryNames) {
            const name = rawName.trim();
            if (name.length < 2 || seen.has(name))
                continue;
            seen.add(name);
            characters.push({
                name,
                description: `来自原小说世界的角色`,
                personality: "",
                role: "配角",
            });
        }
    }
    return characters;
}
/** Extract a clean name from a player character description. */
function extractCharacterName(desc) {
    // Try to find a 2-4 char Chinese name at the start.
    const match = desc.match(/[\u4e00-\u9fff]{2,4}/);
    return match ? match[0] : "";
}
// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function buildNovelWorldPrompt(opts) {
    const lines = [
        `请基于以下小说世界信息，创建一个互动冒险世界。`,
        "",
        `小说标题: ${opts.title}`,
        `类型: ${opts.genre}`,
        `主要角色: ${opts.characters}`,
        "",
        "【故事圣经】",
        opts.storyBible || "（无）",
        "",
        "【当前世界状态】",
        opts.currentState || "（无）",
    ];
    if (opts.preferences?.playerCharacter) {
        lines.push("", `玩家希望扮演: ${opts.preferences.playerCharacter}`);
    }
    lines.push("", "请以JSON格式输出以下字段：", '```json', "{", '  "title": "冒险标题（可以与原小说不同，体现冒险主题）",', '  "premise": "核心前提（100字以内，基于小说世界但聚焦冒险）",', '  "setting": "世界设定摘要（200字以内，包括关键地点、势力、规则）",', '  "playerCharacter": "玩家扮演的角色描述（身份、能力、起点）",', '  "startingScene": "开场场景（玩家初始所处的场景，200字以内，生动有画面感）",', '  "genre": "类型标签"', "}", "```");
    return lines.join("\n");
}
function buildOriginalWorldPrompt(prefs) {
    const lines = [
        "请根据以下偏好，创造一个充满可能性的冒险世界：",
        "",
    ];
    if (prefs.genre)
        lines.push(`类型: ${prefs.genre}`);
    if (prefs.theme)
        lines.push(`主题: ${prefs.theme}`);
    if (prefs.setting)
        lines.push(`设定偏好: ${prefs.setting}`);
    if (prefs.playerCharacter)
        lines.push(`玩家角色偏好: ${prefs.playerCharacter}`);
    if (!prefs.genre && !prefs.theme && !prefs.setting) {
        lines.push("（用户未指定偏好，请自由发挥，创造一个独特有趣的世界）");
    }
    lines.push("", "要求：", "- 世界有丰富的探索空间和有趣的冲突", "- 有多个势力或阵营可以互动", "- 有悬念和谜题等待发现", "", "请以JSON格式输出以下字段：", '```json', "{", '  "title": "世界标题",', '  "premise": "核心前提（100字以内）",', '  "setting": "世界设定（200字以内，包括地理、社会、特殊体系）",', '  "playerCharacter": "玩家扮演的角色描述",', '  "startingScene": "开场场景（200字以内，生动有画面感）",', '  "genre": "类型标签"', "}", "```");
    return lines.join("\n");
}
function buildTurnMessages(input) {
    const { world, player, turns, action } = input;
    // Build world context block.
    const worldCtx = [
        `【世界】${world.title}`,
        `【类型】${world.genre || "未指定"}`,
        `【前提】${world.premise}`,
        `【设定】${world.setting}`,
    ];
    if (world.characterSummary) {
        worldCtx.push(`【已知角色】${world.characterSummary}`);
    }
    if (world.worldSummary) {
        worldCtx.push(`【世界背景】${world.worldSummary.slice(0, 500)}`);
    }
    // Build player state block.
    const playerCtx = [
        `角色: ${player.name}（${world.playerCharacter}）`,
        `位置: ${player.location || "未知"}`,
        `状态: ${player.status}`,
        `物品: ${player.inventory.length > 0 ? player.inventory.join("、") : "无"}`,
    ];
    // Build recent turns context (last N turns).
    const recentTurns = turns.slice(-MAX_CONTEXT_TURNS);
    const historyCtx = [];
    for (const turn of recentTurns) {
        if (turn.role === "player") {
            historyCtx.push(`【玩家】${turn.content}`);
        }
        else if (turn.role === "narrator") {
            // Truncate older narrator turns to save context.
            const maxLen = turn === recentTurns[recentTurns.length - 1] ? 2000 : 500;
            historyCtx.push(`【叙述】${turn.content.slice(0, maxLen)}`);
        }
    }
    const systemContent = [
        "你是一个互动冒险游戏的叙述者（游戏大师）。你的职责是：",
        "1. 根据玩家的行动，生成生动沉浸的叙事文本（至少2000个汉字），包含详尽的环境描写、角色对话、心理活动、感官细节和动作描写",
        "2. 在叙事结束后，提供场景画面描述（英文，用于AI图像生成）",
        "3. 更新玩家的状态信息",
        "4. 提供3-4个有意义的选择项供玩家下一步行动",
        "",
        "【世界信息】",
        ...worldCtx,
        "",
        "【玩家状态】",
        ...playerCtx,
        "",
        "【最近历程】",
        historyCtx.length > 0 ? historyCtx.join("\n\n") : "（冒险刚刚开始）",
        "",
        "规则：",
        "- 尊重世界设定，不得违背已确立的事实",
        "- 对玩家行动做出合理、有逻辑的反应",
        "- 叙事要丰富细腻，包含环境描写、角色互动、内心活动和对话",
        "- 提供有意义的选择和后果，不要代替玩家做决定",
        "- 保持戏剧张力和悬念",
        "- 叙事要有画面感，适合配图",
        "- 选择项应该风格多样：战斗/探索/社交/潜行等不同方向",
        "- 每个选择项10-20字，简洁有吸引力",
        "",
        "输出格式：",
        "先写叙事文本（直接开始，不要加标记），然后在新的行写 ===META===，",
        "最后按以下格式写元数据（每行一个字段）：",
        "",
        "===META===",
        "场景: [英文场景描述，50词以内，描述当前画面的视觉元素]",
        "位置: [玩家当前位置]",
        "状态: [玩家当前状态，如：健康/受伤/中毒/疲劳/精神饱满]",
        "获得: [获得的物品，逗号分隔，无则写无]",
        "失去: [失去的物品，逗号分隔，无则写无]",
        "选择: [选择1|选择2|选择3|选择4]",
    ].join("\n");
    return [
        { role: "system", content: systemContent },
        { role: "user", content: action },
    ];
}
function buildScoringPrompt(session, transcript) {
    const lines = [
        `冒险标题: ${session.world.title}`,
        `类型: ${session.world.genre || "未指定"}`,
        `总回合数: ${session.turnCount}`,
        `世界设定: ${session.world.setting.slice(0, 500)}`,
        "",
        "【冒险记录】",
        transcript.slice(0, 8000),
        "",
        "请从以下维度评分（0-100）：",
        "1. narrative（叙事质量）— 故事文本的文学性、画面感、沉浸感",
        "2. engagement（互动参与度）— 玩家选择的意义和影响力",
        "3. creativity（创意性）— 世界观、情节、角色的独特性",
        "4. coherence（世界观一致性）— 设定的连贯性和逻辑性",
        "5. character（角色塑造）— NPC的深度和立体感",
        "6. tension（戏剧张力）— 冲突、悬念、高潮的营造",
        "",
        "请以JSON格式输出：",
        '```json',
        "{",
        '  "totalScore": 0,',
        '  "dimensions": {',
        '    "narrative": 0,',
        '    "engagement": 0,',
        '    "creativity": 0,',
        '    "coherence": 0,',
        '    "character": 0,',
        '    "tension": 0',
        "  },",
        '  "summary": "总体评价（100字以内）",',
        '  "recommendation": "推荐等级（强烈推荐转小说/建议转小说/可考虑/暂不推荐）",',
        '  "strengths": ["优点1", "优点2"],',
        '  "weaknesses": ["不足1", "不足2"],',
        '  "novelPotential": "小说化建议（如何将冒险改编为小说，200字以内）"',
        "}",
        "```",
    ];
    return lines.join("\n");
}
function buildTranscript(session) {
    const lines = [];
    for (const turn of session.turns) {
        if (turn.role === "player") {
            lines.push(`【玩家】${turn.content}`);
        }
        else if (turn.role === "narrator") {
            lines.push(`【叙述】${turn.content}`);
        }
    }
    return lines.join("\n\n");
}
// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
/** Parse the world JSON from LLM output, tolerating markdown code blocks. */
function parseWorldJson(raw) {
    const json = extractJson(raw);
    if (!json)
        return {};
    try {
        return JSON.parse(json);
    }
    catch {
        return {};
    }
}
/** Parse the score JSON from LLM output. */
function parseScoreJson(raw) {
    const json = extractJson(raw);
    const fallback = {
        totalScore: 0,
        dimensions: {
            narrative: 0,
            engagement: 0,
            creativity: 0,
            coherence: 0,
            character: 0,
            tension: 0,
        },
        summary: "评估解析失败",
        recommendation: "暂不推荐",
        strengths: [],
        weaknesses: [],
        novelPotential: "无法生成建议",
    };
    if (!json)
        return fallback;
    try {
        const data = JSON.parse(json);
        return {
            totalScore: clamp(Number(data.totalScore) || 0, 0, 100),
            dimensions: {
                narrative: clamp(Number(data.dimensions?.narrative) || 0, 0, 100),
                engagement: clamp(Number(data.dimensions?.engagement) || 0, 0, 100),
                creativity: clamp(Number(data.dimensions?.creativity) || 0, 0, 100),
                coherence: clamp(Number(data.dimensions?.coherence) || 0, 0, 100),
                character: clamp(Number(data.dimensions?.character) || 0, 0, 100),
                tension: clamp(Number(data.dimensions?.tension) || 0, 0, 100),
            },
            summary: String(data.summary ?? ""),
            recommendation: String(data.recommendation ?? ""),
            strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
            weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.map(String) : [],
            novelPotential: String(data.novelPotential ?? ""),
        };
    }
    catch {
        return fallback;
    }
}
/** Extract JSON from LLM output, stripping markdown code fences if present. */
function extractJson(raw) {
    const trimmed = raw.trim();
    // Try direct parse first.
    try {
        JSON.parse(trimmed);
        return trimmed;
    }
    catch {
        // not pure JSON
    }
    // Strip markdown code fences.
    const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch?.[1]) {
        return fenceMatch[1].trim();
    }
    // Try to find the first { ... } block.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
        return trimmed.slice(start, end + 1);
    }
    return null;
}
/** Parse metadata block from narrator output. */
function parseMetadata(metaBlock) {
    const result = {
        scene: "",
        location: "",
        status: "",
        gained: [],
        lost: [],
        choices: [],
    };
    if (!metaBlock)
        return result;
    const lines = metaBlock.split("\n");
    for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx < 0)
            continue;
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();
        if (key === "场景" || key === "scene") {
            result.scene = value;
        }
        else if (key === "位置" || key === "location") {
            result.location = value;
        }
        else if (key === "状态" || key === "status") {
            result.status = value;
        }
        else if (key === "获得" || key === "gained") {
            result.gained = value === "无" ? [] : value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        }
        else if (key === "失去" || key === "lost") {
            result.lost = value === "无" ? [] : value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        }
        else if (key === "选择" || key === "choices") {
            // Choices are separated by | or 、
            result.choices = value === "无" ? [] : value.split(/[|｜、]/).map((s) => s.trim()).filter(Boolean);
        }
    }
    return result;
}
// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
/** Create a new game session from a world + initial player state. */
export function createSession(world, player) {
    const now = Date.now();
    return {
        id: generateId("dg"),
        world,
        player: {
            name: player?.name ?? "玩家",
            location: world.startingScene.slice(0, 100) || "",
            inventory: player?.inventory ?? [],
            status: player?.status ?? "健康",
            relationships: player?.relationships ?? {},
        },
        turns: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
        turnCount: 0,
    };
}
/** Create a new turn object. */
export function createTurn(role, content, extra) {
    return {
        id: generateId("turn"),
        role,
        content,
        imageUrl: extra?.imageUrl,
        audioUrl: extra?.audioUrl,
        choices: extra?.choices ?? [],
        timestamp: Date.now(),
    };
}
/** Apply player state updates from a ProcessTurnOutput. */
export function applyPlayerStateUpdate(player, update) {
    const next = { ...player, inventory: [...player.inventory] };
    if (update.location)
        next.location = update.location;
    if (update.status)
        next.status = update.status;
    if (update.inventoryAdd) {
        next.inventory = [...next.inventory, ...update.inventoryAdd];
    }
    if (update.inventoryRemove) {
        next.inventory = next.inventory.filter((item) => !update.inventoryRemove.includes(item));
    }
    return next;
}
function matchGenreVisual(genre) {
    if (/(悬疑|推理|惊悚|恐怖|thriller|mystery|horror)/i.test(genre)) {
        return {
            artDirection: "dark cinematic illustration, noir aesthetic, high-contrast shadows",
            colorPalette: "deep blacks, cold blues, muted golds, blood-red accents",
            lighting: "low-key chiaroscuro lighting, single dramatic light source",
            mood: "tense, ominous, mysterious",
            composition: "off-center subject, negative space, dutch angle",
        };
    }
    if (/(言情|爱情|浪漫|romance)/i.test(genre)) {
        return {
            artDirection: "soft painterly illustration, romantic realism",
            colorPalette: "warm rose, soft cream, golden hour tones, muted teal",
            lighting: "warm diffused lighting, golden hour glow, soft bokeh",
            mood: "tender, intimate, longing",
            composition: "centered, soft focus edges, elegant curves",
        };
    }
    if (/(科幻|sci-?fi|赛博|future)/i.test(genre)) {
        return {
            artDirection: "digital matte painting, concept art, futuristic illustration",
            colorPalette: "neon cyan, deep purple, electric blue, metallic silver",
            lighting: "volumetric lighting, neon glow, lens flare",
            mood: "awe-inspiring, cold, vast",
            composition: "wide-angle perspective, converging lines, scale contrast",
        };
    }
    if (/(奇幻|玄幻|仙侠|fantasy)/i.test(genre)) {
        return {
            artDirection: "epic fantasy illustration, oil painting style, rich textures",
            colorPalette: "emerald green, deep gold, royal purple, ancient bronze",
            lighting: "god rays through clouds, magical particles, warm rim light",
            mood: "mythic, grand, wondrous",
            composition: "heroic low angle, central focal point, sweeping landscape",
        };
    }
    if (/(历史|战争|军事|historical|war)/i.test(genre)) {
        return {
            artDirection: "historical realism painting, muted earthy tones",
            colorPalette: "sepia, dark olive, weathered bronze, dusty red",
            lighting: "overcast diffuse light, smoke-filled atmosphere",
            mood: "somber, epic, weighty",
            composition: "wide tableau, layered depth, architectural framing",
        };
    }
    if (/(都市|现代|现实|urban|contemporary)/i.test(genre)) {
        return {
            artDirection: "contemporary illustration, clean editorial style",
            colorPalette: "neutral grays, accent amber, deep navy, soft white",
            lighting: "natural daylight, urban neon reflections",
            mood: "grounded, modern, introspective",
            composition: "rule of thirds, urban silhouette, minimal foreground",
        };
    }
    return {
        artDirection: "literary fiction illustration, fine art painting style",
        colorPalette: "muted earth tones, soft amber, deep teal, warm ivory",
        lighting: "soft directional light, atmospheric haze",
        mood: "evocative, atmospheric, contemplative",
        composition: "balanced composition, strong silhouette, elegant negative space",
    };
}
//# sourceMappingURL=engine.js.map
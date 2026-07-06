// Storyboard Agent — two-phase storyboard script generation and shot splitting.
//
// V2.0 upgrades:
//   - Shot now includes actingAnchors (face/hand/body micro-expression cues)
//   - Automatic voice matching per character from voice-library (56 profiles)
//   - voiceInstruction field with tone/pace/performance direction
//   - emotionLabel auto-detected from dialogue + narration
//   - Split-shots prompt now includes an "AI Actor Performance Manual" that
//     instructs the LLM to produce concrete muscular/physical acting cues
//     instead of abstract emotion adjectives.
//
// Phase 1: script() — chapter text + asset catalog → storyboard script
// Phase 2: splitShots() — storyboard script → shot list (each shot ≤15s)
// Phase 2b: reviewShots() — secondary pass to validate visual feasibility
import { createAgentRuntime } from "./base.js";
import { parseAndValidate } from "./json-utils.js";
import { z } from "zod";
import { buildActingAnchors, detectEmotions, buildVoicePerformanceCue } from "../video/emotion-anchors.js";
import { matchVoice } from "../video/voice-library.js";
// ---------------------------------------------------------------------------
// Zod schemas for robust JSON parsing
// ---------------------------------------------------------------------------
const StoryboardSceneEntrySchema = z.object({
    id: z.string(),
    text: z.string(),
    title: z.string().optional(),
    location: z.string().optional(),
    timeOfDay: z.string().optional(),
    characters: z.array(z.string()).optional(),
    props: z.array(z.string()).optional(),
    mood: z.string().optional(),
});
const StoryboardScriptSchema = z.object({
    title: z.string(),
    totalScenes: z.number(),
    estimatedDuration: z.string(),
    style: z.string(),
    scenes: z.array(StoryboardSceneEntrySchema),
});
export const ShotSchema = z.object({
    shotNumber: z.number(),
    sceneId: z.string(),
    shotType: z.string(),
    cameraMovement: z.string(),
    prompt: z.string(),
    actingAnchors: z.string().default(""),
    emotionLabel: z.string().default(""),
    voiceId: z.string().optional(),
    voiceInstruction: z.string().optional(),
    duration: z.number().min(4).max(15),
    dialogue: z.string().optional(),
    speaker: z.string().optional(),
    characters: z.array(z.string()),
    scenes: z.array(z.string()),
    props: z.array(z.string()).optional(),
    lighting: z.string().optional(),
    description: z.string(),
});
export const ShotListSchema = z.object({
    totalShots: z.number(),
    totalDuration: z.number(),
    shots: z.array(ShotSchema),
});
export const ShotAspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
const ShotReviewResultSchema = z.object({
    feasible: z.boolean(),
    issues: z.array(z.object({
        shotNumber: z.number(),
        severity: z.enum(["low", "medium", "high"]),
        issue: z.string(),
        suggestion: z.string(),
    })),
    suggestions: z.array(z.string()),
});
// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function buildScriptSystemPrompt() {
    return `你是一位专业的影视分镜师，擅长将小说章节改编为可用于AI视频生成的分镜脚本。

任务：根据提供的小说章节文本和资产目录（角色/场景/道具），将章节拆分为多个场景（storyboard scenes）。

要求：
1. 严格忠于原著文本，不添加原文没有的情节
2. 每个场景应该是一个相对完整的叙事单元（地点/时间/人物相对集中）
3. 每个场景标注：地点、时间、出场人物、涉及道具、情绪氛围
4. 场景的text字段必须是该场景对应的原文文本（可适当精简但不能改写原意）
5. 场景数量根据章节长度决定，一般每章3-8个场景
6. 输出JSON格式，不要输出其他内容

可用资产（必须使用这些角色/场景/道具名称）：
{assets_section}`;
}
function buildScriptUserPrompt(params) {
    const assetsSection = formatAssetsSection(params.assets);
    return `小说章节文本：
"""
${params.chapterText.slice(0, 6000)}
"""

可用资产：
${assetsSection}

请将上述章节拆分为分镜脚本，输出严格的JSON格式：
{
  "title": "章节标题",
  "totalScenes": 场景数量,
  "estimatedDuration": "预估总时长（如3-5分钟）",
  "style": "整体视觉风格",
  "scenes": [
    {
      "id": "S1",
      "text": "该场景对应的原文",
      "title": "场景标题",
      "location": "地点",
      "timeOfDay": "日/夜/黄昏等",
      "characters": ["出场角色名"],
      "props": ["涉及道具"],
      "mood": "情绪氛围关键词"
    }
  ]
}`;
}
function buildSplitShotsPrompt(params) {
    const assetsSection = formatAssetsSection(params.assets);
    const scenesText = params.script.scenes
        .map((s) => `【${s.id}】${s.title ?? ""}（${s.location ?? ""}，${s.timeOfDay ?? ""}）
人物：${(s.characters ?? []).join("、") || "无"}
情绪：${s.mood ?? "自然"}
原文：${s.text.slice(0, 500)}`)
        .join("\n\n");
    return `你是一位顶级AI短剧导演兼表演指导，深谙AI视频模型（Seedance/Grok）的演技特性。

## 核心认知：AI演员的特点
- AI视频模型看不懂抽象情绪词：写"她很委屈""他愤怒了"，AI只会给你一张平静的脸
- AI视频模型看得懂具体动作指令：写"眼眶泛红，嘴唇微微颤抖，紧咬下唇"，AI就能演出委屈
- 短剧观众3秒定生死：开头没有表情钩子直接划走
- 声画必须同步：声音情绪和面部表情不能两张皮
- 微表情>大动作：短剧最上头的是眼神变化、嘴角抽动、手指一颤这些细节

## AI演员表演手册（必须遵守）
写情绪时，禁止只写情绪形容词（如"很生气""很委屈"），必须写至少2个具体表演锚点：
- 面部锚点：眉头/眼神/嘴角/牙关/下颌的具体状态
- 手部锚点：攥拳/攥衣角/捂嘴/擦泪/手指动作
- 身体锚点：前倾/缩肩/后退/僵硬/姿态
例：
- 愤怒→眉头紧锁眉心拧起，拳头攥紧指节发白，身体微微前倾压迫对方
- 委屈→眼眶泛红，嘴唇微微颤抖，紧咬下唇，攥紧衣角
- 开心→眼睛弯成月牙，嘴角上扬带笑，动作轻快
- 惊恐→眼睛瞪大瞳孔放大，手捂住嘴，身体瞬间僵住
- 霸总→表情沉稳不怒自威，眼神深邃有掌控力，单手插兜

## 音色匹配规则
为有台词的角色匹配合适音色，voiceId从以下常用音色中选择：
- 青年女主（15-22岁清亮女声）：F03A（少女清亮利落音）
- 温柔女主（15-22岁软甜女声）：F03B（少女软糯甜感音）
- 冷感女主（20-28岁清冷女声）：F04A（少御清冷音）
- 御姐/女总裁（25-38岁）：F05A（御姐冷艳音）
- 霸总/男主（28-40岁低沉磁性）：M04A（霸总低磁音）
- 青年男主（20-30岁阳光）：M03B（青年阳光音）
- 温柔男二（20-30岁温润）：M03A（青年温润音）
- 中年父亲（40-60岁温厚）：M05D（慈父温厚音）
- 中年母亲（38-55岁温厚）：F06B（中年母亲温厚音）
- 系统/AI音：S02A（系统女声）
- 旁白：S03A（短剧旁白男声）

voiceInstruction写发声方式：
- 愤怒→语气压着怒气，咬字变重，一字一句
- 委屈→声音很轻，尾音发虚，带抽泣感
- 开心→语气轻快带笑音，语速偏快
- 霸总→声音低沉有磁性，语速中慢，句尾下沉
- 温柔→声音柔和，语速偏慢，温暖安抚

任务：将以下分镜脚本拆分为具体的镜头列表（shot list）。每个镜头时长4-${params.maxDuration}秒，适合AI视频生成。

可用资产：
${assetsSection}

分镜脚本：
${scenesText}

要求：
1. 每个镜头必须有：镜头编号、景别、运镜、英文画面提示词prompt、中文描述description、时长、出场人物
2. prompt字段用英文，包含：主体、动作、光线、构图、电影感风格。必须包含具体的表演动作（如"eyebrows furrowed, fists clenched"），不能只写情绪词
3. actingAnchors字段用中文，写面部+手部+身体的具体表演锚点（如"眉头紧锁，拳头攥紧，身体前倾"），不要写抽象情绪词
4. emotionLabel字段写该镜头的主要情绪关键词（如"愤怒""委屈""开心"）
5. 有台词的镜头必须填写：speaker（说话人）、dialogue（台词内容）、voiceId（音色ID）、voiceInstruction（发声方式指导）
6. 无台词镜头voiceId/voiceInstruction留空，但actingAnchors仍需填写（情绪通过表情肢体传达）
7. 镜头顺序必须与场景顺序一致，保持叙事连贯性
8. 相邻镜头之间要有景别变化（不能全是特写或全是全景）
9. 输出严格JSON格式，不要输出其他内容

输出JSON格式：
{
  "totalShots": 总镜头数,
  "totalDuration": 总时长秒数,
  "shots": [
    {
      "shotNumber": 1,
      "sceneId": "S1",
      "shotType": "close-up|medium shot|wide shot|over-the-shoulder|extreme close-up",
      "cameraMovement": "static|slow push-in|slow pull-back|pan left|tracking shot|slow tilt up|dolly zoom",
      "prompt": "English visual prompt with concrete actions and expressions, cinematic, shallow depth of field",
      "actingAnchors": "眉头紧锁，拳头攥紧指节发白，身体微微前倾（中文具体表演锚点）",
      "emotionLabel": "愤怒",
      "voiceId": "M04A",
      "voiceInstruction": "语气压着怒气，咬字变重，一字一句",
      "duration": 5,
      "dialogue": "台词内容（无台词则省略）",
      "speaker": "角色名（无台词则省略）",
      "characters": ["角色名"],
      "scenes": ["场景名"],
      "props": ["道具名"],
      "lighting": "光线描述",
      "description": "中文镜头描述"
    }
  ]
}`;
}
function formatAssetsSection(assets) {
    const lines = [];
    if (assets.characters.length > 0) {
        lines.push("角色：");
        for (const c of assets.characters) {
            const aliases = c.aliases?.length ? `（别名：${c.aliases.join("、")}）` : "";
            const gender = c.gender ? `，性别：${c.gender}` : "";
            const arch = c.archetype ? `，类型：${c.archetype}` : "";
            lines.push(`- ${c.name}${aliases}：${c.description}${gender}${arch}`);
        }
    }
    if (assets.scenes.length > 0) {
        lines.push("\n场景：");
        for (const s of assets.scenes) {
            const aliases = s.aliases?.length ? `（别名：${s.aliases.join("、")}）` : "";
            lines.push(`- ${s.name}${aliases}：${s.description}`);
        }
    }
    if (assets.props.length > 0) {
        lines.push("\n道具：");
        for (const p of assets.props) {
            const aliases = p.aliases?.length ? `（别名：${p.aliases.join("、")}）` : "";
            lines.push(`- ${p.name}${aliases}：${p.description}`);
        }
    }
    return lines.join("\n");
}
export function createStoryboardAgent(ctx) {
    const runtime = createAgentRuntime(ctx);
    async function callLLM(messages, schema) {
        const response = await runtime.chat(messages, {
            temperature: 0.5,
            maxTokens: 8000,
        });
        const text = response.content ?? "";
        const parsed = parseAndValidate(text, schema);
        if (parsed === null) {
            throw new Error(`storyboard agent output: failed to parse or validate JSON`);
        }
        return parsed;
    }
    return {
        // Phase 1: Generate storyboard script from chapter text
        async script({ chapterText, assets }) {
            return callLLM([
                { role: "system", content: buildScriptSystemPrompt() },
                { role: "user", content: buildScriptUserPrompt({ chapterText, assets }) },
            ], StoryboardScriptSchema);
        },
        // Phase 2: Split script into production shots
        async splitShots({ script, assets, maxDuration = 15 }) {
            const result = await callLLM([
                { role: "system", content: "你是顶级AI短剧导演兼表演指导，输出严格JSON。" },
                {
                    role: "user",
                    content: buildSplitShotsPrompt({ script, assets, maxDuration }),
                },
            ], ShotListSchema);
            // V2 post-processing: auto-fill any missing acting/voice fields so that
            // even if the LLM skips them (it sometimes does), the pipeline still has
            // concrete performance cues for the video generator.
            const voiceCache = new Map();
            for (const shot of result.shots) {
                // Ensure actingAnchors is present and concrete
                const sourceText = `${shot.dialogue ?? ""} ${shot.description} ${shot.emotionLabel ?? ""}`;
                if (!shot.actingAnchors || shot.actingAnchors.length < 5) {
                    shot.actingAnchors = buildActingAnchors(sourceText);
                }
                // Auto-detect emotion label if missing
                if (!shot.emotionLabel) {
                    const emotions = detectEmotions(sourceText, 1);
                    shot.emotionLabel = emotions[0] ?? "";
                }
                // Auto-match voice for speaking characters
                if (shot.dialogue && shot.speaker && !shot.voiceId) {
                    const char = assets.characters.find((c) => c.name === shot.speaker ||
                        c.aliases?.includes(shot.speaker ?? ""));
                    const cacheKey = shot.speaker;
                    let matched;
                    if (voiceCache.has(cacheKey)) {
                        matched = voiceCache.get(cacheKey);
                    }
                    else {
                        matched = matchVoice({
                            gender: char?.gender,
                            age: char?.age,
                            archetype: char?.archetype ?? shot.speaker,
                            role: shot.speaker,
                        });
                        voiceCache.set(cacheKey, matched);
                    }
                    shot.voiceId = matched.profile.id;
                    if (!shot.voiceInstruction && shot.emotionLabel) {
                        shot.voiceInstruction = buildVoicePerformanceCue(shot.emotionLabel);
                    }
                }
            }
            return result;
        },
        // Phase 2b: Review shots for visual feasibility
        async reviewShots({ chapterText, shots }) {
            const reviewPrompt = `你是一位AI视频生成专家，请审查以下分镜镜头列表是否适合AI视频生成。

章节原文：
"""
${chapterText.slice(0, 3000)}
"""

镜头列表：
${JSON.stringify(shots.shots.slice(0, 30), null, 2)}

请检查：
1. 每个镜头是否只包含一个主要动作（AI视频4-15秒内只能完成1-2个动作）
2. 是否有过于复杂的场景切换或人物过多
3. 人物站位和动作是否连续合理
4. 时长是否合理（简单动作4-5秒，复杂情绪6-8秒，运镜8-12秒）
5. 表演锚点是否具体（不能只有抽象情绪词）
6. 英文prompt是否适合视频生成（不能太文学化）
7. 情绪节奏是否有起伏（不能全程一个情绪）

输出严格JSON：
{
  "feasible": true/false,
  "issues": [{"shotNumber": 1, "severity": "low|medium|high", "issue": "问题", "suggestion": "修改建议"}],
  "suggestions": ["整体改进建议"]
}`;
            const response = await runtime.chat([
                { role: "system", content: "你是AI视频生成专家，输出严格JSON。" },
                { role: "user", content: reviewPrompt },
            ], { temperature: 0.3, maxTokens: 4000 });
            const parsed = parseAndValidate(response.content ?? "", ShotReviewResultSchema);
            if (parsed === null) {
                throw new Error(`shot review output: failed to parse or validate JSON`);
            }
            return parsed;
        },
    };
}
//# sourceMappingURL=storyboard.js.map
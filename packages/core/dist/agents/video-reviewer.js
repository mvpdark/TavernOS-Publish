// Video Reviewer Agent (V2.0)
//
// V2.0 upgrades:
//   - 9 review dimensions (added face_expr, body_lang, voice_visual_sync, compliance)
//   - Acting diagnosis dictionary with concrete fix instructions
//   - Compliance diagnosis dictionary for content risk detection
//   - 5-grade scoring (A/B/C/D/F) instead of 3-grade
//   - Post-fix suggestion field (distinguishes "can be fixed in post" vs "must reroll")
//   - Reroll prompts must use concrete acting anchors, never vague criticism
import { createAgentRuntime } from "./base.js";
import { parseAndValidate } from "./json-utils.js";
import { z } from "zod";
// ---------------------------------------------------------------------------
// Zod schema for robust JSON parsing
// ---------------------------------------------------------------------------
const VideoReviewIssueSchema = z.object({
    severity: z.enum(["critical", "major", "minor"]),
    dimension: z.enum([
        "visual_quality",
        "character_consistency",
        "motion_naturalness",
        "scene_compliance",
        "face_expr",
        "body_lang",
        "voice_visual_sync",
        "technical",
        "compliance",
    ]),
    description: z.string(),
    fixInstruction: z.string().optional(),
});
const VideoReviewResultSchema = z.object({
    verdict: z.enum(["pass", "borderline", "fail"]),
    score: z.number().min(0).max(100),
    issues: z.array(VideoReviewIssueSchema),
    postFixSuggestion: z.string().optional(),
    rerollPrompt: z.string().optional(),
    summary: z.string(),
});
// ---------------------------------------------------------------------------
// Acting diagnosis dictionary — maps common acting failures to concrete fixes
// ---------------------------------------------------------------------------
const ACTING_DIAGNOSIS = {
    "愤怒面瘫": {
        desc: "愤怒场景但眉头未皱，眼神太平静，牙关未咬紧，面部像戴了面具",
        fix: "加强表演：眉头紧锁眉心拧起，眼神锐利冰冷死死盯住对方，牙关咬紧下颌紧绷，拳头攥紧指节发白",
    },
    "委屈不哭": {
        desc: "委屈/哭戏场景但眼眶未红，嘴唇未颤抖，表情太平淡",
        fix: "加强表演：眼眶泛红含泪，嘴唇微微颤抖，紧咬下唇不让眼泪掉下来，手指攥紧衣角，眨眼频率变快忍泪",
    },
    "开心假笑": {
        desc: "开心场景但只有嘴在笑，眼睛没有弯起，眼神不亮",
        fix: "加强表演：眼睛弯成月牙，眼角有笑纹，眼神明亮有光，笑时肩膀轻微抖动，带自然笑音",
    },
    "惊恐不恐": {
        desc: "惊恐场景但瞳孔未放大，眉毛未上扬，表情像正常发呆",
        fix: "加强表演：眼睛瞪大瞳孔放大，眉毛高高上扬聚拢成八字，嘴巴微张倒吸冷气，身体瞬间僵硬，呼吸停顿一拍",
    },
    "霸总不霸": {
        desc: "霸总/上位者场景但表情太软，眼神没有威慑力，姿态太放松",
        fix: "加强表演：表情沉稳不怒自威，眼神深邃有掌控力，下颌线紧绷，单手插兜姿态挺拔，眼神从上往下审视对方",
    },
    "哭戏假哭": {
        desc: "哭戏但没有眼泪，面部肌肉不动，只有声音在哭",
        fix: "加强表演：眼泪从眼角滑落，眼眶鼻子通红，面部肌肉微微扭曲，肩膀耸动抽泣，胸口剧烈起伏",
    },
    "温柔不柔": {
        desc: "温柔场景但表情太硬，眼神太冷，像在瞪人",
        fix: "加强表演：眼神柔和温暖像有水光，嘴角带浅浅笑意，动作轻柔缓慢，说话时语气软下来",
    },
    "紧张不慌": {
        desc: "紧张场景但身体太放松，手部无动作，表情太平静",
        fix: "加强表演：手指不安绞动或摸鼻子，频繁吞咽口水，眼神躲闪不敢直视，额头微微冒汗，呼吸浅快",
    },
    "声画脱节": {
        desc: "台词是怒吼但面部表情平静/台词是哭腔但脸在笑/声音和画面情绪不匹配",
        fix: "修正表演：说话时表情必须贴合台词情绪，面部微表情和声音情绪保持一致",
    },
};
// ---------------------------------------------------------------------------
// Compliance diagnosis dictionary — maps common compliance risks to concrete fixes
// ---------------------------------------------------------------------------
const COMPLIANCE_DIAGNOSIS = {
    "品牌logo暴露": {
        desc: "画面中可见清晰的品牌商标、logo或产品包装（非剧情需要的虚构品牌）",
        fix: "遮挡或模糊处理画面中的品牌标识区域，或重新生成避免品牌元素出现，替换为虚构品牌名称",
    },
    "政治符号误用": {
        desc: "画面中出现国旗/国徽/领导人形象/政治标语等政治符号且使用方式不当",
        fix: "移除政治符号元素，重新生成不含政治敏感内容的画面，改用中性背景",
    },
    "色情裸露": {
        desc: "画面中出现裸露、色情暗示、过度暴露的身体部位或性暗示动作",
        fix: "调整服装为保守款式，移除性暗示动作，重新生成符合平台审核的内容",
    },
    "暴力血腥": {
        desc: "画面中出现过度暴力、血腥、断肢、内脏、真实武器伤害等过激内容",
        fix: "弱化暴力表现，移除血腥画面，改为暗示性镜头或远景处理，重新生成",
    },
    "广告法违规": {
        desc: "台词或画面中出现绝对化用语（最/第一/国家级）或虚假宣传暗示",
        fix: "修改台词删除绝对化用语，改为客观描述，避免疗效/功效性承诺表述",
    },
    "版权角色": {
        desc: "画面中出现受版权保护的知名角色形象（动漫/影视/游戏角色）",
        fix: "重新设计原创角色形象，避免与已知IP角色相似，修改发型/服装/特征",
    },
    "价值观风险": {
        desc: "画面或内容存在歧视、侮辱、低俗、不良引导等价值观问题",
        fix: "调整内容方向，移除歧视性/侮辱性元素，传递正向价值观，重新生成",
    },
    "平台违规": {
        desc: "内容触犯短视频平台（抖音/快手/B站）常见拒审规则，如危险行为模仿、虚假信息等",
        fix: "根据平台规则调整内容，移除违规元素，确保符合平台社区规范，重新生成",
    },
    "敏感地标": {
        desc: "画面中出现敏感政治地标建筑或军事设施等敏感场景",
        fix: "替换为虚构场景或普通背景，避免敏感地标出现，重新生成",
    },
    "未成年风险": {
        desc: "画面中涉及未成年人形象出现在不适宜的场景或内容中",
        fix: "调整角色设定为成年人，移除涉及未成年人的不适宜内容，重新生成",
    },
};
// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------
function buildReviewPrompt(params) {
    const { clip, scriptContext, referenceImages } = params;
    const refNote = referenceImages.length > 0
        ? `参考图角色/场景：${referenceImages.length}张参考图已提供（包含角色头像、场景图），请检查视频人物是否与参考图一致。`
        : "无参考图（请基于scriptContext判断角色一致性）。";
    return `你是顶级AI短剧质检总监兼表演指导。请审核以下AI生成的视频片段。

## 审核维度（共9维）

### 技术维度（5项）
1. **visual_quality（画面质量）**：分辨率、清晰度、伪影、噪点、闪烁、帧间一致性、黑帧/花帧
2. **character_consistency（角色一致性）**：与参考图脸型/发型/服装/年龄匹配，跨帧脸部稳定，无变脸/换人种
3. **motion_naturalness（动作自然度）**：肢体运动流畅，无扭曲/穿模/多指/缺指/鬼畜抖动/反关节/漂浮感
4. **scene_compliance（场景匹配）**：场景/道具/光线是否匹配提示词，运镜是否符合要求，有无突兀跳变
5. **technical（技术合规）**：时长4-15秒、无水印、无UI、无多宫格、无故事板线稿残留

### 演技维度（3项，核心！）
6. **face_expr（面部表演）**：眉毛/眼睛/嘴巴/下颌是否有符合情绪的微表情
   - 愤怒场景：必须有眉头紧锁/眼神锐利/牙关咬紧
   - 委屈场景：必须有眼眶泛红/嘴唇微颤/眼神下垂
   - 开心场景：必须有眼睛弯起/嘴角上扬/眼神明亮
   - 惊恐场景：必须有瞳孔放大/眉毛上扬/嘴巴微张
   - 霸总场景：必须有眼神锐利/下颌紧绷/表情沉稳
   - 面瘫检查：情绪强烈场景但脸部完全无表情变化，直接fail
7. **body_lang（肢体与手部表演）**：拳头/手指/肩膀/身体姿态是否传达情绪
   - 愤怒：拳头攥紧/身体前倾/肩膀绷紧
   - 委屈：攥衣角/缩肩/擦泪/咬唇
   - 紧张：手指绞动/摸鼻子/蹭裤子/频繁吞咽
   - 手部崩坏检查：手指数量/形态正常，无穿模扭曲
8. **voice_visual_sync（声画同步）**：口型是否与台词匹配，说话时表情是否符合台词情绪

### 合规维度（1项，发布前必查！）
9. **compliance（内容合规）**：检测AI生成视频中的内容风险，避免发布到短视频平台被审核拒绝
   - 政治敏感：国旗/国徽/领导人形象/政治标语的不当使用
   - 暴力色情：过度暴力/血腥/色情暗示/裸露内容
   - 广告法违规：绝对化用语（最/第一/国家级）、虚假宣传暗示
   - 版权风险：可见品牌logo/水印/受版权保护的角色形象
   - 价值观风险：歧视/侮辱/不良引导/低俗内容
   - 平台规则：短视频平台（抖音/快手/B站）常见拒审原因

## 硬fail条件（任一满足直接fail，score<60）
- 脸部明显崩坏（五官变形/多眼/歪嘴/融化/变脸）
- 严重肢体扭曲（多指/反关节/穿模）
- 人物与参考图完全不像（换脸/换人种/换性别）
- 与剧本场景/角色完全不符
- 水印/UI/故事板线稿大面积残留
- 面部完全无表情（面瘫脸），尤其是情绪强烈场景
- 大面积闪烁/黑帧/花屏
- 视频时长不足提示词要求的70%
- 明显政治敏感内容（国旗误用/领导人形象/政治标语）
- 明显色情/裸露内容
- 明显暴力血腥内容
- 可见的他人注册商标/品牌logo（非素材本身）

## 后期可救条件（borderline，60-79分，标注postFixSuggestion）
- 最后1-2秒轻微崩坏 → "裁剪尾部最后N帧"
- 手部边缘轻微模糊 → 可接受或"轻微模糊手部区域"
- 肤色轻微不统一 → "调色统一肤色"
- 运镜轻微抖动 → "后期加稳定器"
- 微表情不够到位但其他都好 → 可接受

## 评分标准
- A级（90-100）：优秀，直接使用，可做封面/高光片段
- B级（80-89）：良好，直接使用
- C级（70-79）：可用，标注minor issues
- D级（60-69）：及格，必须有postFixSuggestion或rerollPrompt
- F级（<60）：不合格，必须reroll，给出精准rerollPrompt

## 演技问题诊断词典（遇到演技问题时使用以下描述，禁止笼统说"情绪不到位"）
${Object.entries(ACTING_DIAGNOSIS)
        .map(([k, v]) => `- ${k}：${v.desc} → 修复：${v.fix}`)
        .join("\n")}

## 合规问题诊断词典（遇到合规风险时使用以下描述，禁止笼统说"内容不合规"）
${Object.entries(COMPLIANCE_DIAGNOSIS)
        .map(([k, v]) => `- ${k}：${v.desc} → 修复：${v.fix}`)
        .join("\n")}

## 待审核视频信息
- 视频提示词（prompt）：${clip.prompt}
- 时长：${clip.generateConfig?.duration ?? "?"}秒
- 模型：${clip.generateConfig?.model ?? "?"}
${scriptContext ? `- 剧本上下文：${scriptContext.slice(0, 2000)}` : ""}
- ${refNote}

## rerollPrompt写作规范（核心！）
1. rerollPrompt必须是"追加指令"格式：在原提示词基础上追加具体修复指令
2. fixInstruction必须具体到肌肉动作，从演技诊断词典选取
3. 技术问题+演技问题分行写
4. 一次reroll最多修3个问题，优先修最影响观感的
5. 好例子："在原提示词基础上追加：1.右手手指修正为5根自然握拳；2.加强愤怒表演：眉头紧锁眉心拧起，眼神锐利死死盯住对方，牙关咬紧下颌紧绷，拳头攥紧指节发白；3.说话时口型与台词同步。其他保持不变。"
6. 坏例子（禁止）："视频质量不好，请重新生成，注意情绪和表情。"

请输出严格JSON格式：
{
  "verdict": "pass|borderline|fail",
  "score": 0-100,
  "issues": [{"severity": "critical|major|minor", "dimension": "维度名", "description": "具体问题描述", "fixInstruction": "具体修复指令（从演技诊断词典选取）"}],
  "postFixSuggestion": "后期修复建议（仅borderline时填写，如'裁剪最后2秒'）",
  "rerollPrompt": "reroll追加指令（fail/borderline需重生时填写）",
  "summary": "一句话总结审核结论"
}`;
}
export function createVideoReviewer(ctx) {
    const runtime = createAgentRuntime(ctx);
    return {
        async review({ videoClip, scriptContext = "", referenceImages = [] }) {
            const prompt = buildReviewPrompt({
                clip: videoClip,
                scriptContext,
                referenceImages,
            });
            const response = await runtime.chat([
                {
                    role: "system",
                    content: "你是顶级AI短剧质检总监兼表演指导，输出严格JSON，中文回复。",
                },
                { role: "user", content: prompt },
            ], { temperature: 0.2, maxTokens: 2000 });
            const raw = parseAndValidate(response.content ?? "", VideoReviewResultSchema);
            if (raw === null) {
                throw new Error(`video review output: failed to parse or validate JSON`);
            }
            // Derive grade from score
            const grade = raw.score >= 90 ? "A" :
                raw.score >= 80 ? "B" :
                    raw.score >= 70 ? "C" :
                        raw.score >= 60 ? "D" : "F";
            return {
                ...raw,
                grade,
            };
        },
    };
}
// ---------------------------------------------------------------------------
// Constants exported for pipeline defaults
// ---------------------------------------------------------------------------
export const VIDEO_REVIEW_DIMENSIONS = [
    "visual_quality",
    "character_consistency",
    "motion_naturalness",
    "scene_compliance",
    "face_expr",
    "body_lang",
    "voice_visual_sync",
    "technical",
    "compliance",
];
//# sourceMappingURL=video-reviewer.js.map
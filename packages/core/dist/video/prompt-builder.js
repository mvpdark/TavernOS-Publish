// Video Prompt Builder (V2.0)
//
// Assembles a production-ready video generation prompt from a Shot object.
// Combines:
//   1. English visual prompt (subject/action/lighting/composition)
//   2. Chinese acting anchors (face/hand/body micro-expressions)
//   3. Voice anchoring + dialogue + performance direction (for dialogue shots)
//   4. Quality/cinematography suffix
//
// Also builds reference image URL list by looking up character avatars and
// scene images from the project directory (via a callback).
import { buildAnchorSentence, ALL_VOICES } from "./voice-library.js";
/**
 * Build a quality suffix that works across Seedance/Grok/Jimeng.
 */
function buildQualitySuffix(language) {
    if (language === "en") {
        return ", cinematic lighting, shallow depth of field, film grain, 4K, photorealistic, natural skin texture, realistic facial expressions, lip sync when speaking";
    }
    return "，电影感光影，浅景深，电影质感，4K高清，真人写实，自然肤质，微表情细腻真实，说话时口型自然同步";
}
/**
 * Build voice/dialogue block for a shot.
 * For Chinese providers (Seedance/Jimeng): voice anchor + dialogue line + performance cue.
 * For English providers (Grok): English voice tag + dialogue in quotes.
 */
function buildVoiceBlock(shot, language) {
    if (!shot.dialogue || !shot.speaker)
        return "";
    if (language === "en") {
        const voiceTag = shot.voiceId ? getEnglishVoiceTag(shot.voiceId) : "natural voice matching character";
        return ` ${shot.speaker} says in a ${voiceTag} voice: "${shot.dialogue}"`;
    }
    // Chinese block
    const parts = [];
    if (shot.voiceId) {
        const profile = ALL_VOICES.find((v) => v.id === shot.voiceId);
        if (profile) {
            parts.push(buildAnchorSentence(profile));
        }
    }
    if (shot.voiceInstruction) {
        parts.push(`发声方式：${shot.voiceInstruction}`);
    }
    parts.push(`${shot.speaker}说："${shot.dialogue}"`);
    parts.push("口型与台词自然同步，情绪通过声音和面部微表情共同传达");
    return "\n\n声音与表演要求：" + parts.join("；");
}
function getEnglishVoiceTag(voiceId) {
    const map = {
        "F03A": "clear bright young woman",
        "F03B": "soft sweet young woman",
        "F03C": "bright energetic young woman",
        "F03D": "soft shy young woman",
        "F03E": "stubborn determined young woman",
        "F03F": "cold calm young woman",
        "F04A": "cold elegant young woman",
        "F05A": "mature cold authoritative woman",
        "F05B": "warm gentle mature woman",
        "F05C": "husky mature woman",
        "F06A": "elegant middle-aged wealthy woman",
        "F06B": "warm kind middle-aged mother",
        "M02A": "clear bright teenage boy",
        "M03A": "warm gentle young man",
        "M03B": "bright cheerful young man",
        "M03C": "playful confident young man",
        "M04A": "deep magnetic mature man, authoritative CEO-like",
        "M04B": "deep restrained mature man",
        "M04C": "cold hard stoic man",
        "M05A": "deep tough gruff man",
        "M05D": "warm kind father",
        "S02A": "calm female system AI",
        "S03A": "deep male narrator",
    };
    return map[voiceId] ?? "clear natural voice";
}
/**
 * Build acting anchor block (Chinese for Seedance/Jimeng, English for Grok).
 */
function buildActingBlock(shot, language) {
    const anchors = shot.actingAnchors?.trim();
    if (!anchors)
        return "";
    if (language === "en") {
        // Convert Chinese acting anchors to simple English cues
        const emotion = shot.emotionLabel ?? "";
        const emoMap = {
            "愤怒": "eyebrows furrowed, fists clenched, intense stare, leaning forward aggressively",
            "委屈": "eyes glistening with tears, lips trembling, biting lower lip, clutching clothes",
            "难过": "eyes downcast, corners of mouth turned down, shoulders slumped",
            "哭": "tears rolling down cheeks, red eyes and nose, trembling lips, shoulders shaking",
            "开心": "eyes crinkling into crescents, bright smile, lively body language",
            "笑": "warm smile, crinkled eyes, relaxed shoulders",
            "惊恐": "eyes wide with fear, pupils dilated, mouth slightly open, body frozen",
            "紧张": "tense expression, fidgeting fingers, frequent swallowing, avoiding eye contact",
            "害怕": "fearful eyes, trembling, stepping back, hugging self",
            "震惊": "eyes wide open, eyebrows raised, mouth agape, body frozen in shock",
            "冷淡": "expressionless face, distant cold eyes, arms crossed, keeping distance",
            "疲惫": "tired hollow eyes, dark circles, slouched posture, rubbing temples",
            "冷静": "calm composed expression, steady gaze, relaxed controlled posture",
            "温柔": "soft warm eyes, gentle smile, slow tender movements",
            "害羞": "blushing cheeks, downcast eyes, shy smile, looking away",
            "霸总": "composed authoritative expression, intense controlled gaze, tight jawline, one hand in pocket",
            "坚定": "determined resolute eyes, firm set jaw, upright posture",
            "撒娇": "pleading watery eyes, slight pout, head tilted, gently tugging arm",
            "暧昧": "seductive gaze, half-smile, lowered lashes, close proximity",
            "压迫": "calm intimidating expression, piercing stare, commanding posture",
            "不屑": "sneering smirk, dismissive sidelong glance, raised eyebrow, leaning back",
        };
        return `, ${emoMap[emotion] ?? "natural expressive facial expressions and body language"}`;
    }
    return `\n\n表演指导：${anchors}`;
}
/**
 * Assemble a complete video generation prompt from a Shot.
 *
 * @param shot - The shot to build the prompt for.
 * @param options - Build options (language, model, omni mode).
 * @returns BuiltPrompt with final prompt string and reference image URLs.
 */
export function buildVideoPrompt(shot, options = {}) {
    const language = options.language ?? "zh";
    const qualitySuffix = buildQualitySuffix(language);
    const actingBlock = buildActingBlock(shot, language);
    const voiceBlock = buildVoiceBlock(shot, language);
    // Base English visual prompt (always present — video models respond best to English)
    let prompt = shot.prompt?.trim() ?? "";
    if (!prompt) {
        prompt = shot.description?.trim() ?? "";
    }
    // Append acting cues
    prompt += actingBlock;
    // Append quality suffix
    prompt += qualitySuffix;
    // Append voice/dialogue block
    if (voiceBlock) {
        prompt += voiceBlock;
    }
    return {
        prompt,
        referenceImageUrls: [], // Reference images are collected externally (by caller looking up character avatars)
    };
}
/**
 * Build an enhanced prompt for jimeng-direct omni_reference mode.
 * Prepends @image_file_N role description lines.
 */
export function buildOmniPrompt(shot, referenceImageUrls, referenceRoles) {
    const base = buildVideoPrompt(shot, { language: "zh", omniReference: true, referenceImageCount: referenceImageUrls.length });
    const prefixLines = [];
    for (let i = 0; i < referenceImageUrls.length; i++) {
        const role = referenceRoles?.[i] ??
            (i === 0 ? "故事板/分镜参考图" :
                i < 3 ? "角色参考图" : "场景参考图");
        prefixLines.push(`@image_file_${i + 1} = ${role}。`);
    }
    // Convert inline @图N references to @image_file_N (jimeng API format)
    let finalPrompt = base.prompt
        .replace(/@图\s*(\d+)/g, (_m, n) => `@image_file_${n}`)
        .replace(/@Image\s*(\d+)/g, (_m, n) => `@image_file_${n}`);
    if (prefixLines.length > 0) {
        finalPrompt = prefixLines.join("\n") + "\n\n" + finalPrompt;
    }
    return {
        prompt: finalPrompt,
        referenceImageUrls,
    };
}
/**
 * Determine the optimal language for a given model id.
 * Jimeng/Seedance models work best with Chinese acting cues;
 * Grok/MJ Video models work best with English.
 */
export function detectPromptLanguage(model) {
    if (!model)
        return "zh";
    const m = model.toLowerCase();
    if (m.includes("grok") || m.includes("mj_") || m.includes("midjourney") || m.includes("pixverse")) {
        return "en";
    }
    return "zh";
}
//# sourceMappingURL=prompt-builder.js.map
// packages/core/src/character-engine/inner-voice.ts
// InnerVoice — zero-LLM inner monologue generator (template-based).
//
// Generates deterministic inner monologue text from a character's mood label
// and intensity. Template variation is selected via FNV-1a hash so the same
// (characterId, chapterIndex) always yields the same line.
//
// This module is stateless — it does not persist anything. The output
// InnerVoiceBlock is designed to be injected into LLM prompts as context.
// ---------------------------------------------------------------------------
// Template library — at least 3 variations per mood label (Chinese)
// ---------------------------------------------------------------------------
const TEMPLATES = {
    furious: [
        "怒火在胸中燃烧，无法平息……",
        "每一步都在忍耐，但忍耐已到极限……",
        "理智在崩塌边缘，只想让一切付出代价……",
    ],
    fearful: [
        "恐惧如冰水灌顶，四肢僵硬……",
        "黑暗中似乎有什么在逼近……",
        "心跳如擂鼓，却不敢发出一丝声响……",
    ],
    defiant: [
        "不，绝不屈服……",
        "就算全世界反对，也要走到底……",
        "咬紧牙关，这一次不会再退让……",
    ],
    wounded: [
        "心口像是被撕裂，痛得无法呼吸……",
        "原来被伤害是这种感觉……",
        "伤口在隐秘处溃烂，无人知晓……",
    ],
    tender: [
        "温暖从心底升起，想守护这一刻……",
        "原来这就是心动的感觉……",
        "想轻轻握住那只手，什么也不说……",
    ],
    serene: [
        "内心前所未有的平静……",
        "所有的纷扰都远去了……",
        "像一潭无波的秋水，映着天光……",
    ],
    smitten: [
        "满心满眼都是那个身影……",
        "心跳不受控制地加速……",
        "连呼吸都染上了那个人的气息……",
    ],
    withdrawn: [
        "把自己缩回壳里，不想面对……",
        "一切与我无关……",
        "关上门，世界就不再存在……",
    ],
    composed: [
        "冷静分析局势，不受情绪左右……",
        "每一步都在掌控之中……",
        "波澜不惊，静待时机……",
    ],
};
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
/**
 * Deterministic FNV-1a 32-bit hash.
 * Used to select a template variation reproducibly.
 */
function fnv1a(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
}
// ---------------------------------------------------------------------------
// InnerVoice
// ---------------------------------------------------------------------------
export class InnerVoice {
    /**
     * Generate an inner monologue block for a character.
     *
     * The template is selected deterministically via FNV-1a hash of
     * (characterId + chapterIndex), ensuring reproducibility.
     * Intensity is derived from the strongest mood dimension (0–1).
     *
     * @param characterId  The character generating the monologue.
     * @param mood         The character's current mood vector.
     * @param bondContext  Contextual bond descriptions to weave into the text.
     * @param chapterIndex The current chapter index (for deterministic selection).
     */
    generate(characterId, mood, bondContext, chapterIndex) {
        const templates = TEMPLATES[mood.label];
        const hash = fnv1a(`${characterId}:${chapterIndex}`);
        const idx = hash % templates.length;
        let text = templates[idx];
        // Append bond context if available, so the monologue reflects
        // current relationship dynamics.
        if (bondContext.length > 0) {
            text += `\n（${bondContext.join("、")}——这些羁绊在心底回响。）`;
        }
        // Intensity = strongest dimension magnitude / 100.
        const intensity = Math.max(Math.abs(mood.affection), Math.abs(mood.tension), Math.abs(mood.energy), Math.abs(mood.control)) / 100;
        return {
            characterId,
            text,
            moodLabel: mood.label,
            intensity,
            chapterIndex,
        };
    }
}
//# sourceMappingURL=inner-voice.js.map
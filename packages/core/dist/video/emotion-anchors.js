// Emotion → Acting Anchors module (V2.0, 3-anchor system)
//
// Product insight: AI video models CANNOT understand abstract emotion words
// like "angry" or "sad" — they produce flat/mask-like faces. They CAN understand
// concrete muscular/physical action instructions like "eyebrows furrowed,
// fists clenched, body leaning forward". This module maps emotion labels to
// three concrete acting anchors per emotion:
//   - Face anchor (eyebrows/eyes/mouth/jaw)
//   - Hand anchor (fists/clenching/covering/etc.)
//   - Body anchor (posture/shoulders/stance)
//
// Output is kept under 80 CJK characters so it can be safely appended to any
// video prompt without exceeding model context limits.
// ---------------------------------------------------------------------------
// Emotion → 3 anchors mapping (30 emotions, covering 99% of short-drama scenes)
// ---------------------------------------------------------------------------
export const EMOTION_ANCHOR_MAP = {
    // --- Anger spectrum ---
    "愤怒": {
        face: "眉头紧锁眉心拧起，眼神锐利冰冷，牙关咬紧",
        hand: "拳头攥紧指节发白",
        body: "身体微微前倾压迫对方，肩膀绷紧",
    },
    "怒": {
        face: "眉头紧锁眉心拧起，眼神锐利冰冷，牙关咬紧",
        hand: "拳头攥紧指节发白",
        body: "身体微微前倾压迫对方，肩膀绷紧",
    },
    "恨": {
        face: "眼神冰冷带恨意，瞳孔微缩，嘴角紧绷成线",
        hand: "手指收紧成拳，指甲掐进掌心",
        body: "身体僵硬如雕像，呼吸缓慢沉重",
    },
    "质问": {
        face: "眉头微蹙，眼神直视逼问，表情严肃",
        hand: "手指指向对方悬在半空",
        body: "微微前倾逼近对方，姿态有压迫感",
    },
    "压迫": {
        face: "表情平静但眼神有威慑力，不怒自威",
        hand: "双手抱胸或单手插兜",
        body: "站姿稳定有气场，从容有掌控感",
    },
    "不屑": {
        face: "嘴角微扬带嘲讽，眼神斜睨，眉毛微挑",
        hand: "嗤笑一声别过头，手势松弛",
        body: "身体后仰或侧过身，姿态带轻蔑",
    },
    "讽刺": {
        face: "嘴角挂着冷笑，眼神带玩味讥讽",
        hand: "可能鼓掌或竖大拇指但表情虚假",
        body: "姿态略带夸张但虚假，话里带刺",
    },
    // --- Sadness spectrum ---
    "委屈": {
        face: "眼眶泛红，嘴唇微微颤抖，紧咬下唇",
        hand: "攥紧衣角或用手背擦眼泪",
        body: "肩膀微微缩起，身体微微后退",
    },
    "难过": {
        face: "眼神黯淡，嘴角明显下压，眉毛耷拉成八字",
        hand: "手撑着额头或扶着支撑物",
        body: "肩膀垮下来，整个人被抽走力气",
    },
    "隐忍": {
        face: "表情紧绷克制，嘴唇抿成线，下颌绷紧",
        hand: "双手紧握或手臂交叉抱住自己",
        body: "身体微微发抖但努力控制，深呼吸",
    },
    "哭": {
        face: "眼泪从眼角滑落，眼眶鼻子通红，嘴唇颤抖",
        hand: "用手捂嘴或捂脸",
        body: "肩膀耸动抽泣，身体蜷缩",
    },
    "不甘": {
        face: "眼眶泛红但眼神倔强，咬着牙，眉头紧皱",
        hand: "拳头攥紧，指甲掐进掌心",
        body: "身体微微发抖但挺直不肯低头",
    },
    // --- Joy spectrum ---
    "开心": {
        face: "眼睛弯成月牙，嘴角自然上扬带笑，眼神明亮",
        hand: "拍手或双手捂嘴",
        body: "身体放松舒展，动作轻快有活力",
    },
    "笑": {
        face: "嘴角上扬，眼角有笑纹，眼神温和带笑意",
        hand: "可能轻轻捂嘴笑",
        body: "肩膀放松，姿态自然松弛",
    },
    "撒娇": {
        face: "眼神水汪汪带乞求，嘴角微噘，头微微歪向一侧",
        hand: "轻摇对方手臂，拽住衣袖晃一晃",
        body: "身体微微贴近，肩膀缩起装可怜",
    },
    "兴奋": {
        face: "眼睛瞪大发亮，眉毛上扬，惊喜笑容",
        hand: "拍手或双手捂嘴",
        body: "可能跳起来，动作幅度大而快",
    },
    "轻快": {
        face: "表情轻松愉悦，嘴角带笑，眼神明亮",
        hand: "手势轻快灵活",
        body: "步伐轻盈，动作流畅自然",
    },
    // --- Fear/Shock spectrum ---
    "惊恐": {
        face: "眼睛瞪大瞳孔放大，眉毛上扬成八字，嘴巴微张",
        hand: "手捂住嘴或护住胸口",
        body: "身体瞬间僵住或猛地后退",
    },
    "紧张": {
        face: "表情紧绷，眉头微蹙，嘴唇发干，频繁吞咽",
        hand: "手指不安绞动、抠指甲或攥紧衣物",
        body: "坐姿站姿僵硬，可能频繁换脚",
    },
    "害怕": {
        face: "眼神恐惧带慌乱，眉头紧锁，嘴唇颤抖，脸色苍白",
        hand: "双手抱臂或抱住自己",
        body: "身体后退或缩到角落，身体发抖",
    },
    "心虚": {
        face: "眼神躲闪不敢对视，表情不自然，额头冒汗",
        hand: "摸鼻子、摸后脑勺",
        body: "手脚不自在，姿态僵硬",
    },
    "震惊": {
        face: "眼睛瞬间瞪大，眉毛高高扬起，嘴巴微张成O型",
        hand: "手里的东西可能掉落，手捂嘴",
        body: "身体瞬间僵住像被雷击中",
    },
    // --- Cold/Calm spectrum ---
    "冷淡": {
        face: "表情平淡无波，眼神平静带疏离感",
        hand: "双手抱胸或插兜",
        body: "姿态疏离，侧身或后退半步保持距离",
    },
    "疲惫": {
        face: "眼神倦怠无神，眼下有黑眼圈，嘴角微垂",
        hand: "揉眉心或捏鼻梁",
        body: "肩膀垮下来，背微微佝偻，动作缓慢",
    },
    "冷静": {
        face: "表情沉稳平静，眼神专注清明",
        hand: "可能推眼镜或交叉手指",
        body: "姿态稳定从容，动作不急不缓",
    },
    "压抑": {
        face: "表情隐忍克制，嘴唇紧抿，眼神沉重",
        hand: "双手握拳，手指按压太阳穴",
        body: "身体绷紧像在压制什么，深呼吸调整",
    },
    // --- Warmth spectrum ---
    "温柔": {
        face: "眼神柔和温暖像有水光，嘴角带浅浅笑意",
        hand: "轻抚对方头发/脸颊/手背",
        body: "动作轻柔缓慢，身体微微靠近",
    },
    "害羞": {
        face: "脸颊泛红，眼神低垂躲闪，嘴角羞涩微笑",
        hand: "摸头发、摸耳朵或捂脸",
        body: "头微微低下，身体微微缩起",
    },
    "暧昧": {
        face: "眼神勾人，嘴角似笑非笑，睫毛低垂",
        hand: "撩头发、咬嘴唇，手指轻划",
        body: "身体距离很近但不触碰，气息靠近",
    },
    // --- Archetypes ---
    "霸总": {
        face: "表情沉稳不怒自威，眼神深邃有掌控力，下颌紧绷",
        hand: "单手插兜、松领带，手指轻敲桌面",
        body: "姿态挺拔有气场，靠在桌沿或墙上",
    },
    "坚定": {
        face: "眼神坚定果决，眉头微蹙，嘴唇紧抿成线",
        hand: "拳头握紧或手按在重要位置",
        body: "站姿笔直挺拔，身体微微前倾表决心",
    },
};
export const EMOTION_LABELS = Object.keys(EMOTION_ANCHOR_MAP);
const KEYWORD_MAP = [
    { keywords: ["愤怒", "怒气", "火大", "发火", "暴怒", "恼火", "气炸", "愤恨", "怒"], emotion: "愤怒" },
    { keywords: ["恨", "怨恨", "痛恨", "憎恨", "记恨", "仇恨"], emotion: "恨" },
    { keywords: ["质问", "逼问", "追问", "诘问", "盘问"], emotion: "质问" },
    { keywords: ["压迫", "威压", "威慑", "施压", "居高临下", "俯视"], emotion: "压迫" },
    { keywords: ["不屑", "鄙夷", "鄙视", "轻蔑", "嗤笑", "看不起"], emotion: "不屑" },
    { keywords: ["讽刺", "嘲讽", "讥讽", "阴阳怪气", "挖苦", "嘲笑"], emotion: "讽刺" },
    { keywords: ["委屈", "冤枉", "受委屈", "红了眼眶"], emotion: "委屈" },
    { keywords: ["难过", "伤心", "悲伤", "心痛", "心碎", "难受", "心死", "凄凉"], emotion: "难过" },
    { keywords: ["隐忍", "强忍", "忍耐", "克制", "压住", "忍住", "强忍泪水"], emotion: "隐忍" },
    { keywords: ["哭", "哭泣", "落泪", "流泪", "泪目", "泪崩", "痛哭", "抽泣", "哽咽"], emotion: "哭" },
    { keywords: ["不甘", "不甘心", "不服", "不认命", "咬紧牙关", "不服输"], emotion: "不甘" },
    { keywords: ["开心", "高兴", "快乐", "喜悦", "欣喜", "欢喜", "愉悦", "欢快"], emotion: "开心" },
    { keywords: ["微笑", "轻笑", "笑了", "一笑", "笑着"], emotion: "笑" },
    { keywords: ["撒娇", "娇嗔", "卖萌", "软萌"], emotion: "撒娇" },
    { keywords: ["兴奋", "激动", "狂喜", "惊喜", "振奋", "热血"], emotion: "兴奋" },
    { keywords: ["轻快", "轻松", "轻盈"], emotion: "轻快" },
    { keywords: ["惊恐", "恐惧", "恐怖", "吓到", "吓坏", "毛骨悚然", "惊惧"], emotion: "惊恐" },
    { keywords: ["紧张", "不安", "焦虑", "忐忑", "心慌", "心乱", "惴惴不安"], emotion: "紧张" },
    { keywords: ["害怕", "畏惧", "惧怕", "生怕", "不敢", "恐慌"], emotion: "害怕" },
    { keywords: ["心虚", "发慌", "慌乱", "做贼心虚", "不敢直视"], emotion: "心虚" },
    { keywords: ["震惊", "惊呆", "愣住", "怔住", "不敢相信", "傻眼", "倒吸一口凉气"], emotion: "震惊" },
    { keywords: ["冷淡", "冷漠", "冰冷", "淡漠", "疏离", "冷冰冰", "面无表情"], emotion: "冷淡" },
    { keywords: ["疲惫", "疲倦", "困倦", "精疲力尽", "憔悴", "身心俱疲"], emotion: "疲惫" },
    { keywords: ["冷静", "平静", "淡定", "沉稳", "镇定", "沉着"], emotion: "冷静" },
    { keywords: ["压抑", "沉重", "窒息", "沉闷"], emotion: "压抑" },
    { keywords: ["温柔", "柔声", "轻柔", "温暖", "宠溺", "疼爱", "呵护"], emotion: "温柔" },
    { keywords: ["害羞", "羞涩", "脸红", "脸颊泛红", "腼腆", "不好意思"], emotion: "害羞" },
    { keywords: ["暧昧", "挑逗", "撩", "凑近耳边", "气息", "耳鬓厮磨"], emotion: "暧昧" },
    { keywords: ["霸总", "总裁", "帝王", "掌控", "命令", "冷脸", "低沉"], emotion: "霸总" },
    { keywords: ["坚定", "决然", "毅然", "笃定", "坚决", "一定", "绝不"], emotion: "坚定" },
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Detect up to `maxCount` primary emotions from a text snippet (dialogue,
 * narration, or mood label). Returns an array of emotion keys that can be
 * passed to `getAnchors()`.
 */
export function detectEmotions(text, maxCount = 1) {
    if (!text)
        return [];
    const scores = new Map();
    for (const { keywords, emotion } of KEYWORD_MAP) {
        let score = 0;
        for (const kw of keywords) {
            // Use split-based counting to avoid regex stateful issues with CJK
            const parts = text.split(kw);
            score += parts.length - 1;
        }
        if (score > 0) {
            scores.set(emotion, (scores.get(emotion) ?? 0) + score);
        }
    }
    if (scores.size === 0)
        return [];
    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxCount)
        .map(([e]) => e);
}
/**
 * Return the 3-anchor acting instruction set for a given emotion key.
 * Returns a neutral-default when the emotion is not in the map.
 */
export function getAnchors(emotion) {
    return (EMOTION_ANCHOR_MAP[emotion] ?? {
        face: "表情自然贴合剧情，眼神有内容",
        hand: "手部动作自然放松",
        body: "肢体姿态自然贴合情境",
    });
}
/**
 * Build a single Chinese acting instruction string (≤90 chars) suitable for
 * direct injection into a video prompt. Format:
 *   "面部：[face]；手部：[hand]；肢体：[body]"
 *
 * When no emotion is detected, returns a neutral "natural acting" cue so the
 * model doesn't produce deadpan faces even in non-emotional scenes.
 */
export function buildActingAnchors(text, opts) {
    const maxEmotions = opts?.maxEmotions ?? 1;
    const includeSuffix = opts?.includeSuffix ?? true;
    const emotions = detectEmotions(text, maxEmotions);
    if (emotions.length === 0) {
        return "表情自然细腻真实，微表情到位，肢体语言自然";
    }
    const parts = [];
    for (const emo of emotions) {
        const a = getAnchors(emo);
        // Take only the first clause of each anchor to keep it tight
        const face = a.face.split("，")[0] ?? a.face;
        const hand = a.hand.split("，")[0] ?? a.hand;
        const body = a.body.split("，")[0] ?? a.body;
        parts.push(`${face}，${hand}，${body}`);
    }
    let result = parts.join("；");
    if (includeSuffix) {
        result += "，表演克制真实不夸张";
    }
    // Hard cap at 90 chars to protect prompt length budgets
    if (result.length > 90) {
        result = result.slice(0, 87) + "...";
    }
    return result;
}
/**
 * Build a Grok-specific emotion performance cue. Grok single-shot clips have
 * no audio track, so every emotion must be conveyed 100% through visuals.
 * Returns a ready-to-append block starting with "人物情绪表演：".
 */
export function buildGrokEmotionCue(routeText, sourceText = "") {
    const combined = `${routeText} ${sourceText}`;
    const anchors = buildActingAnchors(combined, { maxEmotions: 1, includeSuffix: false });
    return `人物情绪表演：${anchors}，情绪完全通过面部表情和肢体语言传达`;
}
/**
 * For a given dialogue line and emotion, return the voice performance
 * direction text (tone / pace / breathing / emphasis) that can be appended
 * after the dialogue in the prompt. This is used for Seedance clips with
 * dialogue so the model knows HOW the line is delivered, not just WHAT is said.
 */
export function buildVoicePerformanceCue(emotion) {
    const cueMap = {
        "愤怒": "语气压着怒气，咬字变重，一字一句，声音略粗，顿挫感明显",
        "委屈": "声音很轻，尾音发虚，停顿克制，带抽泣感",
        "哭": "声音发颤，带着哭腔，尾音发抖，伴随抽泣和呼吸声",
        "开心": "语气轻快带笑音，语速偏快，声音清亮，尾音上扬",
        "惊恐": "声音压低，断断续续，倒吸冷气，呼吸急促",
        "霸总": "声音低沉有磁性，语速中慢，咬字清晰，句尾下沉，有掌控感",
        "温柔": "声音柔和，语速偏慢，语气放轻，温暖有安抚感",
        "冷淡": "声音平稳偏冷，语速中慢，语气平淡不带感情",
        "紧张": "语速偏快或磕绊，声音微微发颤，频繁停顿吞咽",
        "震惊": "声音骤然拔高或停顿，倒吸冷气，语气难以置信",
        "坚定": "语气沉稳有力，咬字清晰，语速不快但字字有力",
        "撒娇": "声音软甜带鼻音，尾音拖长上翘，语气娇嗔",
    };
    return cueMap[emotion] ?? "语气自然，语速适中，贴合角色情绪";
}
//# sourceMappingURL=emotion-anchors.js.map
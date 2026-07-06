// packages/core/src/scene/classifier.ts
// Scene Classifier — rule-based scene type detection.
//
// Analyzes chapter text and determines what kind of scene is unfolding
// (dialogue, action, conflict, etc.) using keyword/regex pattern matching.
// This is a zero-LLM module: all detection is pure rule-based with
// comprehensive Chinese keyword support.
//
// The classifier:
//   1. Splits chapter text into scene segments (by blank lines / markers)
//   2. Scores each segment against keyword patterns for every SceneType
//   3. Calculates intensity (0-1) from action/conflict/exclamation density
//   4. Calculates gravity (0-1) from death/tragedy/revelation keyword density
//   5. Detects climax (high intensity + high gravity) and turning points
//      (significant scene-type shifts)
//   6. Extracts participant names via Chinese surname matching and English
//      capitalized-word heuristics
import { z } from "zod";
import { SceneSignalSchema, } from "./types.js";
// ---------------------------------------------------------------------------
// Input validation schema
// ---------------------------------------------------------------------------
const ClassifyInputSchema = z.object({
    text: z.string(),
    chapterIndex: z.number().int().min(0),
});
// ---------------------------------------------------------------------------
// Scene-type keyword patterns
//
// Each SceneType maps to an array of global RegExp patterns. The classifier
// counts total matches across all patterns for a given type and picks the
// type with the highest count. Patterns use the `g` flag so that
// String.prototype.match() returns all occurrences (match() with the global
// flag does NOT use or update lastIndex, so reusing these constants is safe).
// ---------------------------------------------------------------------------
const SCENE_PATTERNS = {
    // Dialogue: quotation marks + speech verbs
    dialogue: [
        /[\u300c\u300d\u300e\u300f\u201c\u201d\u2018\u2019\u201a\u201b""'']/g,
        /\u8bf4\u9053|\u9053\uff1a|\u8bf4\uff1a|\u95ee\uff1a|\u7b54\u9053|\u95ee\u9053|\u7b11\u9053|\u558a\u9053|\u53eb\u9053|\u4f4e\u58f0\u9053|\u5927\u58f0\u9053|\u4f4e\u8bed\u9053|\u563f\u5495\u9053|\u56de\u9053|\u63a5\u9053|\u7b54\u9053|\u8bf4\u8bdd|\u5f00\u53e3/g, //说道|道：|说：|问：|答道|问道|笑道|喊道|叫道|低声道|大声道|低语道|嘀咕道|回道|接道|答道|说话|开口
    ],
    // Action: combat verbs, movement, weapons
    action: [
        /\u6325\u5251|\u62d4\u5251|\u51fa\u5251|\u523a\u5411|\u5288\u5411|\u780d\u5411|\u6325\u5200|\u51fa\u62f3|\u98de\u8e22|\u731b\u51b2|\u6251\u5411|\u95ea\u907f|\u683c\u6321|\u6321\u4f4f|\u8eb2\u5f00/g, //挥剑|拔剑|出剑|刺向|劈向|砍向|挥刀|出拳|飞踢|猛冲|扑向|闪避|格挡|挡住|躲开
        /\u51b2\u4e86\u4e0a\u53bb|\u6251\u4e86\u8fc7\u53bb|\u4e00\u62f3|\u4e00\u811a|\u98de\u8eab|\u7eb5\u8eab|\u8dc3\u8d77|\u7ffb\u6eda|\u6323\u8131|\u649e\u5411|\u7802\u5411|\u8e22\u5411/g, //冲了上去|扑了过去|一拳|一脚|飞身|纵身|跃起|翻滚|挣脱|撞向|砸向|踢向
        /\u5251\u6c14|\u5200\u5149|\u638c\u98ce|\u62f3\u5f71|\u7bad\u77e2|\u5175\u5668|\u4ea4\u950b|\u4ea4\u624b|\u7f20\u6597|\u640f\u6597|\u53ae\u6740|\u6218\u6597|\u6218\u573a/g, //剑气|刀光|掌风|拳影|箭矢|兵器|交锋|交手|缠斗|搏斗|厮杀|战斗|战场
    ],
    // Introspection: inner thoughts, reflection
    introspection: [
        /\u5fc3\u60f3|\u6697\u60f3|\u60f3\u5230|\u601d\u5fd6|\u5bfb\u601d|\u56de\u60f3|\u56de\u5fc6|\u8ffd\u5fc6|\u5583\u5583\u81ea\u8bed|\u5fc3\u4e2d|\u5fc3\u5e95|\u5185\u5fc3/g, //心想|暗想|想到|思忖|寻思|回想|回忆|追忆|喃喃自语|心中|心底|内心
        /\u6216\u8bb8|\u4e5f\u8bb8|\u662f\u5426|\u96be\u9053|\u4e0d\u7981\u60f3|\u4e0d\u7981|\u8111\u6d77\u4e2d|\u8bb0\u5fc6\u4e2d|\u53cd\u590d\u60f3\u7740|\u4e0d\u65ad\u60f3/g, //或许|也许|是否|难道|不禁想|不禁|脑海中|记忆中|反复想着|不断想
    ],
    // Conflict: anger, arguments, confrontation
    conflict: [
        /\u6012\u543c|\u6012\u9a82|\u5927\u9a82|\u5486\u54ee|\u6012\u65a5|\u5475\u65a5|\u65a5\u8d23|\u6012\u76ee|\u6012\u89c6|\u6124\u7136|\u6124\u6012|\u6c14\u6124|\u6c14\u607c/g, //怒吼|怒骂|大骂|咆哮|怒斥|呵斥|斥责|怒目|怒视|愤然|愤怒|气愤|气恼
        /\u4e89\u5435|\u4e89\u6267|\u5435\u95f9|\u5bf9\u5cd9|\u51b2\u7a81|\u5bf9\u6297|\u53cd\u76ee|\u7ffb\u8138|\u5251\u62d4\u9a7e\u5f20|\u9488\u950b\u76f8\u5bf9/g, //争吵|争执|吵闹|对峙|冲突|对抗|反目|翻脸|剑拔弩张|针锋相对
    ],
    // Revelation: truth, secrets, sudden realisation
    revelation: [
        /\u771f\u76f8|\u539f\u6765\u5982\u6b64|\u539f\u6765|\u63ed\u9732|\u63ed\u7a7f|\u63ed\u5f00|\u63ed\u79d8|\u53d1\u73b0|\u7ec8\u4e8e\u660e\u767d|\u604d\u7136\u5927\u609f|\u604d\u7136|\u987f\u609f|\u9707\u60ca/g, //真相|原来如此|原来|揭露|揭穿|揭开|揭秘|发现|终于明白|恍然大悟|恍然|顿悟|震惊
        /\u79d8\u5bc6|\u9690\u7792|\u6b3a\u9a97|\u8c0e\u8a00|\u80cc\u53db|\u51fa\u5356|\u4e0d\u4e3a\u4eba\u77e5|\u9c9c\u4e3a\u4eba\u77e5/g, //秘密|隐瞒|欺骗|谎言|背叛|出卖|不为人知|鲜为人知
    ],
    // Reunion: meeting again after long separation
    reunion: [
        /\u91cd\u9022|\u91cd\u805a|\u56e2\u805a|\u518d\u6b21\u76f8\u89c1|\u518d\u6b21\u89c1\u9762|\u4e45\u522b\u91cd\u9022|\u7ec8\u4e8e\u76f8\u89c1|\u7ec8\u4e8e\u89c1\u5230|\u5f52\u6765|\u56de\u6765|\u56de\u5230/g, //重逢|重聚|团聚|再次相见|再次见面|久别重逢|终于相见|终于见到|归来|回来|回到
    ],
    // Separation: parting, departure, farewell
    separation: [
        /\u79bb\u522b|\u5206\u522b|\u6c38\u522b|\u544a\u522b|\u8bc0\u522b|\u9001\u522b|\u79bb\u53bb|\u79bb\u5f00|\u8fdc\u53bb|\u6d88\u5931\u4e0d\u89c1|\u4e0d\u89c1\u4e86|\u5404\u81ea/g, //离别|分别|永别|告别|诀别|送别|离去|离开|远去|消失不见|不见了|各自
        /\u5206\u9053\u626c\u9563|\u5404\u5954\u4e1c\u897f|\u5929\u5404\u4e00\u65b9|\u52b3\u71d5\u5206\u98de/g, //分道扬镳|各奔东西|天各一方|劳燕分飞
    ],
    // Tenderness: warmth, care, comfort
    tenderness: [
        /\u6e29\u67d4|\u5173\u6000|\u5475\u62a4|\u5fc3\u75bc|\u5b89\u6170|\u629a\u6170|\u62e5\u62b1|\u4f9d\u507d|\u8f7b\u58f0|\u67d4\u58f0|\u6e29\u6696|\u6cbb\u6108|\u7ec6\u5fc3|\u7167\u6599|\u7275\u8d77|\u63e1\u4f4f|\u8f7b\u8f7f/g, //温柔|关怀|呵护|心疼|安慰|抚慰|拥抱|依偎|轻声|柔声|温暖|治愈|细心|照料|牵起|握住|轻抚
    ],
    // Tragedy: misfortune, sacrifice, suffering
    tragedy: [
        /\u4e0d\u5e78|\u727a\u7272|\u60b2\u5267|\u60b2\u60e8|\u51c4\u60e8|\u7edd\u671b|\u75db\u54ed|\u54c0\u568e|\u6078\u54ed|\u6cea\u6d41|\u6ce3\u4e0d\u6210\u58f0|\u60b2\u75db|\u54c0\u75db|\u51c4\u51c9|\u82cd\u51c9/g, //不幸|牺牲|悲剧|悲惨|凄惨|绝望|痛哭|哀嚎|恸哭|泪流|泣不成声|悲痛|哀痛|凄凉|苍凉
        /\u53d7\u4f24|\u6d41\u8840|\u5012\u4e0b|\u5012\u5730|\u660f\u8ff7|\u5782\u6b7b|\u6fd2\u6b7b|\u5410\u8840|\u9c9c\u8840|\u8840\u8ff9|\u5f2d\u7559/g, //受伤|流血|倒下|倒地|昏迷|垂死|濒死|吐血|鲜血|血迹|弥留
    ],
    // Comedy: humour, lightheartedness
    comedy: [
        /\u54c8\u54c8|\u563b\u563b|\u5475\u5475|\u7b11\u4e86|\u641e\u7b11|\u5e7d\u9ed8|\u6ed1\u7a3d|\u6709\u8da3|\u5fcd\u4fca\u4e0d\u7981|\u6367\u8179|\u5927\u7b11|\u4e50\u5475/g, //哈哈|嘻嘻|呵呵|笑了|搞笑|幽默|滑稽|有趣|忍俊不禁|捧腹|大笑|乐呵
        /\u8f7b\u677e|\u6109\u5feb|\u6b22\u4e50|\u5f00\u5fc3|\u9ad8\u5174|\u9640\u8dc3|\u6253\u8da3|\u8c03\u4f83|\u73a9\u7b11/g, //轻松|愉快|欢乐|开心|高兴|雀跃|打趣|调侃|玩笑
    ],
    // Transition: time skips, scene changes, narrative bridges
    transition: [
        /\u591a\u5e74\u540e|\u6570\u5e74\u540e|\u51e0\u5929\u540e|\u51e0\u5929\u524d|\u4e0d\u4e45\u540e|\u968f\u540e|\u540e\u6765|\u8f6c\u773c\u95f4|\u65f6\u5149\u98de\u901d|\u5c81\u6708\u5982\u68ad|\u5149\u9634\u4f3c\u7bad/g, //多年后|数年后|几天后|几天前|不久后|随后|后来|转眼间|时光飞逝|岁月如梭|光阴似箭
        /\u6b64\u65f6|\u6b64\u523b|\u4e0e\u6b64\u540c\u65f6|\u53e6\u4e00\u8fb9|\u8bdd\u8bf4|\u4e14\u8bf4|\u5374\u8bf4|\u4e14\u4e0d\u8bf4/g, //此时|此刻|与此同时|另一边|话说|且说|却说|且不说
        /\u7b2c\u4e8c\u5929|\u6b21\u65e5|\u5f53\u665a|\u5f53\u591c|\u7fcc\u65e5|\u6e05\u6668|\u9ec4\u660f|\u5165\u591c|\u5165\u51ac|\u5f00\u6625/g, //第二天|次日|当晚|当夜|翌日|清晨|黄昏|入夜|入冬|开春
    ],
};
// ---------------------------------------------------------------------------
// Intensity booster patterns — contribute to the intensity score
// ---------------------------------------------------------------------------
const INTENSITY_PATTERNS = [
    // Exclamation marks indicate heightened emotion
    { pattern: /[!！]/g, maxContribution: 0.2, perMatch: 0.04 },
    // Action keywords raise tension
    {
        pattern: /\u6325\u5251|\u62d4\u5251|\u523a\u5411|\u5288\u5411|\u731b\u51b2|\u6251\u5411|\u98de\u8eab|\u7eb5\u8eab|\u8dc3\u8d77|\u4e00\u62f3|\u4e00\u811a|\u649e\u5411|\u7800\u5411/g, //挥剑|拔剑|刺向|劈向|猛冲|扑向|飞身|纵身|跃起|一拳|一脚|撞向|砸向
        maxContribution: 0.3,
        perMatch: 0.06,
    },
    // Conflict keywords raise tension
    {
        pattern: /\u6012\u543c|\u5486\u54ee|\u6012\u65a5|\u4e89\u5435|\u5bf9\u5cd9|\u6124\u6012|\u6124\u7136|\u5435\u95f9|\u5bf9\u6297/g, //怒吼|咆哮|怒斥|争吵|对峙|愤怒|愤然|吵闹|对抗
        maxContribution: 0.25,
        perMatch: 0.05,
    },
    // Question marks can indicate tension or interrogation
    { pattern: /[?？]/g, maxContribution: 0.1, perMatch: 0.02 },
    // Ellipsis can indicate tension, hesitation, or trailing off
    { pattern: /\u2026\u2026|\.\.\./g, maxContribution: 0.05, perMatch: 0.01 },
];
// ---------------------------------------------------------------------------
// Gravity patterns — contribute to the gravity (seriousness) score
// ---------------------------------------------------------------------------
const GRAVITY_PATTERNS = [
    // Death-related keywords are the most grave
    {
        pattern: /\u6b7b|\u4ea1|\u6b9e\u547d|\u901d\u4e16|\u4e27\u751f|\u6bd9\u547d|\u6c14\u7edd|\u54bd\u6c14|\u65ad\u6c14|\u6b89\u547d/g, //死|亡|殒命|逝世|丧生|毙命|气绝|咽气|断气|殒命
        maxContribution: 0.4,
        perMatch: 0.15,
    },
    // Tragedy / suffering keywords
    {
        pattern: /\u727a\u7272|\u4e0d\u5e78|\u60b2\u5267|\u60b2\u60e8|\u51c4\u60e8|\u7edd\u671b|\u75db\u54ed|\u6078\u54ed|\u60b2\u75db|\u54c0\u75db|\u51c4\u51c9/g, //牺牲|不幸|悲剧|悲惨|凄惨|绝望|痛哭|恸哭|悲痛|哀痛|凄凉
        maxContribution: 0.3,
        perMatch: 0.1,
    },
    // Revelation keywords — uncovering secrets is gravely serious
    {
        pattern: /\u771f\u76f8|\u63ed\u9732|\u63ed\u7a7f|\u79d8\u5bc6|\u9690\u7792|\u80cc\u53db|\u51fa\u5356|\u8c0e\u8a00/g, //真相|揭露|揭穿|秘密|隐瞒|背叛|出卖|谎言
        maxContribution: 0.2,
        perMatch: 0.08,
    },
    // Separation keywords
    {
        pattern: /\u79bb\u522b|\u6c38\u522b|\u8bc0\u522b|\u544a\u522b|\u9001\u522b|\u5206\u9053\u626c\u9563|\u5404\u5954\u4e1c\u897f/g, //离别|永别|诀别|告别|送别|分道扬镳|各奔东西
        maxContribution: 0.1,
        perMatch: 0.04,
    },
];
// ---------------------------------------------------------------------------
// Climax and turning-point thresholds
// ---------------------------------------------------------------------------
const CLIMAX_INTENSITY_THRESHOLD = 0.7;
const CLIMAX_GRAVITY_THRESHOLD = 0.6;
/** Scene types that always signify a turning point when they appear. */
const PIVOTAL_TYPES = new Set([
    "revelation",
    "tragedy",
    "separation",
    "reunion",
    "conflict",
]);
const TURNING_POINT_INTENSITY_THRESHOLD = 0.6;
const TURNING_POINT_GRAVITY_THRESHOLD = 0.5;
// ---------------------------------------------------------------------------
// Common Chinese surnames for participant extraction
// Covers the top ~100 most common surnames (85%+ of the population).
// ---------------------------------------------------------------------------
const COMMON_SURNAMES = "\u738b\u674e\u5f20\u5218\u9648\u6768\u9ec4\u8d75\u5434\u5468\u5f90\u5b59\u9a6c\u6731\u80e1\u90ed\u4f55\u9ad8\u6797\u7f57\u90d1\u6881\u8c22\u5b8b\u5510\u8bb8\u97e9\u51af\u9093\u66f9\u5f6d\u66fe\u8096\u7530\u8463\u8881\u6f58\u4e8e\u848b\u8521\u4f59\u675c\u53f6\u7a0b\u82cf\u9b4f\u5415\u4e01\u4efb\u6c88\u59da\u5362\u59dc\u5d14\u949f\u8c2d\u9646\u6c6a\u8303\u77f3\u5ed6\u8d3e\u590f\u97e6\u4ed8\u65b9\u767d\u90b9\u5b5f\u718a\u79e6\u90b1\u6c5f\u5c39\u859b\u95eb\u6bb5\u96f7\u4faf\u9f99\u53f2\u9676\u9ece\u8d3a\u987e\u6bdb\u90dd\u9f94\u90b5\u4e07\u94b1\u4e25\u8983\u6b66\u6234\u83ab\u5b54\u5411\u6c64";
/** Surname-following CJK character(s) that strongly indicate a person name. */
const NAME_FOLLOWING_VERBS = "\u8bf4\u9053\u7b11\u770b\u95ee\u60f3\u8d70\u7ad9\u5750\u62cd\u62c9\u63e1\u51b2\u558a\u53eb\u9a82\u54ed\u7b11\u6012\u60ca\u53f9\u6444\u5934\u8f6c\u8eab\u51fa\u624b\u63a5\u8bdd\u56de\u7b54\u542c\u95ee\u8bb0";
// English stopwords (capitalised words that are not names)
const ENGLISH_STOPWORDS = new Set([
    "The", "A", "An", "He", "She", "It", "They", "We", "I", "You",
    "But", "And", "Or", "So", "If", "When", "Then", "Now", "Here",
    "There", "This", "That", "These", "Those", "What", "Who", "Where",
    "Why", "How", "Which", "His", "Her", "Its", "Their", "Our", "My",
    "Your", "Me", "Him", "Us", "Them", "No", "Yes", "Not", "Can",
    "Will", "Would", "Should", "Could", "May", "Might", "Must", "Shall",
    "Do", "Does", "Did", "Was", "Were", "Been", "Being", "Have", "Has",
    "Had", "Having", "One", "Two", "Three", "First", "Second", "Last",
    "All", "Some", "Any", "Each", "Every", "Both", "Few", "More", "Most",
    "Other", "Such", "Only", "Own", "Same", "Than", "Too", "Very", "Just",
    "Because", "As", "At", "By", "For", "From", "In", "Into", "Of", "On",
    "To", "With", "About", "After", "Before", "During", "Through", "Under",
    "Over", "Between", "Against", "During", "Until", "Upon", "Within",
    "Without", "Through", "During", "Behind", "Beside", "Beyond",
]);
// ---------------------------------------------------------------------------
// Scene break markers — used to split text into segments
// ---------------------------------------------------------------------------
const SCENE_BREAK_MARKER_PATTERN = /[\u3016\u3017\u3014\u3015\u203b\u25c6\u25c7\u2605\u2606]|\u2501{2,}|\u2500{3,}|\*{3,}|-{3,}/g;
// 【】〖〗※◆◇★☆━+ ─{3,} *** ---
// ---------------------------------------------------------------------------
// Helper: count regex matches in text (safe for reused global patterns)
// ---------------------------------------------------------------------------
function countMatches(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}
// ---------------------------------------------------------------------------
// SceneClassifier
// ---------------------------------------------------------------------------
export class SceneClassifier {
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    /**
     * Classify chapter text into one or more scene segments.
     *
     * @param text         Full chapter text (may contain multiple scenes).
     * @param chapterIndex Zero-based chapter index.
     * @returns            Classification result with per-scene signals and
     *                     aggregate metrics.
     */
    classify(text, chapterIndex) {
        // Validate inputs with Zod.
        const input = ClassifyInputSchema.parse({ text, chapterIndex });
        const safeText = input.text;
        const safeChapter = input.chapterIndex;
        const segments = this.splitIntoSegments(safeText);
        // Edge case: no meaningful content.
        if (segments.length === 0) {
            return {
                scenes: [],
                dominantType: "transition",
                averageIntensity: 0,
                averageGravity: 0,
                hasClimax: false,
                hasTurningPoint: false,
            };
        }
        const scenes = [];
        let prevType = null;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const type = this.detectType(segment);
            const intensity = this.calculateIntensity(segment);
            const gravity = this.calculateGravity(segment);
            const isClimax = intensity >= CLIMAX_INTENSITY_THRESHOLD && gravity >= CLIMAX_GRAVITY_THRESHOLD;
            const isTurningPoint = this.isTurningPoint(prevType, type, intensity, gravity);
            const participants = this.extractParticipants(segment);
            const location = this.extractLocation(segment);
            // Build and validate the signal with Zod.
            const signal = SceneSignalSchema.parse({
                type,
                intensity,
                gravity,
                isClimax,
                isTurningPoint,
                participants,
                location,
                chapterIndex: safeChapter,
                sceneIndex: i,
                textExcerpt: segment.slice(0, 200),
            });
            scenes.push(signal);
            prevType = type;
        }
        // Compute aggregate metrics.
        const averageIntensity = scenes.reduce((s, sc) => s + sc.intensity, 0) / scenes.length;
        const averageGravity = scenes.reduce((s, sc) => s + sc.gravity, 0) / scenes.length;
        const dominantType = this.computeDominantType(scenes);
        const hasClimax = scenes.some((s) => s.isClimax);
        const hasTurningPoint = scenes.some((s) => s.isTurningPoint);
        return {
            scenes,
            dominantType,
            averageIntensity: round(averageIntensity, 4),
            averageGravity: round(averageGravity, 4),
            hasClimax,
            hasTurningPoint,
        };
    }
    // -------------------------------------------------------------------------
    // Segment splitting
    // -------------------------------------------------------------------------
    /**
     * Split chapter text into scene segments.
     *
     * Splits on:
     *   - Scene-break markers (※, ◆, ★, ---, ***, etc.)
     *   - Two or more consecutive blank lines
     */
    splitIntoSegments(text) {
        // Normalise line endings.
        const normalised = text.replace(/\r\n/g, "\n");
        // First pass: split on explicit scene-break markers.
        const markerSplit = normalised.split(SCENE_BREAK_MARKER_PATTERN);
        // Second pass: split each chunk on blank lines (2+ newlines).
        const result = [];
        for (const chunk of markerSplit) {
            const subSegments = chunk.split(/\n[ \t]*\n+/);
            for (const seg of subSegments) {
                const trimmed = seg.trim();
                if (trimmed.length > 0) {
                    result.push(trimmed);
                }
            }
        }
        return result;
    }
    // -------------------------------------------------------------------------
    // Scene-type detection
    // -------------------------------------------------------------------------
    /**
     * Detect the dominant SceneType for a text segment by scoring each type's
     * keyword patterns. Ties are broken by the order in which types appear in
     * SCENE_PATTERNS (which roughly corresponds to narrative significance).
     */
    detectType(text) {
        let bestType = "transition";
        let bestScore = 0;
        for (const type of Object.keys(SCENE_PATTERNS)) {
            const patterns = SCENE_PATTERNS[type];
            let score = 0;
            for (const pattern of patterns) {
                score += countMatches(text, pattern);
            }
            if (score > bestScore) {
                bestScore = score;
                bestType = type;
            }
        }
        // If no keywords matched at all, fall back to structural heuristics.
        if (bestScore === 0) {
            // Quotation marks → dialogue.
            if (/[\u300c\u300d\u300e\u300f\u201c\u201d\u2018\u2019]/.test(text)) {
                return "dialogue";
            }
            return "transition";
        }
        return bestType;
    }
    // -------------------------------------------------------------------------
    // Intensity calculation
    // -------------------------------------------------------------------------
    /**
     * Calculate intensity (0-1) based on action/conflict keyword density,
     * exclamation marks, question marks, and sentence structure.
     */
    calculateIntensity(text) {
        let intensity = 0;
        for (const { pattern, maxContribution, perMatch } of INTENSITY_PATTERNS) {
            const count = countMatches(text, pattern);
            intensity += Math.min(maxContribution, count * perMatch);
        }
        // Short-sentence ratio: rapid-fire short sentences increase intensity.
        const sentences = this.splitSentences(text);
        if (sentences.length > 0) {
            const shortCount = sentences.filter((s) => s.length < 10).length;
            const shortRatio = shortCount / sentences.length;
            intensity += Math.min(0.15, shortRatio * 0.15);
        }
        return round(Math.min(1, intensity), 4);
    }
    // -------------------------------------------------------------------------
    // Gravity calculation
    // -------------------------------------------------------------------------
    /**
     * Calculate gravity (0-1) based on the density of death, tragedy,
     * revelation, and separation keywords.
     */
    calculateGravity(text) {
        let gravity = 0;
        for (const { pattern, maxContribution, perMatch } of GRAVITY_PATTERNS) {
            const count = countMatches(text, pattern);
            gravity += Math.min(maxContribution, count * perMatch);
        }
        return round(Math.min(1, gravity), 4);
    }
    // -------------------------------------------------------------------------
    // Turning-point detection
    // -------------------------------------------------------------------------
    /**
     * Determine whether a scene constitutes a turning point.
     *
     * A turning point occurs when:
     *   - The scene type shifts from the previous segment AND
     *   - The new type is "pivotal" (revelation, tragedy, separation, reunion,
     *     conflict), OR the new scene has high intensity or gravity.
     *
     * The first scene can never be a turning point (no previous type).
     */
    isTurningPoint(prevType, currType, intensity, gravity) {
        if (prevType === null)
            return false;
        if (prevType === currType)
            return false;
        // Pivotal scene types always mark a turning point.
        if (PIVOTAL_TYPES.has(currType))
            return true;
        // High-intensity or high-gravity shifts are turning points.
        if (intensity >= TURNING_POINT_INTENSITY_THRESHOLD)
            return true;
        if (gravity >= TURNING_POINT_GRAVITY_THRESHOLD)
            return true;
        return false;
    }
    // -------------------------------------------------------------------------
    // Participant extraction
    // -------------------------------------------------------------------------
    /**
     * Extract participant names from a text segment.
     *
     * Uses two heuristics:
     *   1. Chinese names: match common-surname + 1-2 CJK characters that
     *      appear 2+ times, optionally followed by a common verb.
     *   2. English names: capitalised words (excluding stopwords) that appear
     *      2+ times.
     */
    extractParticipants(text) {
        const candidates = new Map();
        const verbFollowedNames = new Set();
        // --- Chinese name detection ---
        // Build a character class from common surnames.
        const surnameClass = `[${COMMON_SURNAMES}]`;
        const cjkClass = "[\\u4e00-\\u9fff]";
        // Match surname + 1-2 CJK characters (candidate names).
        const chineseNamePattern = new RegExp(`${surnameClass}${cjkClass}{1,2}`, "g");
        const chineseMatches = text.match(chineseNamePattern) ?? [];
        // Match surname + 1-2 CJK characters + following verb (high-confidence names).
        const followingVerbPattern = new RegExp(`${surnameClass}${cjkClass}{1,2}[${NAME_FOLLOWING_VERBS}]`, "g");
        const verbFollowedRaw = text.match(followingVerbPattern) ?? [];
        for (const m of verbFollowedRaw) {
            // Strip the trailing verb character to get the bare name.
            verbFollowedNames.add(m.slice(0, -1));
        }
        // Count occurrences of each candidate name.
        for (const name of chineseMatches) {
            candidates.set(name, (candidates.get(name) ?? 0) + 1);
        }
        // --- English name detection ---
        const englishNamePattern = /\b[A-Z][a-z]{1,}(?:\s[A-Z][a-z]{1,})?\b/g;
        const englishMatches = text.match(englishNamePattern) ?? [];
        for (const match of englishMatches) {
            if (!ENGLISH_STOPWORDS.has(match)) {
                candidates.set(match, (candidates.get(match) ?? 0) + 1);
            }
        }
        // Filter: keep names appearing 2+ times. Sort by frequency descending,
        // with verb-followed Chinese names getting a priority boost.
        const participants = [...candidates.entries()]
            .filter(([, count]) => count >= 2)
            .sort((a, b) => {
            const aBoost = verbFollowedNames.has(a[0]) ? 1 : 0;
            const bBoost = verbFollowedNames.has(b[0]) ? 1 : 0;
            if (aBoost !== bBoost)
                return bBoost - aBoost;
            return b[1] - a[1];
        })
            .map(([name]) => name);
        // If no names appear 2+ times, fall back to single-occurrence names
        // that are followed by a verb (higher confidence).
        if (participants.length === 0 && verbFollowedNames.size > 0) {
            return [...verbFollowedNames].slice(0, 5);
        }
        return participants.slice(0, 10);
    }
    // -------------------------------------------------------------------------
    // Location extraction
    // -------------------------------------------------------------------------
    /**
     * Attempt to extract a location from the text.
     *
     * Looks for patterns like:
     *   - "在X里/中/内/上" (in/at X)
     *   - "X殿/院/宫/楼/..." (X + building suffix)
     */
    extractLocation(text) {
        // Pattern: 在 + 2-6 CJK chars + positional suffix
        const m1 = text.match(/\u5728([\u4e00-\u9fff]{2,6})(?:\u91cc|\u4e2d|\u5185|\u4e0a|\u524d|\u540e|\u65c1|\u95f4)/); //在(...)里|中|内|上|前|后|旁|间
        if (m1)
            return m1[1];
        // Pattern: 2-4 CJK chars + building/location suffix
        const m2 = text.match(/([\u4e00-\u9fff]{2,4})(?:\u6bbf|\u9662|\u5bab|\u697c|\u9601|\u623f|\u57ce|\u5c71|\u8c37|\u5d16|\u6865|\u6cb3|\u6e56|\u6d77|\u6797|\u6d1e|\u5854|\u5bfa|\u5e99|\u5802|\u5ba4|\u8425|\u5e97|\u9986|\u6240|\u574a)/); //殿|院|宫|楼|阁|房|城|山|谷|崖|桥|河|湖|海|林|洞|塔|寺|庙|堂|室|营|店|馆|所|坊
        if (m2)
            return m2[0];
        return undefined;
    }
    // -------------------------------------------------------------------------
    // Dominant-type computation
    // -------------------------------------------------------------------------
    /**
     * Compute the dominant scene type across all segments.
     * Uses frequency, with ties broken by average intensity.
     */
    computeDominantType(scenes) {
        if (scenes.length === 0)
            return "transition";
        const stats = new Map();
        for (const scene of scenes) {
            const entry = stats.get(scene.type) ?? { count: 0, totalIntensity: 0 };
            entry.count++;
            entry.totalIntensity += scene.intensity;
            stats.set(scene.type, entry);
        }
        let bestType = "transition";
        let bestCount = 0;
        let bestAvgIntensity = 0;
        for (const [type, { count, totalIntensity }] of stats) {
            const avgIntensity = totalIntensity / count;
            if (count > bestCount ||
                (count === bestCount && avgIntensity > bestAvgIntensity)) {
                bestType = type;
                bestCount = count;
                bestAvgIntensity = avgIntensity;
            }
        }
        return bestType;
    }
    // -------------------------------------------------------------------------
    // Sentence splitting
    // -------------------------------------------------------------------------
    /**
     * Split text into sentences using CJK and Western sentence terminators.
     */
    splitSentences(text) {
        // Split on 。！？!?.;；and newlines, then trim and filter.
        const raw = text.split(/[。！？!?\.;；\n]+/);
        return raw.map((s) => s.trim()).filter((s) => s.length > 0);
    }
}
// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
/** Round a number to the specified number of decimal places. */
function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}
//# sourceMappingURL=classifier.js.map
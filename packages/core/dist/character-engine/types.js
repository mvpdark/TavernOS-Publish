// packages/core/src/character-engine/types.ts
// Character Engine — type definitions for mood, bonds, motives, and pacing.
//
// This module provides the type foundation for TavernOS's character state
// tracking. All computation is deterministic (zero-LLM) using mathematical
// recursion (EMA, sigmoid, threshold cascades) adapted from research.
//
// Design principles:
//   • Emotions are 4D vectors, not single values
//   • Relationship transitions are FSM-based with deterministic thresholds
//   • All state is serialisable for SQLite persistence
//   • Noise is deterministic (FNV hash) for reproducibility
import { z } from "zod";
// ---------------------------------------------------------------------------
// Mood Vector — 4D emotion model
// ---------------------------------------------------------------------------
export const MoodLabelSchema = z.enum([
    "furious", // 暴怒
    "fearful", // 恐惧
    "defiant", // 抗争
    "wounded", // 受伤
    "tender", // 温柔
    "serene", // 平静
    "smitten", // 倾心
    "withdrawn", // 封闭
    "composed", // 沉稳
]);
export const MoodVectorSchema = z.object({
    characterId: z.string(),
    affection: z.number().min(-100).max(100), // 好感 [-100, 100]
    tension: z.number().min(-100).max(100), // 紧张 [-100, 100]
    energy: z.number().min(-100).max(100), // 活力 [-100, 100]
    control: z.number().min(-100).max(100), // 掌控 [-100, 100]
    label: MoodLabelSchema,
    locked: z.boolean().default(false), // 锁定区：高位难跌、低位难升
    updatedAt: z.string(),
    chapterIndex: z.number().int().min(0),
});
// ---------------------------------------------------------------------------
// Bond State — relationship FSM between two characters
// ---------------------------------------------------------------------------
export const BondPhaseSchema = z.enum([
    "stranger", // 陌生人
    "acquaintance", // 泛交
    "ally", // 盟友
    "confidant", // 知己
    "rival", // 对手
    "lover", // 恋人
    "enemy", // 敌人
    "mentor", // 师徒
    "family", // 家人
]);
export const BondStateSchema = z.object({
    pairKey: z.string(), // "角色A:角色B" (sorted)
    phase: BondPhaseSchema,
    trust: z.number().min(0).max(100), // 信任度
    tensions: z.number().min(0).max(100), // 累积矛盾
    warmth: z.number().min(-1).max(1), // 情感动量 [-1, 1]
    mood: z.enum(["warm", "neutral", "hostile"]).default("neutral"),
    positiveStreak: z.number().int().min(0).default(0), // 连续正向交互
    sharedScenes: z.number().int().min(0).default(0), // 共同场景数
    lastInteractionChapter: z.number().int().min(0).default(0),
    history: z.array(z.object({
        chapter: z.number().int().min(0),
        fromPhase: BondPhaseSchema,
        toPhase: BondPhaseSchema,
        reason: z.string(),
    })).default([]),
    updatedAt: z.string(),
});
// ---------------------------------------------------------------------------
// Motive — character motivation stack entry
// ---------------------------------------------------------------------------
export const MotiveSchema = z.object({
    id: z.string(),
    characterId: z.string(),
    description: z.string(), // 动机描述
    priority: z.number().min(0).max(100), // 优先级
    status: z.enum(["active", "satisfied", "abandoned", "suppressed"]).default("active"),
    source: z.enum(["internal", "external", "event"]).default("internal"),
    chapterOrigin: z.number().int().min(0),
    chapterResolved: z.number().int().min(0).optional(),
    relatedCharacters: z.array(z.string()).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
});
// ---------------------------------------------------------------------------
// Pace Metrics — chapter-level pacing analysis
// ---------------------------------------------------------------------------
export const PaceMetricsSchema = z.object({
    chapterIndex: z.number().int().min(0),
    tension: z.number().min(0).max(1), // 紧张度
    relaxation: z.number().min(0).max(1), // 松弛度
    rhythm: z.enum(["rising", "peak", "falling", "flat", "valley"]).default("flat"),
    sceneCount: z.number().int().min(0),
    dialogueRatio: z.number().min(0).max(1), // 对话占比
    actionRatio: z.number().min(0).max(1), // 动作占比
    wordCount: z.number().int().min(0),
    tensionTrend: z.number().min(-1).max(1), // 与上一章的紧张度变化
    recommendation: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Retention Metrics — reader retention dashboard (追读力)
// ---------------------------------------------------------------------------
export const RetentionMetricsSchema = z.object({
    chapterIndex: z.number().int().min(0),
    hookDensity: z.number().min(0).max(1), // hook密度评分
    coolPointDensity: z.number().min(0).max(1), // 爽点密度评分
    readerFatigue: z.number().min(0).max(1), // 读者疲劳度（0=精神, 1=极度疲劳）
    retentionPower: z.number().min(0).max(100), // 追读力（0-100分）
    engagementScore: z.number().min(0).max(1), // 参与度评分
    cliffhangerStrength: z.number().min(0).max(1), // 章末悬念强度
    pacingBalance: z.number().min(0).max(1), // 节奏平衡度
    recommendation: z.string().default(""),
});
// ---------------------------------------------------------------------------
// Retention Dashboard — aggregated view across multiple chapters
// ---------------------------------------------------------------------------
export const RetentionDashboardSchema = z.object({
    totalChapters: z.number().int().min(0),
    averageRetention: z.number().min(0).max(100),
    retentionTrend: z.enum(["improving", "stable", "declining"]).default("stable"),
    fatigueWarning: z.boolean().default(false),
    weakestChapters: z.array(z.number()).default([]),
    strongestChapters: z.array(z.number()).default([]),
    overallRecommendation: z.string().default(""),
    chapterMetrics: z.array(RetentionMetricsSchema).default([]),
});
// ---------------------------------------------------------------------------
// Epiphany Signal — emotional breakthrough detection
// ---------------------------------------------------------------------------
export const EpiphanySignalSchema = z.object({
    id: z.string(),
    characterId: z.string(),
    chapterIndex: z.number().int().min(0),
    type: z.enum([
        "emotional_breakthrough", // 情感突破
        "perspective_shift", // 视角转变
        "resolve_awakened", // 决心觉醒
        "bond_catalyst", // 羁绊催化
        "trauma_release", // 创伤释放
    ]),
    intensity: z.number().min(0).max(1),
    triggerScene: z.string(), // 触发场景描述
    beforeMood: MoodLabelSchema, // 顿悟前情绪
    afterMood: MoodLabelSchema, // 顿悟后情绪
    description: z.string(),
    createdAt: z.string(),
});
//# sourceMappingURL=types.js.map
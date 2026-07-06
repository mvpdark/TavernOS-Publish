// packages/core/src/narrative/types.ts
// Narrative Memory Engine — core type definitions.
//
// This module provides the type foundation for TavernOS's dynamic story
// memory system. Unlike a static lorebook, facts here are written,
// retrieved, ranked, and decayed automatically as chapters are written.
//
// Design principles:
//   • All state is serialisable (JSON-safe) for persistence.
//   • Immutability: interfaces use `readonly` where practical.
//   • Zod schemas mirror the interfaces for runtime validation.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Story Domains — top-level categories for fact classification
// ---------------------------------------------------------------------------
export const StoryDomainSchema = z.enum([
    "character", // 人物设定：身份、性格、外貌、能力
    "world", // 世界观：规则、历史、势力、体系
    "location", // 地点：场景、地理、建筑
    "plot_thread", // 情节线：伏笔、任务、悬念、因果链
    "timeline", // 时间线：事件发生顺序、日期、季节
    "theme", // 主题：意象、象征、核心矛盾
]);
// ---------------------------------------------------------------------------
// Story Categories — fine-grained sub-classification within each domain
// ---------------------------------------------------------------------------
export const StoryCategorySchema = z.enum([
    // character
    "identity", // 基础身份：姓名、年龄、职业
    "personality", // 性格特征
    "appearance", // 外貌描述
    "ability", // 能力/技能
    "background", // 背景故事
    "relation", // 角色间关系
    // world
    "rule", // 世界规则/物理法则
    "faction", // 势力/组织
    "history", // 世界历史事件
    "system", // 体系（修炼/魔法/科技）
    // location
    "geography", // 地理
    "venue", // 具体场所
    "region", // 区域
    // plot_thread
    "foreshadow", // 伏笔
    "task", // 任务/目标
    "mystery", // 悬念
    "causality", // 因果关系
    // timeline
    "event", // 具体事件
    "milestone", // 里程碑节点
    "season", // 季节/时间段
    // theme
    "motif", // 意象
    "symbol", // 象征
    "conflict", // 核心矛盾
]);
// ---------------------------------------------------------------------------
// Fact Tier — controls injection priority
// ---------------------------------------------------------------------------
export const FactTierSchema = z.enum(["pinned", "ambient"]);
// pinned  — always injected into the prompt (core setting, protagonist info)
// ambient — competes for token budget based on relevance score
// ---------------------------------------------------------------------------
// Fact Status
// ---------------------------------------------------------------------------
export const FactStatusSchema = z.enum(["active", "archived", "voided"]);
// active  — normal, retrievable
// archived — deprioritised, only retrieved by direct trigger match
// voided  — logically deleted (kept for audit trail)
// ---------------------------------------------------------------------------
// Story Fact — the central data unit
// ---------------------------------------------------------------------------
export const StoryFactSchema = z.object({
    id: z.string(),
    domain: StoryDomainSchema,
    category: StoryCategorySchema,
    label: z.string(), // short tag (e.g. "杨过-身世")
    content: z.string(), // full fact statement
    weight: z.number().min(0).max(100), // importance (0-100)
    certainty: z.number().min(0).max(1), // confidence (0-1)
    tier: FactTierSchema.default("ambient"),
    status: FactStatusSchema.default("active"),
    triggers: z.array(z.string()).default([]), // fast-retrieval keywords
    emotionalWeight: z.number().min(-1).max(1).default(0), // -1=negative, 0=neutral, 1=positive
    narrativeRelevance: z.number().min(0).max(1).default(0.5),
    chapterOrigin: z.number().int().min(0).default(0), // source chapter index
    derivedFrom: z.array(z.string()).optional(), // insight provenance
    createdAt: z.string(),
    updatedAt: z.string(),
    accessCount: z.number().int().min(0).default(0),
    lastAccessAt: z.string().optional(),
});
//# sourceMappingURL=types.js.map
// packages/core/src/scene/types.ts
// Scene analysis — type definitions for scene classification.
//
// The scene classifier examines chapter text and determines what kind of
// scene is unfolding (dialogue, action, introspection, etc.) along with
// intensity and gravity metrics. This information feeds into the mood engine
// and pace director.
import { z } from "zod";
// ---------------------------------------------------------------------------
// Scene Types — taxonomy of narrative scenes
// ---------------------------------------------------------------------------
export const SceneTypeSchema = z.enum([
    "dialogue", // 对话场景：角色交谈
    "action", // 动作场景：战斗、追逐
    "introspection", // 内心独白：角色思考
    "conflict", // 冲突场景：争吵、对抗
    "revelation", // 揭示场景：真相揭露
    "reunion", // 重聚场景：久别重逢
    "separation", // 离别场景：分别、死亡
    "tenderness", // 温情场景：关怀、治愈
    "tragedy", // 悲剧场景：不幸、牺牲
    "comedy", // 喜剧场景：幽默、轻松
    "transition", // 过渡场景：场景切换、时间跳跃
]);
// ---------------------------------------------------------------------------
// Scene Signal — the output of scene classification
// ---------------------------------------------------------------------------
export const SceneSignalSchema = z.object({
    type: SceneTypeSchema,
    intensity: z.number().min(0).max(1), // 场景张力 (0=平静, 1=极度紧张)
    gravity: z.number().min(0).max(1), // 严肃度 (0=轻松, 1=极严肃)
    isClimax: z.boolean().default(false), // 是否高潮点
    isTurningPoint: z.boolean().default(false), // 是否转折点
    participants: z.array(z.string()).default([]), // 参与角色名
    location: z.string().optional(), // 场景地点
    chapterIndex: z.number().int().min(0), // 所属章节
    sceneIndex: z.number().int().min(0), // 章节内场景序号
    textExcerpt: z.string().default(""), // 场景文本摘录 (前200字)
});
export const SCENE_IMPULSE = {
    dialogue: { affection: 1, tension: 0, energy: 0, control: 1 },
    action: { affection: 0, tension: 6, energy: 7, control: -3 },
    introspection: { affection: 0, tension: -1, energy: -2, control: 3 },
    conflict: { affection: -4, tension: 8, energy: 5, control: -5 },
    revelation: { affection: 2, tension: 5, energy: 3, control: -2 },
    reunion: { affection: 8, tension: -3, energy: 5, control: 1 },
    separation: { affection: -6, tension: 4, energy: -3, control: -4 },
    tenderness: { affection: 6, tension: -4, energy: 1, control: 2 },
    tragedy: { affection: -5, tension: 6, energy: -4, control: -6 },
    comedy: { affection: 3, tension: -5, energy: 4, control: 1 },
    transition: { affection: 0, tension: 0, energy: 0, control: 0 },
};
//# sourceMappingURL=types.js.map
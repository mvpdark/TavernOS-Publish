// constants.ts
// ---------------------------------------------------------------------------
// Types, constants, and utility functions extracted from Create.tsx.
// Imported by Create.tsx and its sub-components (e.g. Live2DPanel).
// ---------------------------------------------------------------------------

import type { Live2DEmotion } from "../../lib/live2d-emotions.js";

// --- Types ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Stable unique id used as the React list key. Backend-loaded messages may
  // not include one, in which case a positional fallback is used at render.
  id?: string;
  quickReplies?: string[];
  chapterContent?: string;
  agents?: string[];
  autoSaved?: boolean;
}

export interface AgentProgressItem {
  stage: string;
  issues?: number;
  fixes?: number;
}

// --- Utility ---

/** Generate a unique id for a locally-created chat message. */
export function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Constants ---

export const AGENT_LABELS: Record<string, string> = {
  writer: "Writer",
  auditor: "Auditor",
  reviser: "Reviser",
  consolidator: "Consolidator",
  conductor: "Conductor",
  architect: "Architect",
};

export const WRITING_PRESETS = [
  { value: "default", label: "默认" },
  { value: "fast", label: "快节奏" },
  { value: "slow", label: "慢节奏" },
  { value: "memory", label: "回忆" },
  { value: "emotion", label: "情感" },
  { value: "dialogue", label: "对话驱动" },
  { value: "suspense", label: "悬疑" },
];

/** Keyword→emotion mapping for Live2D emotion detection in Create page. */
export const EMOTION_KEYWORDS: Array<{ key: Live2DEmotion; words: string[] }> = [
  { key: "happy", words: ["开心", "高兴", "大笑", "哈哈", "快乐", "愉快"] },
  { key: "sad", words: ["难过", "伤心", "哭", "悲伤", "眼泪", "失望"] },
  { key: "angry", words: ["生气", "愤怒", "怒火", "可恶", "讨厌", "烦躁"] },
  { key: "fear", words: ["害怕", "恐惧", "惊恐", "紧张", "担心", "不安"] },
  { key: "love", words: ["喜欢", "心动", "害羞", "脸红", "温柔", "甜蜜"] },
  { key: "confident", words: ["得意", "自信", "当然", "轻松", "哼"] },
  { key: "tired", words: ["困了", "累了", "疲惫", "哈欠", "想睡"] },
];

/** Quick-action buttons shown in the Create page empty state. */
export const QUICK_ACTIONS = [
  "续写下一段",
  "改写最后一段",
  "脑暴下个情节",
  "生成角色对话",
];

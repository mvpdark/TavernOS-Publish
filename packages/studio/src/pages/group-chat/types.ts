// Type definitions for the Group Chat page.
// Shared types are imported from ../../shared/types.js and re-exported
// for backward compatibility with GroupChat.tsx and sub-components.

import type {
  PersonaCard,
  CharactersResponse,
  TokenUsage,
  SSEDeltaEvent,
  SSEErrorEvent,
} from "../../shared/types.js";

// Re-export shared types so existing imports from "./types.js" still work.
export type { PersonaCard, CharactersResponse, TokenUsage, SSEDeltaEvent, SSEErrorEvent };

// --- Page-specific types ---

export interface GroupChatMessage {
  memberId: string;
  memberName: string;
  role: "character" | "user";
  content: string;
  timestamp: number;
}

export interface GroupChatSession {
  id: string;
  config: {
    memberIds: string[];
    order: "fixed" | "round-robin" | "random";
    turnInterval: number;
    scenario: string;
  };
  memberNames: Record<string, string>;
  messages: GroupChatMessage[];
  currentTurnIndex: number;
  currentTurnCount: number;
  turnCount: number;
  lastSpeakerId?: string;
}

// Group-chat-specific done event: full message + session + token usage
export interface SSEDoneEvent {
  type: "done";
  message: GroupChatMessage;
  session: GroupChatSession;
  usage?: TokenUsage;
}

export type SSEEvent = SSEDeltaEvent | SSEDoneEvent | SSEErrorEvent;

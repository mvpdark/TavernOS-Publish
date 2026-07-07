// Type definitions for the Chat page.
// Shared types are imported from ../../shared/types.js and re-exported
// for backward compatibility with Chat.tsx and sub-components.

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

/**
 * Chat message with swipe-style alternative generations.
 *
 * `content` is always equal to `swipes[swipeIndex]` and is kept in sync
 * for convenience — components can read `msg.content` directly without
 * indexing into the swipes array.
 *
 * - User messages: `swipes` has a single entry (the typed text); editing
 *   replaces that entry.
 * - Assistant messages: `swipes` grows when the user regenerates; navigating
 *   swipes changes `swipeIndex` and `content`.
 */
export interface ChatMessage {
  /** Stable unique id (crypto.randomUUID()). */
  id: string;
  role: "user" | "assistant";
  /** Currently displayed content — mirrors `swipes[swipeIndex]`. */
  content: string;
  /** All alternative versions of this message (swipes). */
  swipes: string[];
  /** Index into `swipes` of the currently displayed version. */
  swipeIndex: number;
  /** Unix epoch milliseconds. */
  timestamp: number;
  /** Id of the parent message for branch-style regeneration, or null. */
  parentId: string | null;
  /** True if the user manually edited this message. */
  edited?: boolean;
  /** True while the message is being streamed (assistant only). */
  isStreaming?: boolean;
  /** Optional metadata from the LLM response. */
  metadata?: {
    tokenUsage?: TokenUsage;
    model?: string;
  };
}

// Chat-specific done event: full content + token usage
export interface SSEDoneEvent {
  type: "done";
  content: string;
  usage?: TokenUsage;
  /** Session id the message was persisted to (if any). */
  sessionId?: string;
  /** Id of the assistant message that was persisted. */
  messageId?: string;
}

// Task started event: first SSE frame, provides taskId for background tracking.
export interface SSETaskStartedEvent {
  type: "task_started";
  taskId: string;
}

// Quick replies event: contextual suggestion buttons sent after the AI response.
export interface SSEQuickRepliesEvent {
  type: "quick_replies";
  replies: string[];
}

export type SSEEvent = SSEDeltaEvent | SSEDoneEvent | SSEErrorEvent | SSETaskStartedEvent | SSEQuickRepliesEvent;

// ---------------------------------------------------------------------------
// Chat session persistence types (shared between frontend and backend)
// ---------------------------------------------------------------------------

/** Metadata for a chat session, returned by the list endpoint. */
export interface ChatSessionMeta {
  id: string;
  characterFilename: string;
  characterName: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Full chat session including all messages. */
export interface ChatSession {
  id: string;
  projectId: string;
  characterFilename: string;
  characterName: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** Author's Note — user-authored directive injected into LLM context. */
  authorNote?: string;
  /** Insertion depth (0 = after last message, N = before Nth-to-last). Default 4. */
  authorNoteDepth?: number;
}
